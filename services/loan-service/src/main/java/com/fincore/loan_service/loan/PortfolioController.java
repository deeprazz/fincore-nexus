package com.fincore.loan_service.loan;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@RestController
@RequestMapping("/api/loans")
public class PortfolioController {

    private final LoanRepository loanRepository;

    public PortfolioController(LoanRepository loanRepository) {
        this.loanRepository = loanRepository;
    }

    @GetMapping("/portfolio")
    public ResponseEntity<PortfolioResponse> getPortfolio() {
        long activeLoans = loanRepository.countByStatus(LoanStatus.ACTIVE);
        long npaLoans = loanRepository.countByNpaCategory(NpaCategory.NPA);
        long sma0 = loanRepository.countByNpaCategory(NpaCategory.SMA_0);
        long sma1 = loanRepository.countByNpaCategory(NpaCategory.SMA_1);
        long sma2 = loanRepository.countByNpaCategory(NpaCategory.SMA_2);
        long standard = loanRepository.countByNpaCategory(NpaCategory.STANDARD);

        BigDecimal totalDisbursed = loanRepository.sumDisbursedYTD();
        if (totalDisbursed == null) totalDisbursed = BigDecimal.ZERO;

        BigDecimal npaRatio = activeLoans > 0
                ? BigDecimal.valueOf(npaLoans).divide(BigDecimal.valueOf(activeLoans), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Long> byCategory = new LinkedHashMap<>();
        byCategory.put("STANDARD", standard);
        byCategory.put("SMA_0", sma0);
        byCategory.put("SMA_1", sma1);
        byCategory.put("SMA_2", sma2);
        byCategory.put("NPA", npaLoans);

        return ResponseEntity.ok(new PortfolioResponse(activeLoans, totalDisbursed, npaRatio, byCategory));
    }
}
