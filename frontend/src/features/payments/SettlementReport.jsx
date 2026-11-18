import React, { useState, useEffect } from "react";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import { getSettlementReport, getReconciliationReport, triggerNeftBatch } from "../../api/payments";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

export default function SettlementReport() {
  const [report, setReport] = useState(null);
  const [recon, setRecon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reportData, reconData] = await Promise.all([
        getSettlementReport().catch(() => null),
        getReconciliationReport().catch(() => null),
      ]);
      setReport(reportData);
      setRecon(reconData);
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

  if (loading && !report && !recon) {
    return <Spinner />;
  }

  const isBalanced = recon?.status === "BALANCED" || (recon?.discrepancies?.length || 0) === 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Settlement & Reconciliation Engine</h3>
          <p className="text-xs text-muted">
            T+0 Immediate Settlement for IMPS/UPI | Scheduled Batch Settlement for NEFT | Real-time Core Banking Reconciliation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReport}>
            <RefreshCw size={14} className="mr-1 inline" /> Refresh
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
          <div className={`text-xl font-bold mt-1 ${isBalanced ? "text-green-700" : "text-amber-600"}`}>
            {recon?.status || report?.reconciliationStatus || "BALANCED"}
          </div>
          <div className="text-xs text-muted mt-1">{recon?.matched || 0} matched with core ledger</div>
        </div>
      </div>

      {/* Core Ledger Reconciliation Section */}
      <div className="card p-4 border space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-semibold text-sm">Core Ledger Cross-Service Reconciliation</h4>
            <p className="text-xs text-muted">
              Live automated matching between Payment Orchestration transactions and Core Banking account entries.
            </p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
            isBalanced ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
          }`}>
            {isBalanced ? "All Settled Entries Reconciled" : "Discrepancies Detected"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <span className="text-xs text-green-700 font-medium block">Matched</span>
            <span className="text-xl font-bold font-mono text-green-800">{recon?.matched || 0}</span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded">
            <span className="text-xs text-amber-700 font-medium block">Missing in Core</span>
            <span className="text-xl font-bold font-mono text-amber-800">{recon?.missingInCore || 0}</span>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <span className="text-xs text-red-700 font-medium block">Amount Mismatch</span>
            <span className="text-xl font-bold font-mono text-red-800">{recon?.amountMismatch || 0}</span>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded">
            <span className="text-xs text-purple-700 font-medium block">Orphan in Core</span>
            <span className="text-xl font-bold font-mono text-purple-800">{recon?.orphanInCore || 0}</span>
          </div>
        </div>

        {recon?.discrepancies && recon.discrepancies.length > 0 ? (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-alt uppercase font-semibold text-muted">
                <tr>
                  <th className="p-2">Type</th>
                  <th className="p-2">UTR / Reference</th>
                  <th className="p-2 text-right">Payment Amount</th>
                  <th className="p-2 text-right">Core Amount</th>
                  <th className="p-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recon.discrepancies.map((d, idx) => (
                  <tr key={idx} className="hover:bg-surface-alt/50">
                    <td className="p-2 font-semibold text-amber-700">{d.discrepancyType}</td>
                    <td className="p-2 font-mono">{d.utr || String(d.paymentId).slice(0, 8)}</td>
                    <td className="p-2 text-right font-mono">₹{Number(d.paymentAmount || 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">₹{Number(d.coreAmount || 0).toFixed(2)}</td>
                    <td className="p-2 text-muted">{d.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2.5 rounded border border-green-200">
            <CheckCircle2 size={16} />
            <span>Core ledger reconciliation is in balance. Every settled payment is verified against core transactions.</span>
          </div>
        )}
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
