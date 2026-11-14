package com.fincore.kyc_service.risk;

import com.fincore.kyc_service.kyc.RiskLevel;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;

@Service
public class RiskAssessmentEngine {

    private final WatchlistService watchlistService;

    public RiskAssessmentEngine(WatchlistService watchlistService) {
        this.watchlistService = watchlistService;
    }

    public RiskAssessmentResult assessRisk(
            String fullName,
            LocalDate dateOfBirth,
            boolean ocrVerified,
            BigDecimal ocrConfidence,
            boolean faceMatched,
            BigDecimal faceConfidence,
            boolean livenessVerified
    ) {
        List<String> reasons = new ArrayList<>();
        double score = 0.05; // baseline low risk

        // 1. Sanctions screening
        WatchlistService.WatchlistMatch sanctionsMatch = watchlistService.checkSanctions(fullName);
        boolean hasSanctions = sanctionsMatch.matched();
        if (hasSanctions) {
            score += 0.80;
            reasons.add("Critical: Applicant matches Sanctions watchlist entry '" + sanctionsMatch.matchedName() + "'");
        }

        // 2. PEP screening
        WatchlistService.WatchlistMatch pepMatch = watchlistService.checkPep(fullName);
        boolean hasPep = pepMatch.matched();
        if (hasPep) {
            score += 0.45;
            reasons.add("Elevated: Applicant identified as Politically Exposed Person (PEP: " + pepMatch.matchedName() + ")");
        }

        // 3. Age profile check
        if (dateOfBirth != null) {
            int age = Period.between(dateOfBirth, LocalDate.now()).getYears();
            if (age < 21) {
                score += 0.10;
                reasons.add("Minor/Young applicant demographic profile (age " + age + ")");
            } else if (age > 75) {
                score += 0.10;
                reasons.add("Senior citizen applicant demographic profile (age " + age + ")");
            }
        }

        // 4. Biometric & OCR verification quality
        if (!ocrVerified || (ocrConfidence != null && ocrConfidence.compareTo(BigDecimal.valueOf(80.00)) < 0)) {
            score += 0.20;
            reasons.add("OCR text verification confidence low or manual override required");
        }

        if (!faceMatched || (faceConfidence != null && faceConfidence.compareTo(BigDecimal.valueOf(80.00)) < 0)) {
            score += 0.25;
            reasons.add("Facial recognition landmark confidence below standard threshold");
        }

        if (!livenessVerified) {
            score += 0.30;
            reasons.add("Liveness anti-spoof challenge not verified");
        }

        if (reasons.isEmpty()) {
            reasons.add("Standard low-risk profile; clean watchlist screening and strong biometric verification");
        }

        score = Math.min(1.00, Math.max(0.00, score));
        BigDecimal finalScore = BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP);

        RiskLevel level;
        if (hasSanctions || finalScore.compareTo(BigDecimal.valueOf(0.65)) > 0) {
            level = RiskLevel.HIGH;
        } else if (hasPep || finalScore.compareTo(BigDecimal.valueOf(0.35)) >= 0) {
            level = RiskLevel.MEDIUM;
        } else {
            level = RiskLevel.LOW;
        }

        return new RiskAssessmentResult(level, finalScore, hasPep, hasSanctions, reasons);
    }
}
