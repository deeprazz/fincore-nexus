package com.fincore.kyc_service.kyc;

import com.fincore.kyc_service.audit.KycAuditService;
import com.fincore.kyc_service.crypto.CryptoService;
import com.fincore.kyc_service.event.KycApprovedEvent;
import com.fincore.kyc_service.event.KycRejectedEvent;
import com.fincore.kyc_service.face.FaceMatchProvider;
import com.fincore.kyc_service.face.FaceMatchResult;
import com.fincore.kyc_service.face.LivenessProvider;
import com.fincore.kyc_service.face.LivenessResult;
import com.fincore.kyc_service.ocr.OcrExtractionResult;
import com.fincore.kyc_service.ocr.OcrProvider;
import com.fincore.kyc_service.risk.RiskAssessmentEngine;
import com.fincore.kyc_service.risk.RiskAssessmentResult;
import com.fincore.kyc_service.validation.KycMaskingUtil;
import com.fincore.kyc_service.validation.PanValidator;
import com.fincore.kyc_service.validation.VerhoeffValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class KycService {

    private static final Logger log = LoggerFactory.getLogger(KycService.class);

    private final KycApplicationRepository applicationRepository;
    private final KycDocumentRepository documentRepository;
    private final PanValidator panValidator;
    private final VerhoeffValidator verhoeffValidator;
    private final CryptoService cryptoService;
    private final OcrProvider ocrProvider;
    private final FaceMatchProvider faceMatchProvider;
    private final LivenessProvider livenessProvider;
    private final RiskAssessmentEngine riskAssessmentEngine;
    private final KycAuditService auditService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kyc.storage.upload-dir:target/uploads/kyc}")
    private String uploadDir;

    public KycService(
            KycApplicationRepository applicationRepository,
            KycDocumentRepository documentRepository,
            PanValidator panValidator,
            VerhoeffValidator verhoeffValidator,
            CryptoService cryptoService,
            OcrProvider ocrProvider,
            FaceMatchProvider faceMatchProvider,
            LivenessProvider livenessProvider,
            RiskAssessmentEngine riskAssessmentEngine,
            KycAuditService auditService,
            KafkaTemplate<String, Object> kafkaTemplate
    ) {
        this.applicationRepository = applicationRepository;
        this.documentRepository = documentRepository;
        this.panValidator = panValidator;
        this.verhoeffValidator = verhoeffValidator;
        this.cryptoService = cryptoService;
        this.ocrProvider = ocrProvider;
        this.faceMatchProvider = faceMatchProvider;
        this.livenessProvider = livenessProvider;
        this.riskAssessmentEngine = riskAssessmentEngine;
        this.auditService = auditService;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Transactional
    public KycResponse onboard(
            KycOnboardRequest request,
            MultipartFile panFile,
            MultipartFile aadhaarFile,
            MultipartFile selfieFile,
            String submittedBy
    ) {
        log.info("Initiating KYC onboarding for customer: {} by maker: {}", request.customerId(), submittedBy);

        // 1. Validate PAN format
        String rawPan = request.panNumber().trim().toUpperCase();
        if (!panValidator.validate(rawPan)) {
            throw new IllegalArgumentException("Invalid PAN format: must be 10 characters matching regex [A-Z]{5}[0-9]{4}[A-Z]");
        }

        // 2. Validate Aadhaar length & Verhoeff checksum
        String rawAadhaar = request.aadhaarNumber().replaceAll("[\\s-]", "");
        if (!verhoeffValidator.validate(rawAadhaar)) {
            throw new IllegalArgumentException("Invalid Aadhaar number: must be 12 digits with valid Verhoeff checksum");
        }

        UUID applicationId = UUID.randomUUID();
        Instant now = Instant.now();

        KycApplication app = new KycApplication();
        app.setId(applicationId);
        app.setCustomerId(request.customerId());
        app.setFullName(request.fullName().trim());
        app.setDateOfBirth(request.dateOfBirth());
        app.setPanNumberMasked(KycMaskingUtil.maskPan(rawPan));
        app.setPanHash(KycMaskingUtil.hash(rawPan));
        app.setAadhaarLast4(KycMaskingUtil.extractLast4(rawAadhaar));
        app.setAadhaarHash(KycMaskingUtil.hash(rawAadhaar));
        app.setStatus(KycStatus.SUBMITTED);
        app.setSubmittedBy(submittedBy != null ? submittedBy : "teller");
        app.setCreatedAt(now);
        app.setUpdatedAt(now);

        // Process Documents & Encrypt at rest
        byte[] panBytes = panFile != null ? getBytes(panFile) : "SIMULATED_PAN_DOCUMENT".getBytes();
        byte[] aadhaarBytes = aadhaarFile != null ? getBytes(aadhaarFile) : "SIMULATED_AADHAAR_DOCUMENT".getBytes();
        byte[] selfieBytes = selfieFile != null ? getBytes(selfieFile) : "SIMULATED_SELFIE_PHOTO".getBytes();

        KycDocument docPan = saveEncryptedDocument(app, DocumentType.PAN_CARD, panFile, panBytes, "pan_card.jpg");
        KycDocument docAadhaar = saveEncryptedDocument(app, DocumentType.AADHAAR_FRONT, aadhaarFile, aadhaarBytes, "aadhaar_front.jpg");
        KycDocument docSelfie = saveEncryptedDocument(app, DocumentType.SELFIE_PHOTO, selfieFile, selfieBytes, "selfie.jpg");

        app.getDocuments().add(docPan);
        app.getDocuments().add(docAadhaar);
        app.getDocuments().add(docSelfie);

        // 3. Step: OCR Extraction
        app.setStatus(KycStatus.OCR_DONE);
        OcrExtractionResult ocrResult = ocrProvider.process(panBytes, "PAN_CARD", request.fullName(), rawPan);
        app.setOcrStatus(ocrResult.success() ? "VERIFIED" : "FAILED");
        app.setOcrConfidence(ocrResult.confidence());
        app.setExtractedPan(ocrResult.extractedPan());
        app.setExtractedName(ocrResult.extractedName());

        // 4. Step: Biometric Liveness & Face Matching
        LivenessResult liveness = livenessProvider.verifyLiveness(selfieBytes, request.livenessChallenge());
        app.setLivenessVerified(liveness.verified());

        FaceMatchResult faceMatch = faceMatchProvider.compareFaces(panBytes, selfieBytes);
        app.setFaceMatchStatus(faceMatch.matched() ? "MATCHED" : "FAILED");
        app.setFaceMatchConfidence(faceMatch.confidenceScore());
        app.setStatus(KycStatus.FACE_MATCHED);

        // 5. Step: Risk Scoring & Watchlist Assessment
        RiskAssessmentResult risk = riskAssessmentEngine.assessRisk(
                request.fullName(),
                request.dateOfBirth(),
                ocrResult.success(),
                ocrResult.confidence(),
                faceMatch.matched(),
                faceMatch.confidenceScore(),
                liveness.verified()
        );

        app.setRiskLevel(risk.riskLevel());
        app.setRiskScore(risk.riskScore());
        app.setPepMatch(risk.pepMatch());
        app.setSanctionsMatch(risk.sanctionsMatch());
        app.setRiskReasons(String.join("; ", risk.reasons()));
        app.setStatus(KycStatus.RISK_SCORED);

        // 6. Transition to PENDING_REVIEW for Checker approval
        app.setStatus(KycStatus.PENDING_REVIEW);
        KycApplication saved = applicationRepository.save(app);

        // Audit Logging
        auditService.logEvent(
                "KYC_APPLICATION_SUBMITTED",
                saved.getId().toString(),
                app.getSubmittedBy(),
                "KYC onboarded. Masked PAN: " + app.getPanNumberMasked() + ", Risk Level: " + risk.riskLevel() + " (" + risk.riskScore() + ")"
        );

        return KycResponse.from(saved);
    }

    @Transactional
    public KycResponse approve(UUID applicationId, KycReviewRequest request, String reviewedBy) {
        KycApplication app = getApplicationOrThrow(applicationId);

        // Enforce Maker-Checker
        if (app.getSubmittedBy() != null && app.getSubmittedBy().equalsIgnoreCase(reviewedBy)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Maker-checker violation: Submitter cannot approve their own KYC application");
        }

        if (app.getStatus() == KycStatus.APPROVED) {
            return KycResponse.from(app);
        }

        app.setStatus(KycStatus.APPROVED);
        app.setReviewedBy(reviewedBy);
        app.setReviewNotes(request.notes());
        app.setUpdatedAt(Instant.now());
        KycApplication saved = applicationRepository.save(app);

        // Cryptographic Audit
        auditService.logEvent(
                "KYC_APPLICATION_APPROVED",
                saved.getId().toString(),
                reviewedBy,
                "Approved by checker " + reviewedBy + ". Notes: " + request.notes()
        );

        // Emit Kafka event
        KycApprovedEvent event = new KycApprovedEvent(
                saved.getCustomerId(),
                saved.getId(),
                saved.getFullName(),
                saved.getPanNumberMasked(),
                Instant.now()
        );
        kafkaTemplate.send("kyc.approved", saved.getCustomerId().toString(), event);
        log.info("Emitted kyc.approved event for customer: {}", saved.getCustomerId());

        return KycResponse.from(saved);
    }

    @Transactional
    public KycResponse reject(UUID applicationId, KycReviewRequest request, String reviewedBy) {
        KycApplication app = getApplicationOrThrow(applicationId);

        // Enforce Maker-Checker
        if (app.getSubmittedBy() != null && app.getSubmittedBy().equalsIgnoreCase(reviewedBy)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Maker-checker violation: Submitter cannot reject their own KYC application");
        }

        app.setStatus(KycStatus.REJECTED);
        app.setReviewedBy(reviewedBy);
        app.setReviewNotes(request.notes());
        app.setUpdatedAt(Instant.now());
        KycApplication saved = applicationRepository.save(app);

        // Cryptographic Audit
        auditService.logEvent(
                "KYC_APPLICATION_REJECTED",
                saved.getId().toString(),
                reviewedBy,
                "Rejected by checker " + reviewedBy + ". Reason: " + request.notes()
        );

        // Emit Kafka event
        KycRejectedEvent event = new KycRejectedEvent(
                saved.getCustomerId(),
                saved.getId(),
                request.notes(),
                Instant.now()
        );
        kafkaTemplate.send("kyc.rejected", saved.getCustomerId().toString(), event);
        log.info("Emitted kyc.rejected event for customer: {}", saved.getCustomerId());

        return KycResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<KycResponse> listAll() {
        return applicationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(KycResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<KycResponse> listPending() {
        return applicationRepository.findByStatusOrderByCreatedAtDesc(KycStatus.PENDING_REVIEW).stream()
                .map(KycResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public KycResponse getById(UUID id) {
        return KycResponse.from(getApplicationOrThrow(id));
    }

    public record DecryptedDocument(byte[] bytes, String contentType, String fileName) {}

    public DecryptedDocument downloadDecryptedDocument(UUID documentId) {
        KycDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KYC Document not found"));

        try {
            byte[] cipherBytes = Files.readAllBytes(Paths.get(doc.getEncryptedFilePath()));
            byte[] decrypted = cryptoService.decrypt(cipherBytes, doc.getEncryptionIv());
            return new DecryptedDocument(decrypted, doc.getContentType(), doc.getFileName());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read encrypted file from disk", e);
        }
    }

    private KycApplication getApplicationOrThrow(UUID id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KYC Application not found: " + id));
    }

    private KycDocument saveEncryptedDocument(
            KycApplication app,
            DocumentType type,
            MultipartFile file,
            byte[] contentBytes,
            String fallbackFileName
    ) {
        try {
            Path targetDir = Paths.get(uploadDir);
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }

            CryptoService.EncryptedResult encrypted = cryptoService.encrypt(contentBytes);
            String fileName = (file != null && file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank())
                    ? file.getOriginalFilename()
                    : fallbackFileName;

            String storedFileName = UUID.randomUUID() + ".enc";
            Path storedFilePath = targetDir.resolve(storedFileName);

            try (FileOutputStream fos = new FileOutputStream(storedFilePath.toFile())) {
                fos.write(encrypted.cipherBytes());
            }

            KycDocument doc = new KycDocument();
            doc.setId(UUID.randomUUID());
            doc.setKycApplication(app);
            doc.setDocumentType(type);
            doc.setFileName(fileName);
            doc.setContentType(file != null && file.getContentType() != null ? file.getContentType() : "image/jpeg");
            doc.setFileSize(contentBytes.length);
            doc.setEncryptedFilePath(storedFilePath.toString());
            doc.setEncryptionIv(encrypted.ivBase64());
            doc.setCreatedAt(Instant.now());

            return documentRepository.save(doc);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save and encrypt KYC document at rest", e);
        }
    }

    private byte[] getBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            return new byte[0];
        }
    }
}
