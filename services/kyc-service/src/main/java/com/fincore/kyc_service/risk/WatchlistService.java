package com.fincore.kyc_service.risk;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WatchlistService {

    public record WatchlistMatch(boolean matched, String matchedName, String listType, double similarity) {}

    // Seed list of PEP and Sanctions entities for deterministic screening
    private static final List<String> PEP_ENTITIES = List.of(
            "VIKTOR YANUKOVYCH",
            "NAJIB RAZAK",
            "FERDINAND MARCOS",
            "TEODORO OBIANG",
            "ISABEL DOS SANTOS",
            "NICOLAS MADURO",
            "BASHAR AL ASSAD"
    );

    private static final List<String> SANCTIONED_ENTITIES = List.of(
            "OSAMA BIN LADEN",
            "AYMAN AL ZAWAHIRI",
            "DAWOOD IBRAHIM",
            "HAFIZ SAEED",
            "MASOOD AZHAR",
            "ALEXEI NAVALNY OPPONENT GROUP",
            "CARTEL DE SINALOA",
            "WAGNER GROUP ENTITY"
    );

    public WatchlistMatch checkPep(String candidateName) {
        return screenAgainstList(candidateName, PEP_ENTITIES, "PEP");
    }

    public WatchlistMatch checkSanctions(String candidateName) {
        return screenAgainstList(candidateName, SANCTIONED_ENTITIES, "SANCTIONS");
    }

    private WatchlistMatch screenAgainstList(String rawName, List<String> watchlist, String listType) {
        if (rawName == null || rawName.isBlank()) {
            return new WatchlistMatch(false, null, listType, 0.0);
        }

        String target = rawName.trim().toUpperCase();

        for (String entry : watchlist) {
            // Exact or substring match
            if (target.contains(entry) || entry.contains(target)) {
                return new WatchlistMatch(true, entry, listType, 1.0);
            }

            // Fuzzy Levenshtein match
            int distance = computeLevenshteinDistance(target, entry);
            int maxLen = Math.max(target.length(), entry.length());
            double similarity = 1.0 - ((double) distance / maxLen);

            if (distance <= 2 || similarity >= 0.85) {
                return new WatchlistMatch(true, entry, listType, similarity);
            }
        }

        return new WatchlistMatch(false, null, listType, 0.0);
    }

    public static int computeLevenshteinDistance(String s1, String s2) {
        int[] prev = new int[s2.length() + 1];
        int[] curr = new int[s2.length() + 1];

        for (int j = 0; j <= s2.length(); j++) {
            prev[j] = j;
        }

        for (int i = 1; i <= s1.length(); i++) {
            curr[0] = i;
            for (int j = 1; j <= s2.length(); j++) {
                int cost = (s1.charAt(i - 1) == s2.charAt(j - 1)) ? 0 : 1;
                curr[j] = Math.min(Math.min(curr[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost);
            }
            System.arraycopy(curr, 0, prev, 0, curr.length);
        }

        return prev[s2.length()];
    }
}
