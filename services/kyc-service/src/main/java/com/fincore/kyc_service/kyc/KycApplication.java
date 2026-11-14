package com.fincore.kyc_service.kyc;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "kyc_application")
public class KycApplication {

    @Id
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Column(name = "pan_number_masked", nullable = false)
    private String panNumberMasked;

    @Column(name = "pan_hash", nullable = false)
    private String panHash;

    @Column(name = "aadhaar_last4", nullable = false)
    private String aadhaarLast4;

    @Column(name = "aadhaar_hash", nullable = false)
    private String aadhaarHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private KycStatus status;

    @Column(name = "ocr_status", nullable = false)
    private String ocrStatus;

    @Column(name = "ocr_confidence")
    private BigDecimal ocrConfidence;

    @Column(name = "extracted_pan")
    private String extractedPan;

    @Column(name = "extracted_name")
    private String extractedName;

    @Column(name = "face_match_status", nullable = false)
    private String faceMatchStatus;

    @Column(name = "face_match_confidence")
    private BigDecimal faceMatchConfidence;

    @Column(name = "liveness_verified", nullable = false)
    private boolean livenessVerified;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false)
    private RiskLevel riskLevel;

    @Column(name = "risk_score", nullable = false)
    private BigDecimal riskScore;

    @Column(name = "pep_match", nullable = false)
    private boolean pepMatch;

    @Column(name = "sanctions_match", nullable = false)
    private boolean sanctionsMatch;

    @Column(name = "risk_reasons", columnDefinition = "TEXT")
    private String riskReasons;

    @Column(name = "submitted_by", nullable = false)
    private String submittedBy;

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "kycApplication", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<KycDocument> documents = new ArrayList<>();

    public KycApplication() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID customerId) { this.customerId = customerId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getPanNumberMasked() { return panNumberMasked; }
    public void setPanNumberMasked(String panNumberMasked) { this.panNumberMasked = panNumberMasked; }

    public String getPanHash() { return panHash; }
    public void setPanHash(String panHash) { this.panHash = panHash; }

    public String getAadhaarLast4() { return aadhaarLast4; }
    public void setAadhaarLast4(String aadhaarLast4) { this.aadhaarLast4 = aadhaarLast4; }

    public String getAadhaarHash() { return aadhaarHash; }
    public void setAadhaarHash(String aadhaarHash) { this.aadhaarHash = aadhaarHash; }

    public KycStatus getStatus() { return status; }
    public void setStatus(KycStatus status) { this.status = status; }

    public String getOcrStatus() { return ocrStatus; }
    public void setOcrStatus(String ocrStatus) { this.ocrStatus = ocrStatus; }

    public BigDecimal getOcrConfidence() { return ocrConfidence; }
    public void setOcrConfidence(BigDecimal ocrConfidence) { this.ocrConfidence = ocrConfidence; }

    public String getExtractedPan() { return extractedPan; }
    public void setExtractedPan(String extractedPan) { this.extractedPan = extractedPan; }

    public String getExtractedName() { return extractedName; }
    public void setExtractedName(String extractedName) { this.extractedName = extractedName; }

    public String getFaceMatchStatus() { return faceMatchStatus; }
    public void setFaceMatchStatus(String faceMatchStatus) { this.faceMatchStatus = faceMatchStatus; }

    public BigDecimal getFaceMatchConfidence() { return faceMatchConfidence; }
    public void setFaceMatchConfidence(BigDecimal faceMatchConfidence) { this.faceMatchConfidence = faceMatchConfidence; }

    public boolean isLivenessVerified() { return livenessVerified; }
    public void setLivenessVerified(boolean livenessVerified) { this.livenessVerified = livenessVerified; }

    public RiskLevel getRiskLevel() { return riskLevel; }
    public void setRiskLevel(RiskLevel riskLevel) { this.riskLevel = riskLevel; }

    public BigDecimal getRiskScore() { return riskScore; }
    public void setRiskScore(BigDecimal riskScore) { this.riskScore = riskScore; }

    public boolean isPepMatch() { return pepMatch; }
    public void setPepMatch(boolean pepMatch) { this.pepMatch = pepMatch; }

    public boolean isSanctionsMatch() { return sanctionsMatch; }
    public void setSanctionsMatch(boolean sanctionsMatch) { this.sanctionsMatch = sanctionsMatch; }

    public String getRiskReasons() { return riskReasons; }
    public void setRiskReasons(String riskReasons) { this.riskReasons = riskReasons; }

    public String getSubmittedBy() { return submittedBy; }
    public void setSubmittedBy(String submittedBy) { this.submittedBy = submittedBy; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public String getReviewNotes() { return reviewNotes; }
    public void setReviewNotes(String reviewNotes) { this.reviewNotes = reviewNotes; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public List<KycDocument> getDocuments() { return documents; }
    public void setDocuments(List<KycDocument> documents) { this.documents = documents; }
}
