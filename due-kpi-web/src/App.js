import React, { useState, useRef, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { PrimeReactProvider } from "primereact/api";

import { ConfirmDialog } from "primereact/confirmdialog";
import { Toast } from "primereact/toast";
import "./App.css";

import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import TopBar from "./layout/TopBar";
import AppRoutes from "./routes/AppRoutes";
import ChangePasswordDialog from "./modals/ChangePasswordDialog";
import { useConfirmLogoutDialog } from "./hooks/useConfirmLogoutDialog";
import { AuthProvider, useAuth } from "./context/AuthContext";

const FullScreenLoader = () => (
  <div
    style={{
      height: "100vh",
      width: "100vw",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#003399",
    }}
  >
    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "32px" }}></i>
  </div>
);

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useRef(null);
  const userMenuRef = useRef(null);
  const isLoginPage = location.pathname === "/login";

  const { user, isAuthenticated, loading, logout } = useAuth();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setIsUserDropdownOpen(false);
    };

    const handleResize = () => {
      const mobileView = window.innerWidth <= 992;
      setIsMobile(mobileView);
      if (!mobileView) setIsSidebarCollapsed(false);
      else setIsSidebarCollapsed(true);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize);

    handleResize();

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const { confirmLogoutDialog } = useConfirmLogoutDialog();
  const handleLogout = () =>
    confirmLogoutDialog({
      accept: async () => {
        await logout();
        navigate("/login");
      },
    });

  if (loading) return <FullScreenLoader />;

  if (!isAuthenticated && !isLoginPage) return <Navigate to="/login" replace />;
  if (isAuthenticated && isLoginPage) return <Navigate to="/" replace />;

  return (
    <>
      <Toast ref={toast} position="top-center" />
      <ConfirmDialog />

      {isLoginPage ? (
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      ) : (
        <div
          className={`admin-container ${isSidebarCollapsed && !isMobile ? "collapsed" : ""}`}
        >
          {isMobile && !isSidebarCollapsed && (
            <div
              className="mobile-backdrop"
              onClick={() => setIsSidebarCollapsed(true)}
            ></div>
          )}

          <Sidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            isMobile={isMobile}
          />

          {isMobile && isSidebarCollapsed && (
            <button
              className="mobile-toggle-fab"
              onClick={() => setIsSidebarCollapsed(false)}
            >
              <i className="fa-solid fa-bars"></i>
            </button>
          )}

          <div className="main-content">
            <TopBar
              notifCount={notifCount}
              setNotifCount={setNotifCount}
              user={user}
              isUserDropdownOpen={isUserDropdownOpen}
              setIsUserDropdownOpen={setIsUserDropdownOpen}
              userMenuRef={userMenuRef}
              navigate={navigate}
              handleLogout={handleLogout}
              setIsPassModalOpen={setIsPassModalOpen}
            />
            <div className="page-wrapper">
              <AppRoutes
                triggerNotification={() => setNotifCount((prev) => prev + 1)}
                setIsPassModalOpen={setIsPassModalOpen}
              />
            </div>
          </div>
        </div>
      )}

      <ChangePasswordDialog
        isOpen={isPassModalOpen}
        onHide={() => setIsPassModalOpen(false)}
        user={user}
        toast={toast}
      />
    </>
  );
};

export default function App() {
  return (
    <PrimeReactProvider>
      <AuthProvider>
        <Router
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AppContent />
        </Router>
      </AuthProvider>
    </PrimeReactProvider>
  );
}
