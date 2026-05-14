import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { PrimeReactProvider } from 'primereact/api';

import { ConfirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import './App.css';

import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import TopBar from './layout/TopBar';
import AppRoutes from './routes/AppRoutes';
import ChangePasswordDialog from './modals/ChangePasswordDialog';
import { useConfirmLogoutDialog } from './hooks/useConfirmLogoutDialog';

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useRef(null);
  const userMenuRef = useRef(null);
  const isLoginPage = location.pathname === '/login';

  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const isAuthenticated = !!user;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);

  useEffect(() => {
    const handleStorageChange = () => setUser(JSON.parse(localStorage.getItem('user')));

    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setIsUserDropdownOpen(false);
    };

    const handleResize = () => {
      const mobileView = window.innerWidth <= 992;
      setIsMobile(mobileView);
      if (!mobileView) setIsSidebarCollapsed(false);
      else setIsSidebarCollapsed(true);
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);

    handleResize();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const { confirmLogoutDialog } = useConfirmLogoutDialog();
  const handleLogout = () => confirmLogoutDialog({
    accept: () => { localStorage.removeItem('user'); window.location.href = '/login'; }
  });

  if (!isAuthenticated && !isLoginPage) return <Navigate to="/login" replace />;
  if (isAuthenticated && isLoginPage) return <Navigate to="/" replace />;

  return (
    <>
      <Toast ref={toast} position="top-center" />
      <ConfirmDialog />

      {isLoginPage ? (
        <Routes><Route path="/login" element={<Login />} /></Routes>
      ) : (
        <div className={`admin-container ${isSidebarCollapsed && !isMobile ? 'collapsed' : ''}`}>

          {isMobile && !isSidebarCollapsed && (
            <div className="mobile-backdrop" onClick={() => setIsSidebarCollapsed(true)}></div>
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
              <AppRoutes triggerNotification={() => setNotifCount(prev => prev + 1)} />
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
      <Router>
        <AppContent />
      </Router>
    </PrimeReactProvider>
  );
}