package com.fincore.loan_service.loan;

public class ReviewRequest {
    private String reason; // for rejections
    private String notes;
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
