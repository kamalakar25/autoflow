import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';
import AuthModal from './AuthModal';

const Navbar = ({ onLogin, userRole, onLogout, isSidebarOpen, setIsSidebarOpen }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle responsive view changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle body class to prevent scrolling for mobile menu
  useEffect(() => {
    if (isMobileMenuOpen && isMobileView) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => document.body.classList.remove('menu-open');
  }, [isMobileMenuOpen, isMobileView]);

  // Handle click outside to close mobile menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobileMenuOpen && !e.target.closest('.nav-links') && !e.target.closest('.mobile-menu-toggle')) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen]);

  const openAuthModal = (mode = 'signin') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);

  const handleLogout = () => {
    onLogout();
    navigate('/');
    setIsMobileMenuOpen(false);
    setIsSidebarOpen(false);
  };

  const toggleMobileMenu = (e) => {
    e.stopPropagation();
    setIsMobileMenuOpen(prev => !prev);
  };

  const toggleSidebar = (e) => {
    e.stopPropagation();
    setIsSidebarOpen(prev => !prev);
  };

  const handleLinkClick = () => setIsMobileMenuOpen(false);

  return (
    <>
      <nav className="navbar" data-user={userRole ? "authenticated" : ""} data-user-role={userRole || ""}>
        {/* Left side - Logo */}
        <div className="nav-left">
          <Link to="/" className="logoo" onClick={() => setIsMobileMenuOpen(false)}>
            AutoFlow
          </Link>
        </div>

        {/* Right side - Toggle and navigation links */}
        <div className="nav-right">
          {/* Toggle buttons for mobile view */}
          {isMobileView && userRole === 'Admin' && (
            <button
              className="mobile-menu-toggle mr-4 text-2xl focus:outline-none"
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? "Close admin menu" : "Open admin menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? '×' : '☰'}
            </button>
          )}
          {isMobileView && userRole && userRole !== 'Admin' && (
            <button
              className="sidebar-toggle mr-4 text-2xl focus:outline-none"
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? '×' : '☰'}
            </button>
          )}
          {isMobileView && !userRole && (
            <button
              className="mobile-menu-toggle mr-4 text-2xl focus:outline-none"
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? '×' : '☰'}
            </button>
          )}

          {/* Navigation links - Mobile menu for unauthenticated users */}
          <div className={`nav-links ${isMobileView && isMobileMenuOpen ? 'open' : ''}`}>
            {!userRole ? (
              <>
                <Link
                  to="/#data"
                  className={`nav-link ${location.hash === '#data' ? 'active' : ''}`}
                  onClick={handleLinkClick}
                >
                  Data Engine
                </Link>
                <Link
                  to="/#enrichment"
                  className={`nav-link ${location.hash === '#enrichment' ? 'active' : ''}`}
                  onClick={handleLinkClick}
                >
                  Enrichment
                </Link>
                <Link
                  to="/#workflows"
                  className={`nav-link ${location.hash === '#workflows' ? 'active' : ''}`}
                  onClick={handleLinkClick}
                >
                  Workflows
                </Link>
                <Link
                  to="/#sync"
                  className={`nav-link ${location.hash === '#sync' ? 'active' : ''}`}
                  onClick={handleLinkClick}
                >
                  Sync & Export
                </Link>
                <button
                  className="nav-button sign-in-button bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-full text-sm transition-colors duration-300"
                  onClick={() => openAuthModal('signin')}
                  aria-label="Sign in"
                >
                  Sign In
                </button>
              </>
            ) : null}
          </div>

          {/* Logout button - Visible only for admins */}
          {userRole === 'Admin' && (
            <button
              className="nav-button sign-out-button bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-full text-sm transition-colors duration-300"
              onClick={handleLogout}
              aria-label="Log out"
            >
              Logout
            </button>
          )}
        </div>
      </nav>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authMode}
        onLogin={onLogin}
        navigate={navigate}
      />
    </>
  );
};

export default Navbar;