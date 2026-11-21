import React, { useState } from "react";
import { freezeAccount, unfreezeAccount, closeAccount } from "../../api/accounts";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { broadcastAccountChange } from "../../utils/syncChannel";

export function AccountActions({ account, onActionComplete }) {
  const [confirmModal, setConfirmModal] = useState(null); // 'FREEZE' | 'UNFREEZE' | 'CLOSE'
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  const status = (account.status || "ACTIVE").toUpperCase();
  const isFrozen = status === "FROZEN";
  const isClosed = status === "CLOSED";

  async function handleConfirm() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (confirmModal === "FREEZE") {
        await freezeAccount(account.id, auth);
        setSuccess(`Account ${account.accountNumber} has been frozen.`);
        broadcastAccountChange(account.id, "FROZEN", { accountNumber: account.accountNumber });
      } else if (confirmModal === "UNFREEZE") {
        await unfreezeAccount(account.id, auth);
        setSuccess(`Account ${account.accountNumber} has been unfrozen.`);
        broadcastAccountChange(account.id, "ACTIVE", { accountNumber: account.accountNumber });
      } else if (confirmModal === "CLOSE") {
        await closeAccount(account.id, auth);
        setSuccess(`Account ${account.accountNumber} has been closed.`);
        broadcastAccountChange(account.id, "CLOSED", { accountNumber: account.accountNumber });
      }
      setConfirmModal(null);
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setError(err.message || `Failed to ${confirmModal.toLowerCase()} account`);
    } finally {
      setLoading(false);
    }
  }

  if (isClosed) {
    return <span className="muted-cell">Closed</span>;
  }

  return (
    <>
      {isFrozen ? (
        <button
          type="button"
          onClick={() => setConfirmModal("UNFREEZE")}
          className="btn-action unfreeze"
        >
          Unfreeze
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmModal("FREEZE")}
          className="btn-action freeze"
        >
          Freeze
        </button>
      )}

      <button
        type="button"
        onClick={() => setConfirmModal("CLOSE")}
        className="btn-action close"
      >
        Close
      </button>

      <ConfirmDialog
        isOpen={confirmModal !== null}
        onClose={() => setConfirmModal(null)}
        onConfirm={handleConfirm}
        loading={loading}
        title={`${confirmModal} Account`}
        message={`Are you sure you want to ${confirmModal?.toLowerCase()} account ${account.accountNumber}?`}
        confirmText={`Yes, ${confirmModal}`}
        variant={confirmModal === "CLOSE" ? "danger" : "primary"}
      />
    </>
  );
}

export default AccountActions;
