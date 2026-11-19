import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Tabs } from "../../components/ui/Tabs";
import { LoanList } from "./LoanList";
import { LoanDetail } from "./LoanDetail";
import { EmiSchedulePage } from "./EmiSchedulePage";
import { LoanApplicationForm } from "./LoanApplicationForm";
import { LoanApplicationList } from "./LoanApplicationList";
import { EmiCalculator } from "./EmiCalculator";
import { NpaPanel } from "./NpaPanel";
import { CollectionsPage } from "./CollectionsPage";
import { getApplications } from "../../api/loans";
import { useAuth } from "../../context/AuthContext";
import "./loans.css";

export function LoansPage() {
  const { id: routeLoanId } = useParams();
  const { auth } = useAuth();

  const [activeTab, setActiveTab] = useState("loans");
  const [selectedLoan, setSelectedLoan] = useState(
    routeLoanId ? { id: routeLoanId } : null
  );
  const [viewingScheduleLoan, setViewingScheduleLoan] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [appsCount, setAppsCount] = useState(0);

  useEffect(() => {
    getApplications(auth)
      .then((apps) => {
        if (Array.isArray(apps)) setAppsCount(apps.length);
      })
      .catch(() => {});
  }, [auth, activeTab]);

  const tabs = [
    { id: "loans", label: "Loan Accounts" },
    {
      id: "applications",
      label: "Applications",
      count: appsCount > 0 ? appsCount : null,
    },
    { id: "calculator", label: "EMI Calculator" },
    { id: "portfolio", label: "Portfolio & NPA" },
    { id: "collections", label: "Collections" },
  ];

  // Handle drilldowns
  const handleSelectLoan = (loan) => {
    setSelectedLoan(loan);
    setViewingScheduleLoan(null);
  };

  const handleViewSchedule = (loan) => {
    setViewingScheduleLoan(loan);
  };

  const handleBackToList = () => {
    setSelectedLoan(null);
    setViewingScheduleLoan(null);
  };

  const handlePlanSelectedFromCalculator = (_plan) => {
    setActiveTab("applications");
    setShowApplicationForm(true);
  };

  return (
    <div className="loans-page-container">
      {/* Top Header Hub */}
      <div className="portal-header">
        <div>
          <h1>Loan Management Hub</h1>
          <p>
            Credit origination, automated underwriting, amortisation schedules, and recovery
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => {
          setActiveTab(tabId);
          setSelectedLoan(null);
          setViewingScheduleLoan(null);
        }}
        className="loans-nav-tabs"
      />

      {/* Tab Contents */}
      <div className="loans-tab-content mt-4">
        {/* Tab 1: Loan Accounts */}
        {activeTab === "loans" && (
          <>
            {viewingScheduleLoan ? (
              <EmiSchedulePage
                loan={viewingScheduleLoan}
                loanId={viewingScheduleLoan.id}
                onBack={handleBackToList}
              />
            ) : selectedLoan ? (
              <LoanDetail
                loan={selectedLoan}
                loanId={selectedLoan.id}
                onBack={handleBackToList}
                onViewSchedule={handleViewSchedule}
              />
            ) : (
              <LoanList
                appsCount={appsCount}
                onSelectLoan={handleSelectLoan}
                onViewSchedule={handleViewSchedule}
                onNewApplication={() => {
                  setActiveTab("applications");
                  setShowApplicationForm(true);
                }}
                onViewApplications={() => {
                  setActiveTab("applications");
                  setShowApplicationForm(false);
                }}
              />
            )}
          </>
        )}

        {/* Tab 2: Applications & Underwriting */}
        {activeTab === "applications" && (
          <div className="applications-tab-layout">
            <div className="app-tab-actions mb-3">
              <button
                type="button"
                className={showApplicationForm ? "secondary-button" : "primary-button"}
                onClick={() => setShowApplicationForm((prev) => !prev)}
              >
                {showApplicationForm ? "View Underwriting Queue" : "+ New Credit Application"}
              </button>
            </div>

            {showApplicationForm ? (
              <LoanApplicationForm
                onApplicationSubmitted={() => {
                  // Keep open to see instant score, or user can toggle back
                }}
              />
            ) : (
              <LoanApplicationList />
            )}
          </div>
        )}

        {/* Tab 3: EMI Calculator */}
        {activeTab === "calculator" && (
          <EmiCalculator onSelectAmount={handlePlanSelectedFromCalculator} />
        )}

        {/* Tab 4: Portfolio & NPA */}
        {activeTab === "portfolio" && <NpaPanel />}

        {/* Tab 5: Collections */}
        {activeTab === "collections" && <CollectionsPage />}
      </div>
    </div>
  );
}

export default LoansPage;
