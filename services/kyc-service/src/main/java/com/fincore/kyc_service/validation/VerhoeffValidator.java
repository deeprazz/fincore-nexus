package com.fincore.kyc_service.validation;

import org.springframework.stereotype.Component;

/**
 * Standard Verhoeff Checksum Algorithm for 12-digit Indian Aadhaar validation.
 */
@Component
public class VerhoeffValidator {

    // The multiplication table
    private static final int[][] D = {
        {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
        {1, 2, 3, 4, 0, 6, 7, 8, 9, 5},
        {2, 3, 4, 0, 1, 7, 8, 9, 5, 6},
        {3, 4, 0, 1, 2, 8, 9, 5, 6, 7},
        {4, 0, 1, 2, 3, 9, 5, 6, 7, 8},
        {5, 9, 8, 7, 6, 0, 4, 3, 2, 1},
        {6, 5, 9, 8, 7, 1, 0, 4, 3, 2},
        {7, 6, 5, 9, 8, 2, 1, 0, 4, 3},
        {8, 7, 6, 5, 9, 3, 2, 1, 0, 4},
        {9, 8, 7, 6, 5, 4, 3, 2, 1, 0}
    };

    // The permutation table
    private static final int[][] P = {
        {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
        {1, 5, 7, 6, 2, 8, 3, 0, 9, 4},
        {5, 8, 0, 3, 7, 9, 6, 1, 4, 2},
        {8, 9, 1, 6, 0, 4, 3, 5, 2, 7},
        {9, 4, 5, 3, 1, 2, 6, 8, 7, 0},
        {4, 2, 8, 6, 5, 7, 3, 9, 0, 1},
        {2, 7, 9, 3, 8, 0, 6, 4, 1, 5},
        {7, 0, 4, 6, 9, 1, 3, 2, 5, 8}
    };

    // The inverse table
    private static final int[] INV = {0, 4, 3, 2, 1, 5, 6, 7, 8, 9};

    public boolean validate(String aadhaar) {
        if (aadhaar == null) return false;
        String clean = aadhaar.replaceAll("\\s+", "").replaceAll("-", "");
        if (clean.length() != 12 || !clean.matches("^[0-9]{12}$")) {
            return false;
        }

        int c = 0;
        int[] myArray = stringToReversedIntArray(clean);

        for (int i = 0; i < myArray.length; i++) {
            c = D[c][P[i % 8][myArray[i]]];
        }

        return (c == 0);
    }

    public static String generateCheckDigit(String numWithoutCheckDigit) {
        int c = 0;
        int[] myArray = stringToReversedIntArray(numWithoutCheckDigit);

        for (int i = 0; i < myArray.length; i++) {
            c = D[c][P[(i + 1) % 8][myArray[i]]];
        }

        return String.valueOf(INV[c]);
    }

    private static int[] stringToReversedIntArray(String num) {
        int[] myArray = new int[num.length()];
        for (int i = 0; i < num.length(); i++) {
            myArray[i] = Integer.parseInt(num.substring(i, i + 1));
        }
        // reverse
        for (int i = 0; i < myArray.length / 2; i++) {
            int temp = myArray[i];
            myArray[i] = myArray[myArray.length - i - 1];
            myArray[myArray.length - i - 1] = temp;
        }
        return myArray;
    }
}
