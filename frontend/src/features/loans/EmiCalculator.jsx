import React, { useState, useMemo } from "react";
import { money } from "../../utils/money";
import { Calculator, PieChart, Calendar, DollarSign, Percent } from "lucide-react";

export function EmiCalculator({ onSelectAmount, className = "" }) {
  const [principal, setPrincipal] = useState(500000);
  const [annualRate, setAnnualRate] = useState(10.5);
  const [tenureMonths, setTenureMonths] = useState(36);

  const { emi, totalInterest, totalPayable } = useMemo(() => {
    const P = Number(principal) || 0;
    const r = (Number(annualRate) || 0) / 100 / 12;
    const n = parseInt(tenureMonths, 10) || 1;

    if (P <= 0 || n <= 0) {
      return { emi: 0, totalInterest: 0, totalPayable: 0, schedulePreview: [] };
    }

    let monthlyEmi;
    if (r === 0) {
      monthlyEmi = P / n;
    } else {
      const pow = Math.pow(1 + r, n);
      monthlyEmi = (P * r * pow) / (pow - 1);
    }

    const payable = monthlyEmi * n;
    const interest = payable - P;

    // Generate quick preview of first 5 months
    const preview = [];
    let outstanding = P;
    const today = new Date();

    for (let i = 1; i <= Math.min(5, n); i++) {
      const intComp = outstanding * r;
      let princComp = monthlyEmi - intComp;
      if (i === n) {
        princComp = outstanding;
      }
      outstanding = Math.max(0, outstanding - princComp);
      const d = new Date(today);
      d.setMonth(today.getMonth() + i);

      preview.push({
        installmentNumber: i,
        dueDate: d.toISOString().split("T")[0],
        emiAmount: monthlyEmi,
        principalComponent: princComp,
        interestComponent: intComp,
        outstandingBalance: outstanding,
        status: "PENDING",
      });
    }

    return {
      emi: monthlyEmi,
      totalInterest: interest,
      totalPayable: payable,
      schedulePreview: preview,
    };
  }, [principal, annualRate, tenureMonths]);

  const principalRatio = totalPayable > 0 ? ((principal / totalPayable) * 100).toFixed(1) : 0;
  const interestRatio = totalPayable > 0 ? ((totalInterest / totalPayable) * 100).toFixed(1) : 0;

  return (
    <div className={`panel emi-calculator-panel ${className}`}>
      <div className="panel-heading">
        <div className="panel-title-with-icon">
          <Calculator size={20} className="text-primary" />
          <div>
            <h2>EMI Loan Calculator</h2>
            <p>Simulate monthly repayments, total interest, and amortisation</p>
          </div>
        </div>
      </div>

      <div className="calculator-layout-grid">
        <div className="calculator-controls">
          {/* Principal Slider & Input */}
          <div className="calc-group">
            <div className="calc-header">
              <label htmlFor="principal-slider">
                <DollarSign size={15} /> Principal Loan Amount
              </label>
              <div className="calc-value-display">{money(principal)}</div>
            </div>
            <input
              id="principal-slider"
              type="range"
              min="10000"
              max="10000000"
              step="10000"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="calc-slider"
            />
            <div className="slider-ticks">
              <span>₹10K</span>
              <span>₹25L</span>
              <span>₹50L</span>
              <span>₹1Cr</span>
            </div>
          </div>

          {/* Interest Rate Slider & Input */}
          <div className="calc-group">
            <div className="calc-header">
              <label htmlFor="rate-slider">
                <Percent size={15} /> Annual Interest Rate
              </label>
              <div className="calc-value-display">{annualRate}% p.a.</div>
            </div>
            <input
              id="rate-slider"
              type="range"
              min="5"
              max="24"
              step="0.25"
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className="calc-slider"
            />
            <div className="slider-ticks">
              <span>5% (Prime)</span>
              <span>10% (Std)</span>
              <span>15%</span>
              <span>24% (Max)</span>
            </div>
          </div>

          {/* Tenure Slider & Input */}
          <div className="calc-group">
            <div className="calc-header">
              <label htmlFor="tenure-slider">
                <Calendar size={15} /> Loan Tenure
              </label>
              <div className="calc-value-display">
                {tenureMonths} Months ({Math.floor(tenureMonths / 12)}y {tenureMonths % 12}m)
              </div>
            </div>
            <input
              id="tenure-slider"
              type="range"
              min="6"
              max="360"
              step="6"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="calc-slider"
            />
            <div className="slider-ticks">
              <span>6 Months</span>
              <span>5 Years</span>
              <span>15 Years</span>
              <span>30 Years</span>
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="calculator-results-card">
          <div className="calc-metric-highlight">
            <span className="calc-metric-label">Monthly EMI</span>
            <span className="calc-metric-amount">{money(emi)}</span>
            <span className="calc-metric-sub">payable every month</span>
          </div>

          <div className="calc-breakdown-row">
            <div className="breakdown-item">
              <span className="muted-label">Principal Amount</span>
              <span className="breakdown-value">{money(principal)}</span>
            </div>
            <div className="breakdown-item">
              <span className="muted-label">Total Interest</span>
              <span className="breakdown-value text-amber">{money(totalInterest)}</span>
            </div>
            <div className="breakdown-item highlight">
              <span className="muted-label">Total Payable</span>
              <span className="breakdown-value text-primary">{money(totalPayable)}</span>
            </div>
          </div>

          {/* Visual Ratio Bar */}
          <div className="calc-ratio-container">
            <div className="calc-ratio-header">
              <span>Principal: {principalRatio}%</span>
              <span>Interest: {interestRatio}%</span>
            </div>
            <div className="calc-ratio-bar">
              <div
                className="ratio-fill-principal"
                style={{ width: `${principalRatio}%` }}
                title={`Principal: ${principalRatio}%`}
              />
              <div
                className="ratio-fill-interest"
                style={{ width: `${interestRatio}%` }}
                title={`Interest: ${interestRatio}%`}
              />
            </div>
          </div>

          {onSelectAmount && (
            <button
              type="button"
              className="primary-button full-width mt-3"
              onClick={() => onSelectAmount({ principal, annualRate, tenureMonths, emi })}
            >
              Apply With This Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmiCalculator;
