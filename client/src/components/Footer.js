import React from "react";
import "./Footer.css";


const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Section 1: Products */}
        <div className="footer-section">
          <h4>Products</h4>
          <ul>
            <li>Infrastructures</li>
            <li>Analytics</li>
            <li>CLI & API</li>
            <li>CI & CD</li>
          </ul>
        </div>

       

        {/* Section 3: Resources */}
        <div className="footer-section">
          <h4>Resources</h4>
          <ul>
            <li>Docs</li>
            <li>Integrations</li>
            <li>Templates</li>
          </ul>
        </div>

        {/* Section 4: Legal */}
        <div className="footer-section">
          <h4>Legal</h4>
          <ul>
            <li>Terms of Service</li>
            <li>Privacy Policy</li>
            <li>Cookies Policy</li>
            <li>Data Processing</li>
          </ul>
        </div>

        {/* Section 5: Branding */}
        <div className="footer-branding">
          <div className="logo">⚡ AutoFlow</div>
          <div className="socials ms-3">
            <i className="fa-brands fa-instagram "></i>
            <i className="fa-brands fa-facebook me-4 ms-4"></i>
            <i className="fa-brands fa-twitter "></i>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
