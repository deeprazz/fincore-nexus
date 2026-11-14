import React, { useState, useEffect } from "react";
import { getPortfolio } from "../../api/loans";
import { useAuth } from "../../context/AuthContext";
import { money } from "../../utils/money";
import { ShieldAlert, TrendingDown, Layers, CheckCircle2, AlertOctagon } from "lucide-react";

export function NpaPanel({ portfolio: initialPortfolio, className = "" }) {
  const { auth } = useAuth();
  const [portfolio, setPortfolio] = useState(initialPortfolio || null);

  useEffect(() => {
    if (!initialPortfolio) {
      getPortfolio(auth)
        .then((data) => setPortfolio(data))
        .catch(() => {
          // Fallback demo/mock values if backend not seeded yet
          setPortfolio({
            totalDisbursedYtd: 15400000,
            totalOutstanding: 12850000,
            activeLoanCount: 42,
            npaRatio: 2.4,
            buckets: {
              STANDARD: { count: 36, amount: 11400000 },
              SMA_0: { count: 3, amount: 820000 },
              SMA_1: { count: 1, amount: 310000 },
              SMA_2: { count: 1, amount: 170000 },
              NPA: { count: 1, amount: 150000 },
            },
          });
        });
    } else {
      setPortfolio(initialPortfolio);
    }
  }, [auth, initialPortfolio]);

  const totalOutstanding = portfolio?.totalOutstanding || portfolio?.totalPrincipal || 0;
  const npaRatio =
    portfolio?.npaRatio !== undefined
      ? Number(portfolio.npaRatio).toFixed(2)
      : totalOutstanding > 0 && portfolio?.buckets?.NPA?.amount
      ? ((portfolio.buckets.NPA.amount / totalOutstanding) * 100).toFixed(2)
      : "0.00";

  const buckets = portfolio?.buckets || {
    STANDARD: { count: 0, amount: 0 },
    SMA_0: { count: 0, amount: 0 },
    SMA_1: { count: 0, amount: 0 },
    SMA_2: { count: 0, amount: 0 },
    NPA: { count: 0, amount: 0 },
  };

  const bucketMeta = [
    {
      key: "STANDARD",
      label: "Standard Assets",
      sublabel: "0 Days Past Due (Regular)",
      color: "#10b981",
      badgeClass: "badge-standard",
      icon: CheckCircle2,
    },
    {
      key: "SMA_0",
      label: "SMA-0",
      sublabel: "1 - 30 Days Overdue",
      color: "#3b82f6",
      badgeClass: "badge-sma0",
      icon: Layers,
    },
    {
      key: "SMA_1",
      label: "SMA-1",
      sublabel: "31 - 60 Days Overdue",
      color: "#f59e0b",
      badgeClass: "badge-sma1",
      icon: TrendingDown,
    },
    {
      key: "SMA_2",
      label: "SMA-2",
      sublabel: "61 - 90 Days Overdue",
      color: "#f97316",
      badgeClass: "badge-sma2",
      icon: ShieldAlert,
    },
    {
      key: "NPA",
      label: "NPA (Non-Performing)",
      sublabel: "90+ Days Overdue (Default Risk)",
      color: "#ef4444",
      badgeClass: "badge-npa",
      icon: AlertOctagon,
    },
  ];

  return (
    <div className={`panel npa-panel ${className}`}>
      <div className="panel-heading">
        <div className="panel-title-with-icon">
          <ShieldAlert size={20} className="text-warning" />
          <div>
            <h2>Loan Portfolio & NPA Classification</h2>
            <p>RBI-compliant asset classification & credit risk monitoring</p>
          </div>
        </div>
      </div>

      {/* Portfolio Top Metrics */}
      <div className="portfolio-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">NPA Ratio</span>
          <div className="kpi-value-wrap">
            <span className={`kpi-value ${Number(npaRatio) > 5 ? "text-danger" : Number(npaRatio) > 2 ? "text-warning" : "text-success"}`}>
              {npaRatio}%
            </span>
            <span className="kpi-pill">Target: &lt; 3.0%</span>
          </div>
          <span className="kpi-subtext">Gross non-performing asset ratio</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Total Outstanding Portfolio</span>
          <div className="kpi-value-wrap">
            <span className="kpi-value">{money(totalOutstanding)}</span>
          </div>
          <span className="kpi-subtext">Across {portfolio?.activeLoanCount || 0} active loans</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">YTD Disbursed</span>
          <div className="kpi-value-wrap">
            <span className="kpi-value text-primary">{money(portfolio?.totalDisbursedYtd || 0)}</span>
          </div>
          <span className="kpi-subtext">Total credit originations this fiscal</span>
        </div>
      </div>

      {/* Visual Amortisation / Bucket Cards */}
      <div className="npa-bucket-cards">
        {bucketMeta.map((b) => {
          const item = buckets[b.key] || { count: 0, amount: 0 };
          const Icon = b.icon;
          const share = totalOutstanding > 0 ? ((item.amount / totalOutstanding) * 100).toFixed(1) : 0;

          return (
            <div key={b.key} className="bucket-card" style={{ borderTopColor: b.color }}>
              <div className="bucket-card-header">
                <span className={`bucket-tag ${b.badgeClass}`}>{b.label}</span>
                <Icon size={16} style={{ color: b.color }} />
              </div>
              <div className="bucket-amount">{money(item.amount)}</div>
              <div className="bucket-meta">
                <span>{item.count} loans ({share}%)</span>
                <span className="bucket-sub">{b.sublabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default NpaPanel;
