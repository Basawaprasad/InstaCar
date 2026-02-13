// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  // read same theme toggle used elsewhere
  const theme = localStorage.getItem("uiTheme") || "light";
  const dark = theme === "dark";

  const bg = dark ? "#071025" : "#f8fafc";
  const cardBg = dark ? "#0b1320" : "#ffffff";
  const text = dark ? "#dbeafe" : "#1f2937";
  const muted = dark ? "#94a3b8" : "#6b7280";
  const accent = dark ? "#60a5fa" : "#0d6efd";

  return (
    <footer
      className="site-footer"
      style={{
        background: bg,
        color: text,
        borderTop: `1px solid ${dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.06)"}`,
        padding: "48px 0",
        marginTop: 40,
      }}
    >
      <style>{`
        .footer-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .footer-card { background: ${cardBg}; border-radius: 12px; padding: 18px; box-shadow: 0 8px 20px rgba(2,6,23,0.04); }
        .footer-link { color: ${text}; text-decoration: none; transition: color .15s ease; }
        .footer-link:hover { color: ${accent}; text-decoration: none; }
        .social-btn { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; margin-right:8px; }
        @media (max-width: 767px) {
          .footer-grid { display:block; gap: 18px; }
        }
      `}</style>

      <div className="footer-container">
        <div className="row footer-grid g-4">
          {/* Brand / about */}
          <div className="col-12 col-md-4">
            <div className="footer-card h-100">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: accent, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700 }}>
                  CR
                </div>
                <div>
                  <h5 style={{ margin: 0, color: text }}>Car Rental</h5>
                  <p style={{ margin: 0, color: muted, marginTop: 6, maxWidth: 320 }}>
                    Reliable cars, transparent pricing and quick bookings. Explore cars in your city and book in minutes.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <small style={{ color: muted }}>Subscribe for deals</small>
                <div className="d-flex mt-2" style={{ gap: 8 }}>
                  <input aria-label="Email" type="email" placeholder="you@email.com"
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#e6e6e6"}`, background: dark ? "#071025" : "#fff", color: text
                    }} />
                  <button className="btn btn-sm btn-primary">Subscribe</button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="col-6 col-md-2">
            <div className="footer-card h-100">
              <h6 style={{ marginBottom: 12 }}>Quick links</h6>
              <ul className="list-unstyled mb-0">
                <li><Link to="/" className="footer-link">Home</Link></li>
                <li><Link to="/user-dashboard" className="footer-link">Dashboard</Link></li>
                <li><Link to="/bookings" className="footer-link">My Bookings</Link></li>
                <li><Link to="/profile" className="footer-link">Profile</Link></li>
              </ul>
            </div>
          </div>

          {/* Resources */}
          <div className="col-6 col-md-2">
            <div className="footer-card h-100">
              <h6 style={{ marginBottom: 12 }}>Resources</h6>
              <ul className="list-unstyled mb-0">
                <li><a className="footer-link" href="/terms">Terms</a></li>
                <li><a className="footer-link" href="/privacy">Privacy</a></li>
                <li><a className="footer-link" href="/support">Support</a></li>
                <li><a className="footer-link" href="/faq">FAQ</a></li>
              </ul>
            </div>
          </div>

          {/* Contact / Social */}
          <div className="col-12 col-md-4">
            <div className="footer-card h-100">
              <h6 style={{ marginBottom: 8 }}>Contact</h6>
              <p style={{ marginBottom: 12, color: muted }}>
                123 Rental Street, Mumbai • support@carrental.example • +91 7204920073
              </p>

              <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                <a className="social-btn" title="Twitter" style={{ background: dark ? "#071025" : "#f1f5f9" }} href="https://twitter.com" target="_blank" rel="noreferrer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={accent}><path d="M23 4.5c-.7.3-1.5.6-2.3.8.8-.5 1.4-1.3 1.7-2.2-.7.4-1.6.7-2.5.9C19 3 18 2.5 16.8 2.5c-2 0-3.4 1.9-2.9 3.8C11 6 7.6 4.7 5 2.2 4 3.6 4.5 5.4 5.9 6.1c-.6 0-1.1-.2-1.6-.5v.1c0 1.8 1.2 3.4 3 3.7-.5.1-1 .1-1.5 0 .4 1.5 1.8 2.6 3.4 2.6-1.4 1-3.1 1.6-4.8 1.5 1.6 1.1 3.5 1.8 5.5 1.8 6.6 0 10.2-5.7 10.2-10.6v-.5c.7-.5 1.3-1.1 1.8-1.8-.7.3-1.5.6-2.3.8z" /></svg>
                </a>
                <a className="social-btn" title="Facebook" style={{ background: dark ? "#071025" : "#f1f5f9" }} href="https://facebook.com" target="_blank" rel="noreferrer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={accent}><path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8.8v-3h1.7V9.1c0-1.7 1-2.6 2.5-2.6.7 0 1.4.1 1.4.1v1.6h-.8c-.8 0-1 0-1 1v1.4h1.7l-.3 3h-1.4v7A10 10 0 0 0 22 12z" /></svg>
                </a>
                <a className="social-btn" title="Instagram" style={{ background: dark ? "#071025" : "#f1f5f9" }} href="https://instagram.com" target="_blank" rel="noreferrer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={accent}><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 6.1A3.9 3.9 0 1 0 15.9 12 3.9 3.9 0 0 0 12 8.1zM19.5 5.5a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z" /></svg>
                </a>
              </div>

              <small style={{ color: muted }}>
                © {new Date().getFullYear()} Car Rental — All rights reserved.
              </small>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
