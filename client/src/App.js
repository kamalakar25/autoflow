import React, { useState, useRef, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

import "./App.css";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import AdminDashboard from "./components/Admin/AdminDashboard";
import Home from "./components/Home";
import DataContent from "./components/DataContent";
import TeamManagement from "./components/TeamManagement";
import Workflowbuilder from "./components/WorkflowBuilder";
import BillingPlans from "./components/BillingPlans/BillingPlans";
import CurrentUsage from "./components/CurrentUsage/CurrentUsage";
import UsageHistory from "./components/UsageHistory/UsageHistory";
import DataAutomation from "./components/DataAutomation";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import OverviewPage from "./components/Admin/OverviewPage.js";
import TeamCreditManagement from "./components/Admin/Credits&team.js";
import SupportTicket from "./components/Admin/SupportTicket.js";
import SystemAdmin from "./components/Admin/SystemAdmin.js";
import UserApprovals from "./components/Admin/UserApproval.js";
import ProjectManagerApp from "./components/project-manager.js";

import DataEnrichment from "./components/dataenrichment.js"; // Assuming this component exists
import FileUpload from "./components/FileUpload.js";

import OnlyDataEnrichment from "./components/oldenrichment.js";
import EnrichmentDetail from "./components/EnrichmentDetail.js";
import BillingDashboard from "./components/billing.js";
import HelpCenter from "./components/Helpcenter.js";

function App() {
  const [userRole, setUserRole] = useState(
    localStorage.getItem("userRole") || null
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef();

  const handleLogin = (role) => {
    setUserRole(role);
    localStorage.setItem("userRole", role);
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem("userRole");
    setIsSidebarOpen(false);
  };

  const handleClickOutside = (e) => {
    if (
      window.innerWidth <= 768 &&
      isSidebarOpen &&
      sidebarRef.current &&
      !sidebarRef.current.contains(e.target) &&
      !e.target.classList.contains("sidebar-toggle") // Add this line
    ) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    if (userRole !== "Admin") {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSidebarOpen, userRole]);

  const ProtectedAdminRoute = ({ children }) => {
    if (!userRole) return <Navigate to="/" replace />;
    if (userRole !== "Admin") return <Navigate to="/dashboard" replace />;
    return children;
  };

  return (
    <Router>
      <div className="app-container">
        <Navbar
          onLogin={handleLogin}
          userRole={userRole}
          onLogout={handleLogout}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        {userRole ? (
          <div className="content-wrapper">
            {userRole !== "Admin" && (
              <Sidebar
                isOpen={isSidebarOpen}
                onToggle={setIsSidebarOpen}
                ref={sidebarRef}
                onSignOut={handleLogout}
                userRole={userRole}
              />
            )}
            <main
              className={`dashboard-wrapper ${
                isSidebarOpen ? "sidebar-open" : ""
              }`}
            >
              <Routes>
                <Route
                  path="/admindashboard"
                  element={
                    <ProtectedAdminRoute>
                      <AdminDashboard />
                    </ProtectedAdminRoute>
                  }
                />
                <Route path="/admin-overview" element={<OverviewPage />} />
                <Route
                  path="/admin/credits"
                  element={<TeamCreditManagement />}
                />
                <Route path="/admin/exports" element={<SystemAdmin />} />
                <Route path="/admin/support" element={<SupportTicket />} />
                <Route path="/admin/user" element={<UserApprovals />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/DataContent" element={<DataContent />} />
                <Route path="/team-members" element={<ProjectManagerApp />} />
                <Route path="/Workflowbuilder" element={<Workflowbuilder />} />
                <Route path="/workflow" element={<Workflowbuilder />} />
                <Route
                  path="/workflow/drag-drop/:workflowId"
                  element={<Workflowbuilder />}
                />
                <Route
                  path="/workflow/data-enrichment/:workflowId"
                  element={<DataEnrichment />}
                />
                <Route path="/next-process" element={<FileUpload />} />
                <Route
                  path="/CurrentUsage"
                  element={
                    <>
                      <CurrentUsage />
                      <BillingPlans />
                      <UsageHistory />
                    </>
                  }
                />
                <Route
                  path="/AnalyticsDashboard"
                  element={<AnalyticsDashboard />}
                />
                <Route path="/billing" element={<BillingDashboard />} />

                <Route path="/help-center" element={<HelpCenter />} />
                <Route
                  path="/Dataenrichment"
                  element={<OnlyDataEnrichment />}
                />
                <Route
                  path="/enrichment/:configId"
                  element={<EnrichmentDetail />}
                />
                <Route
                  path="*"
                  element={
                    userRole === "Admin" ? (
                      <Navigate to="/admin-overview" replace />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
              </Routes>
            </main>
            {userRole !== "Admin" && isSidebarOpen && (
              <div className="overlay" />
            )}
          </div>
        ) : (
          <main className="public-main">
            <Routes>
              <Route path="/" element={<DataAutomation />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            {/* Temporary login button for testing */}
            {/* <button onClick={() => handleLogin('User')}>Log in as User</button> */}
          </main>
        )}
      </div>
    </Router>
  );
}

export default App;
