import React, { useState, useEffect, useCallback } from "react";
import { getOverdueCollections, getCollectionNotes, addCollectionNote } from "../../api/loans";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { money } from "../../utils/money";
import { formatDateTime } from "../../utils/date";
import { AlertTriangle, MessageSquare, Plus, Clock, ShieldAlert } from "lucide-react";

export function CollectionsPage({ className = "" }) {
  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  const [overdueLoans, setOverdueLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [actionTaken, setActionTaken] = useState("CALLED_BORROWER");
  const [addingNote, setAddingNote] = useState(false);

  const loadOverdueLoans = useCallback(async () => {
    setLoadingLoans(true);
    try {
      const data = await getOverdueCollections(auth);
      const list = Array.isArray(data) ? data : [];
      setOverdueLoans(list);
      if (list.length > 0 && !selectedLoan) {
        setSelectedLoan(list[0]);
      }
    } catch (err) {
      setError(err.message || "Failed to load overdue collections");
    } finally {
      setLoadingLoans(false);
    }
  }, [auth, setError, selectedLoan]);

  useEffect(() => {
    loadOverdueLoans();
  }, [loadOverdueLoans]);

  const loadNotesForLoan = useCallback(
    async (loanId) => {
      if (!loanId) return;
      setLoadingNotes(true);
      try {
        const notesData = await getCollectionNotes(loanId, auth);
        setNotes(Array.isArray(notesData) ? notesData : []);
      } catch {
        // If loan has no notes yet
        setNotes([]);
      } finally {
        setLoadingNotes(false);
      }
    },
    [auth]
  );

  useEffect(() => {
    if (selectedLoan?.id) {
      loadNotesForLoan(selectedLoan.id);
    } else {
      setNotes([]);
    }
  }, [selectedLoan, loadNotesForLoan]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!selectedLoan?.id) return;
    if (!newNote.trim()) {
      setError("Please write a note before submitting.");
      return;
    }

    setAddingNote(true);
    try {
      await addCollectionNote(selectedLoan.id, newNote.trim(), actionTaken, auth);
      setSuccess("Collection follow-up note recorded.");
      setNewNote("");
      loadNotesForLoan(selectedLoan.id);
    } catch (err) {
      setError(err.message || "Failed to add collection note");
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div className={`collections-container ${className}`}>
      <div className="panel">
        <div className="panel-heading">
          <div className="panel-title-with-icon">
            <ShieldAlert size={20} className="text-danger" />
            <div>
              <h2>Overdue Loan Collections</h2>
              <p>Monitor delinquent accounts, late penalties, and recovery logs</p>
            </div>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={loadOverdueLoans}
            disabled={loadingLoans}
          >
            Refresh
          </button>
        </div>

        <div className="collections-split-grid">
          {/* Overdue Loans List */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Customer</th>
                  <th>Outstanding</th>
                  <th>Days Overdue</th>
                  <th>Penalty</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {overdueLoans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      {loadingLoans ? "Loading overdue loans..." : "No overdue loans found. All portfolios current!"}
                    </td>
                  </tr>
                ) : (
                  overdueLoans.map((loan) => {
                    const isSelected = selectedLoan?.id === loan.id;
                    const daysPastDue = loan.daysPastDue || loan.daysOverdue || 0;
                    return (
                      <tr
                        key={loan.id}
                        className={isSelected ? "selected-row" : ""}
                        onClick={() => setSelectedLoan(loan)}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="account-number font-mono">
                          {String(loan.id).substring(0, 8)}...
                        </td>
                        <td className="muted-cell font-mono">
                          {loan.customerId ? `${String(loan.customerId).substring(0, 8)}...` : "N/A"}
                        </td>
                        <td className="amount-cell">
                          <strong>{money(loan.outstandingAmount || loan.outstandingBalance || 0)}</strong>
                        </td>
                        <td>
                          <span className="status-badge status-overdue">
                            {daysPastDue} Days
                          </span>
                        </td>
                        <td className="text-danger font-medium">
                          {money(loan.penalty || 0)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-secondary"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLoan(loan);
                            }}
                          >
                            <MessageSquare size={14} /> Notes
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Collection Notes Panel for Selected Loan */}
          <div className="collection-details-panel">
            {selectedLoan ? (
              <>
                <div className="details-header">
                  <div>
                    <h3>Loan #{String(selectedLoan.id).substring(0, 8)} Notes</h3>
                    <p className="details-meta">
                      Overdue: <strong>{selectedLoan.daysPastDue || selectedLoan.daysOverdue || 0} days</strong> · Outstanding: <strong>{money(selectedLoan.outstandingAmount || selectedLoan.outstandingBalance || 0)}</strong>
                    </p>
                  </div>
                </div>

                {/* Form to add note */}
                <form onSubmit={handleAddNote} className="add-note-form">
                  <div className="form-field">
                    <label htmlFor="actionTaken">Action Taken</label>
                    <select
                      id="actionTaken"
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      disabled={addingNote}
                    >
                      <option value="CALLED_BORROWER">Phone Call to Borrower</option>
                      <option value="SMS_REMINDER_SENT">SMS Reminder Dispatched</option>
                      <option value="FORMAL_LEGAL_NOTICE">Legal / Demand Notice Sent</option>
                      <option value="FIELD_VISIT">Field Recovery Visit</option>
                      <option value="PROMISE_TO_PAY">Promise to Pay Recorded</option>
                      <option value="RESTRUCTURE_REQUESTED">Restructure Requested</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="note">Recovery Follow-up Note</label>
                    <textarea
                      id="note"
                      rows={3}
                      placeholder="e.g. Borrower agreed to clear overdue EMI by Friday via NEFT transfer..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      disabled={addingNote}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={addingNote}
                  >
                    <Plus size={16} />
                    {addingNote ? "Saving Note..." : "Add Recovery Note"}
                  </button>
                </form>

                {/* Notes History */}
                <div className="notes-history-section">
                  <h4>Collection Activity History ({notes.length})</h4>
                  {loadingNotes ? (
                    <div className="empty-state">Loading notes...</div>
                  ) : notes.length === 0 ? (
                    <div className="empty-state">No notes recorded yet for this loan.</div>
                  ) : (
                    <div className="notes-timeline">
                      {notes.map((n) => (
                        <div key={n.id} className="note-card">
                          <div className="note-header">
                            <span className="note-action-badge">{n.actionTaken || "FOLLOW_UP"}</span>
                            <span className="note-time">
                              <Clock size={12} /> {formatDateTime(n.createdAt || n.timestamp)}
                            </span>
                          </div>
                          <p className="note-text">{n.note}</p>
                          <div className="note-author">
                            Logged by: <strong>{n.recordedBy || n.officer || "Officer"}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <AlertTriangle size={24} className="text-warning mb-2" />
                <p>Select an overdue loan to inspect notes or log recovery action.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollectionsPage;
