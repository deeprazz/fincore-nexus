package com.fincore.kyc_service.kyc;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "kyc_document")
public class KycDocument {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kyc_application_id", nullable = false)
    private KycApplication kycApplication;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false)
    private DocumentType documentType;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "encrypted_file_path", nullable = false)
    private String encryptedFilePath;

    @Column(name = "encryption_iv", nullable = false)
    private String encryptionIv;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public KycDocument() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public KycApplication getKycApplication() { return kycApplication; }
    public void setKycApplication(KycApplication kycApplication) { this.kycApplication = kycApplication; }

    public DocumentType getDocumentType() { return documentType; }
    public void setDocumentType(DocumentType documentType) { this.documentType = documentType; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }

    public String getEncryptedFilePath() { return encryptedFilePath; }
    public void setEncryptedFilePath(String encryptedFilePath) { this.encryptedFilePath = encryptedFilePath; }

    public String getEncryptionIv() { return encryptionIv; }
    public void setEncryptionIv(String encryptionIv) { this.encryptionIv = encryptionIv; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
