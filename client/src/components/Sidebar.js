import React, { useEffect, useState, forwardRef } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Sidebar.css';
import { FiLogOut } from 'react-icons/fi';

const Sidebar = forwardRef(({ isOpen, onToggle, onSignOut }, ref) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        onToggle(true);
      } else if (!isOpen) {
        onToggle(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [onToggle, isOpen]);

  const handleClose = (e) => {
    if (e) {
      e.stopPropagation(); // Only call if event exists
    }
    if (isMobile) {
      onToggle(false);
    }
  };

  const handleLogoutClick = (e) => {
    handleClose(e);
    onSignOut();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} ref={ref}>
      {isOpen && isMobile && (
        <button
          className="close-button"
          onClick={(e) => handleClose(e)}
          aria-label="Close sidebar"
        >
          ×
        </button>
      )}

      <div className="sidebar-content">
        <div className="sidebar-section">
          <div className="sidebar-section-title">Main</div>
          <nav className="sidebar-nav">
            <NavLink
              to="/dashboard"
              className="sidebar-item"
              activeClassName="active"
              onClick={handleClose}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/Workflowbuilder"
              className="sidebar-item"
              activeClassName="active"
              onClick={handleClose}
            >
              Workflow Builder
            </NavLink>
            <NavLink
              to="/Dataenrichment"
              className="sidebar-item"
              activeClassName="active"
              onClick={handleClose}
            >
              Data Enrichment
            </NavLink>
            
          </nav>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">Team</div>
          <nav className="sidebar-nav">
            <NavLink
              to="/team-members"
              className="sidebar-item"
              activeClassName="active"
              onClick={handleClose}
            >
              Team Members
            </NavLink>
          </nav>
        </div>

        {/* <div className="sidebar-section">
          <div className="sidebar-section-title">Settings</div>
          <nav className="sidebar-nav">
            <NavLink
              to="/settings"
              className="sidebar-item"
              activeClassName="active"
              onClick={handleClose}
            >
              Settings
            </NavLink>
          </nav>
        </div> */}

        <div className="sidebar-section">
          <div className="sidebar-section-title">Support</div>
          <nav className="sidebar-nav">
            <NavLink
              to="/help-center"
              className="sidebar-item"
              activeClassName="active"
              onClick={handleClose}
            >
              Help Center
            </NavLink>
            <NavLink
              to="/billing"
              className="sidebar-item"
              activeClassName="active"
              onClick={handleClose}
            >
              Billing
            </NavLink>
            {/* <NavLink
              to="/"
              className="sidebar-item"
              activeClassName="active"
              onClick={() => {
                handleClose();
                onSignOut();
              }}
            >
              Sign Out
            </NavLink> */}
          </nav>
        </div>

        <div className="sidebar-footer">
          

          <button className="logout-button" onClick={() => {
          handleClose();
          onSignOut();
        }}>
          <FiLogOut className="logout-icon" />
          Sign Out
        </button>
        </div>
      </div>
    </aside>
  );
});

export default Sidebar;