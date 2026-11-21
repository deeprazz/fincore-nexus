import React from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  Landmark,
  Send,
  UserCheck,
  Server,
  Activity,
  Layers,
  ArrowRight,
  Database,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { money } from "../../utils/money";

export function MasterTopology({ liveSummary, liveLoans, livePayments, liveKyc, specMode }) {
  const m1Data = specMode
    ? { accounts: "2.4M", txns: "12.4M/day", uptime: "99.99%", latency: "47ms" }
    : {
        accounts: liveSummary?.activeAccounts ?? "2.4M",
        txns: `${liveSummary?.transactionsToday ?? "12.4M"}/day`,
        uptime: liveSummary?.uptimeFormatted ?? "99.99%",
        latency: `${liveSummary?.latencyP50Ms ?? 47}ms`,
      };

  const m2Data = specMode
    ? { loans: "847K", disbursed: "$2.4B", npa: "2.3%", emi: "$1,847" }
    : {
        loans: liveLoans?.activeLoansCount ? `${liveLoans.activeLoansCount}` : "847K",
        disbursed: liveLoans?.totalDisbursed ? money(liveLoans.totalDisbursed) : "$2.4B",
        npa: liveLoans?.npaRatio != null ? `${liveLoans.npaRatio}%` : "2.3%",
        emi: "$1,847",
      };

  const m3Data = specMode
    ? { tps: "12.4K TPS", successRate: "99.97%", settlement: "T+0", rail: "IMPS/UPI/NEFT" }
    : {
        tps: `${liveSummary?.tps ?? "12.4K"} TPS`,
        successRate: `${livePayments?.successRate ?? "99.97"}%`,
        settlement: "T+0",
        rail: "IMPS/UPI/NEFT",
      };

  const m4Data = specMode
    ? { verified: "2.1M", avgTime: "4.2 min", compliance: "100%", ocr: "Verified" }
    : {
        verified: liveKyc?.verified ? `${liveKyc.verified}` : "2.1M",
        avgTime: "4.2 min",
        compliance: "100% PCI-DSS",
        ocr: "Verified",
      };

  return (
    <div className="topology-container">
      {/* Top Banner */}
      <div className="p-4 bg-surface border rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="text-cyan w-5 h-5" />
            FinCore Nexus — Final Integrated Banking Platform (Page 8)
          </h2>
          <p className="text-xs text-muted mt-0.5">
            All 4 Milestones Integrated: Microservices Event Mesh · PostgreSQL · Redis · Keycloak IAM
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/master" className="secondary-button btn-sm flex items-center gap-1.5">
            <Activity size={14} /> Master Telemetry
          </Link>
          <Link to="/audit" className="primary-button btn-sm flex items-center gap-1.5">
            <ShieldCheck size={14} /> Audit Trail
          </Link>
        </div>
      </div>

      {/* SVG Architecture Topology Map */}
      <div className="topology-svg-wrapper">
        <svg
          viewBox="0 0 920 540"
          className="w-full max-w-4xl"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#172554" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="tealGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#134e4a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#042f2e" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="amberGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#78350f" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#451a03" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="purpleGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#581c87" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b0764" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="centerGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.98" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Curved Interconnect Lines from Central Hub */}
          {/* To Account Service (Top Left) */}
          <path
            d="M 460 250 C 350 200, 240 160, 200 130"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
          {/* To Loan Service (Top Right) */}
          <path
            d="M 460 250 C 570 200, 680 160, 720 130"
            fill="none"
            stroke="#818cf8"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
          {/* To Payment Service (Bottom Left) */}
          <path
            d="M 460 280 C 350 330, 240 370, 200 410"
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
          {/* To KYC Service (Bottom Right) */}
          <path
            d="M 460 280 C 570 330, 680 370, 720 410"
            fill="none"
            stroke="#c084fc"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
          {/* To Banking Command (Direct Bottom) */}
          <path
            d="M 460 295 L 460 410"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Node 1: Account Service (Top Left) */}
          <g transform="translate(60, 60)" className="topology-node">
            <rect width="210" height="110" rx="10" fill="url(#blueGrad)" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="105" y="28" fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle">Account Service</text>
            <text x="105" y="48" fill="#93c5fd" fontSize="10" textAnchor="middle">M1: Core Banking</text>
            <text x="105" y="68" fill="#f8fafc" fontSize="11" fontWeight="600" textAnchor="middle">{m1Data.accounts} accounts</text>
            <text x="105" y="86" fill="#cbd5e1" fontSize="10" textAnchor="middle">{m1Data.txns} · {m1Data.uptime}</text>
          </g>

          {/* Node 2: Loan Service (Top Right) */}
          <g transform="translate(650, 60)" className="topology-node">
            <rect width="210" height="110" rx="10" fill="url(#tealGrad)" stroke="#818cf8" strokeWidth="1.5" />
            <text x="105" y="28" fill="#818cf8" fontSize="13" fontWeight="bold" textAnchor="middle">Loan Service</text>
            <text x="105" y="48" fill="#a5b4fc" fontSize="10" textAnchor="middle">M2: Lending & Credit</text>
            <text x="105" y="68" fill="#f8fafc" fontSize="11" fontWeight="600" textAnchor="middle">{m2Data.loans} loans · {m2Data.disbursed}</text>
            <text x="105" y="86" fill="#cbd5e1" fontSize="10" textAnchor="middle">NPA Ratio: {m2Data.npa}</text>
          </g>

          {/* Node 3: Payment Service (Bottom Left) */}
          <g transform="translate(60, 360)" className="topology-node">
            <rect width="210" height="110" rx="10" fill="url(#amberGrad)" stroke="#34d399" strokeWidth="1.5" />
            <text x="105" y="28" fill="#34d399" fontSize="13" fontWeight="bold" textAnchor="middle">Payment Service</text>
            <text x="105" y="48" fill="#6ee7b7" fontSize="10" textAnchor="middle">M3: Transfers & Rails</text>
            <text x="105" y="68" fill="#f8fafc" fontSize="11" fontWeight="600" textAnchor="middle">{m3Data.successRate} success</text>
            <text x="105" y="86" fill="#cbd5e1" fontSize="10" textAnchor="middle">{m3Data.tps} · {m3Data.settlement}</text>
          </g>

          {/* Node 4: KYC Service (Bottom Right) */}
          <g transform="translate(650, 360)" className="topology-node">
            <rect width="210" height="110" rx="10" fill="url(#purpleGrad)" stroke="#c084fc" strokeWidth="1.5" />
            <text x="105" y="28" fill="#c084fc" fontSize="13" fontWeight="bold" textAnchor="middle">KYC Service</text>
            <text x="105" y="48" fill="#e9d5ff" fontSize="10" textAnchor="middle">M4: Onboarding & Audit</text>
            <text x="105" y="68" fill="#f8fafc" fontSize="11" fontWeight="600" textAnchor="middle">{m4Data.verified} verified</text>
            <text x="105" y="86" fill="#cbd5e1" fontSize="10" textAnchor="middle">{m4Data.avgTime} · {m4Data.compliance}</text>
          </g>

          {/* Central Hub: FinCore Platform Core */}
          <g transform="translate(370, 210)">
            <rect width="180" height="85" rx="12" fill="url(#centerGrad)" stroke="#38bdf8" strokeWidth="2" filter="url(#glow)" />
            <text x="90" y="36" fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle">FinCore</text>
            <text x="90" y="54" fill="#ffffff" fontSize="12" fontWeight="600" textAnchor="middle">Platform Core</text>
            <text x="90" y="70" fill="#94a3b8" fontSize="9.5" textAnchor="middle">Event Mesh · Redis · Postgres</text>
          </g>

          {/* Bottom Center: Banking Command */}
          <g transform="translate(370, 410)">
            <rect width="180" height="80" rx="10" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="90" y="30" fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">Banking Command</text>
            <text x="90" y="48" fill="#f8fafc" fontSize="10.5" textAnchor="middle">All Integrated Services</text>
            <text x="90" y="64" fill="#a5b4fc" fontSize="9" textAnchor="middle">Event-driven Orchestration</text>
          </g>
        </svg>
      </div>

      {/* 4 Pillars Summary Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-surface border rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase">
            <Wallet size={16} /> M1 · Core Banking
          </div>
          <div className="text-xl font-extrabold text-white">{m1Data.accounts}</div>
          <p className="text-xs text-muted">2.4M active accounts, 12.4M txn/day, 99.99% uptime SLA</p>
        </div>

        <div className="p-4 bg-surface border rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase">
            <Landmark size={16} /> M2 · Lending Hub
          </div>
          <div className="text-xl font-extrabold text-white">{m2Data.loans}</div>
          <p className="text-xs text-muted">847K active loans, $2.4B disbursed YTD, 2.3% NPA ratio</p>
        </div>

        <div className="p-4 bg-surface border rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
            <Send size={16} /> M3 · Transfers & Rails
          </div>
          <div className="text-xl font-extrabold text-white">{m3Data.successRate}</div>
          <p className="text-xs text-muted">12.4K TPS peak, T+0 settlement, IMPS/NEFT/UPI rails</p>
        </div>

        <div className="p-4 bg-surface border rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase">
            <UserCheck size={16} /> M4 · KYC & Compliance
          </div>
          <div className="text-xl font-extrabold text-white">{m4Data.verified}</div>
          <p className="text-xs text-muted">2.1M verified identities, 4.2 min onboarding, 100% PCI-DSS</p>
        </div>
      </div>
    </div>
  );
}
