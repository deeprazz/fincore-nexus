import React, { useState, useEffect } from "react";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import { getSettlementReport, triggerNeftBatch } from "../../api/payments";

export default function SettlementReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await getSettlementReport();
      setReport(data);
    } catch (err) {
      setError(err.message || "Failed to load settlement report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleTriggerNeft = async () => {
    try {
      setTriggering(true);
      await triggerNeftBatch();
      await fetchReport();
    } catch (err) {
      setError(err.message || "Failed to trigger NEFT batch");
    } finally {
      setTriggering(false);
    }
  };

  if (loading && !report) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Settlement & Reconciliation Engine</h3>
          <p className="text-xs text-muted">
            T+0 Immediate Settlement for IMPS/UPI | Scheduled Batch Settlement for NEFT
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReport}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerNeft}
            loading={triggering}
          >
            Execute NEFT Settlement Batch
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 border">
          <div className="text-xs font-semibold text-muted uppercase">Total Processed</div>
          <div className="text-2xl font-bold font-mono mt-1 text-primary">
            ₹{Number(report?.totalVolume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted mt-1">{report?.totalPayments || 0} total payments</div>
        </div>

        <div className="card p-4 border">
          <div className="text-xs font-semibold text-muted uppercase">Settled Volume</div>
          <div className="text-2xl font-bold font-mono mt-1 text-green-600">
            ₹{Number(report?.settledVolume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted mt-1">{report?.settledCount || 0} transactions settled</div>
        </div>

        <div className="card p-4 border">
          <div className="text-xs font-semibold text-muted uppercase">Pending Batch Settlement</div>
          <div className="text-2xl font-bold font-mono mt-1 text-amber-600">
            {report?.pendingSettlementCount || 0}
          </div>
          <div className="text-xs text-muted mt-1">NEFT transactions pending batch</div>
        </div>

        <div className="card p-4 border">
          <div className="text-xs font-semibold text-muted uppercase">Reconciliation Status</div>
          <div className="text-xl font-bold mt-1 text-green-700">
            {report?.reconciliationStatus || "MATCHED"}
          </div>
          <div className="text-xs text-muted mt-1">{report?.batchesGenerated || 0} batches reconciled</div>
        </div>
      </div>

      {/* Breakdown by Rail */}
      <div className="card p-4 border">
        <h4 className="font-semibold text-sm mb-3">Transactions by Payment Rail</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-surface-alt rounded border">
            <span className="text-xs text-muted block">IMPS (Instant)</span>
            <span className="text-xl font-bold font-mono">{report?.paymentsByRail?.IMPS || 0}</span>
          </div>
          <div className="p-3 bg-surface-alt rounded border">
            <span className="text-xs text-muted block">UPI (Virtual)</span>
            <span className="text-xl font-bold font-mono">{report?.paymentsByRail?.UPI || 0}</span>
          </div>
          <div className="p-3 bg-surface-alt rounded border">
            <span className="text-xs text-muted block">NEFT (Batch)</span>
            <span className="text-xl font-bold font-mono">{report?.paymentsByRail?.NEFT || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
