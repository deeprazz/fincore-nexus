package com.fincore.loan_service.collections;

import jakarta.validation.constraints.NotBlank;

public class CollectionNoteRequest {
    @NotBlank
    private String note;
    private String actionTaken;

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getActionTaken() { return actionTaken; }
    public void setActionTaken(String actionTaken) { this.actionTaken = actionTaken; }
}
