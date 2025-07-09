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

  // Toggle body class to prevent scrolling
  useEffect(() => {
    if (isMobileMenuOpen || (isMobileView && isSidebarOpen)) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => document.body.classList.remove('menu-open');
  }, [isMobileMenuOpen, isSidebarOpen, isMobileView]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
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
        {/* Left side - for logo and admin menu toggle */}
        <div className="nav-left">
          <Link to="/" className="logoo" onClick={() => setIsMobileMenuOpen(false)}>
            AutoFlow
          </Link>
          
        </div>
        
        {/* Right side - for unauthenticated menu toggle and links */}
        <div className="nav-right">
          {isMobileView && userRole === 'Admin' && (
            <button
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle admin menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? '×' : '☰'}
            </button>
          )}
          {isMobileView && userRole && userRole !== 'Admin' && (
            <button
              className="sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? '×' : '☰'}
            </button>
          )}
          {isMobileView && !userRole && (
            <button
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? '×' : '☰'}
            </button>
          )}

          {/* Navigation links */}
          <div className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
            {userRole ? (
              <>
                {!isMobileView && (
                  <>
                    {/* <Link
                      to={userRole === 'Admin' ? '/admin-overview' : '/dashboard'}
                      className={`nav-link ${location.pathname.includes('dashboard') ? 'active' : ''}`}
                      onClick={handleLinkClick}
                    >
                      Dashboard
                    </Link> */}
                    <button className="nav-button sign-out-button" onClick={handleLogout}>
                      Logout
                    </button>
                  </>
                )}
                {isMobileView && (
                  <>
                    <Link
                      to={userRole === 'Admin' ? '/admindashboard' : '/dashboard'}
                      className={`nav-link ${location.pathname.includes('dashboard') ? 'active' : ''}`}
                      onClick={handleLinkClick}
                    >
                      Dashboard
                    </Link>
                    <button className="nav-button sign-out-button" onClick={handleLogout}>
                      Logout
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                {/* <Link to="/features" className="nav-link" onClick={handleLinkClick}>
                  Features
                </Link>
                <Link to="/pricing" className="nav-link" onClick={handleLinkClick}>
                  Pricing
                </Link>
                <Link to="/docs" className="nav-link" onClick={handleLinkClick}>
                  Docs
                </Link> */}
                <button
                  className="nav-link nav-button sign-in-button"
                  onClick={() => openAuthModal('signin')}
                >
                  Sign In
                </button>
                {/* <Link
                  to="/dashboard"
                  className="nav-button get-started-button"
                  onClick={handleLinkClick}
                >
                  Start Building
                </Link> */}
              </>
            )}
          </div>
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