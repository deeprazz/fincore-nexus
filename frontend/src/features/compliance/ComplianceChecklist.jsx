import React, { useState, useEffect, useContext, useCallback } from "react";
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Lock } from "lucide-react";
import { getPciDssReport } from "../../api/kyc";
import AuthContext from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

export default function ComplianceChecklist() {
  const authContext = useContext(AuthContext);
  const auth = authContext?.auth || null;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPciDssReport(auth);
      setReport(data);
    } catch (err) {
      setError(err.message || "Failed to load PCI-DSS compliance assessment");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <Card className="compliance-loading-card">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
        <span>Evaluating real-time system configuration controls...</span>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="compliance-error-card">
        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
        <span>{error}</span>
      </Card>
    );
  }

  if (!report) return null;

  const { totalControls, passedControls, complianceScore, fullyCompliant, controls = [] } = report;

  return (
    <Card className="compliance-panel">
      {/* Top Banner */}
      <div className="panel-header-row">
        <div>
          <div className="panel-title-group">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <h2 className="panel-title">PCI-DSS Regulatory Self-Assessment</h2>
          </div>
          <p className="panel-subtitle">
            Dynamic control evaluation inspected directly from active system configuration, database triggers, and cipher engines
          </p>
        </div>

        <div className="compliance-score-group">
          <div className="score-summary">
            <span className="score-label">Score</span>
            <span className="score-value">{complianceScore}%</span>
          </div>
          <span className={`status-pill ${fullyCompliant ? "pill-valid" : "pill-warning"}`}>
            {fullyCompliant ? "100% COMPLIANT" : `${passedControls}/${totalControls} CONTROLS PASSED`}
          </span>
          <Button
            onClick={fetchReport}
            variant="secondary"
            className="refresh-control-btn"
            title="Re-evaluate controls"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Controls List */}
      <div className="compliance-controls-list">
        {controls.map((check) => {
          const isPassed = check.passed;
          return (
            <div
              key={check.controlId}
              className={`control-item-box ${isPassed ? "passed" : "failed"}`}
            >
              <div className="control-header-row">
                <div className="control-text-group">
                  <div className="control-title-line">
                    <span className="control-id-tag">{check.controlId}</span>
                    <h4 className="control-title">{check.title}</h4>
                  </div>
                  <p className="control-desc">{check.description}</p>
                </div>

                <span className={`control-status-badge ${isPassed ? "badge-pass" : "badge-fail"}`}>
                  {isPassed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> PASS
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> FAIL
                    </>
                  )}
                </span>
              </div>

              {/* Verified Evidence Output */}
              <div className="control-evidence-line">
                <Lock className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span>Evidence: {check.evidence}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
