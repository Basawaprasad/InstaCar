// src/components/Navbar.js
import { useContext, useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import logo from "../Images/CarlogoImage.png";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const homePath = user ? "/user-dashboard" : "/";

  // Theme toggle
  const [theme, setTheme] = useState(() => localStorage.getItem("uiTheme") || "light");

  useEffect(() => {
    localStorage.setItem("uiTheme", theme);
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <nav
      className={`navbar navbar-expand-lg shadow-sm sticky-top ${
        theme === "dark" ? "navbar-dark" : "navbar-light"
      }`}
      style={{
        background:
          theme === "dark"
            ? "linear-gradient(90deg, #141730ff, #243b55ff)"
            : "linear-gradient(90deg, #e3f2fd, #ffffff)",
        transition: "all 0.4s ease-in-out",
      }}
    >
      <div className="container-fluid">
        {/* Brand Logo */}
        <Link className="navbar-brand d-flex align-items-center fw-bold fs-4" to={homePath}>
          <img
            src={logo}
            width={45}
            height={45}
            alt="InstaCar Rental Services"
            className="me-2 rounded-circle border border-2 border-primary shadow-sm"
          />
          <span style={{ letterSpacing: "1px" }}>InstaCar Rental Services</span>
        </Link>

        {/* Mobile toggle */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Nav Items */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-lg-center">
           <li className="nav-item mx-2">
  <NavLink
    className={({ isActive }) =>
      `nav-link fw-semibold px-3 py-2 rounded-pill position-relative ${
        isActive
          ? "active-home"
          : "text-dark hover-home"
      }`
    }
    to={homePath}
  >
    <span className="me-1">🏠</span> Home
  </NavLink>

  <style>
    {`
      .hover-home:hover {
        background: linear-gradient(135deg, #56ab2f, #a8e063);
        color: white !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        transform: translateY(-2px);
        transition: all 0.25s ease-in-out;
      }

      .active-home {
        background: linear-gradient(135deg, #43a047, #66bb6a);
        color: #fff !important;
        box-shadow: 0 6px 16px rgba(0,0,0,0.3);
      }

      .active-home::after {
        content: "";
        position: absolute;
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
        width: 40%;
        height: 3px;
        background: #fff;
        border-radius: 2px;
      }
    `}
  </style>
</li>


            {user ? (
              <>
                {/* User Avatar + Welcome */}
                

               <li className="nav-item mx-2">
  <NavLink
    className={({ isActive }) =>
      `nav-link fw-semibold px-3 py-2 rounded-pill position-relative ${
        isActive
          ? "active-link"
          : "text-dark hover-link"
      }`
    }
    to="/bookings"
  >
    <span className="me-1">📖</span> Bookings
  </NavLink>

  <style>
    {`
      .nav-link {
        transition: all 0.25s ease-in-out;
        font-weight: 600;
      }

      .hover-link:hover {
        background: linear-gradient(135deg, #ff7e5f, #feb47b);
        color: white !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        transform: translateY(-2px);
      }

      .active-link {
        background: linear-gradient(135deg, #ff5722, #ff9800);
        color: #fff !important;
        box-shadow: 0 6px 16px rgba(0,0,0,0.3);
      }

      .active-link::after {
        content: "";
        position: absolute;
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
        width: 40%;
        height: 3px;
        background: #fff;
        border-radius: 2px;
      }
    `}
  </style>
</li>


               <li className="nav-item mx-2">
  <NavLink
    className={({ isActive }) =>
      `nav-link fw-semibold px-3 py-2 rounded-pill position-relative ${
        isActive
          ? "active-link"
          : "text-dark hover-link"
      }`
    }
    to="/profile"
  >
    <span className="me-1">👤</span> Profile
  </NavLink>

  <style>
    {`
      .nav-link {
        transition: all 0.25s ease-in-out;
        font-weight: 600;
      }

      .hover-link:hover {
        background: linear-gradient(135deg, #007bff, #00d4ff);
        color: white !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        transform: translateY(-2px);
      }

      .active-link {
        background: linear-gradient(135deg, #0062cc, #00b8ff);
        color: #fff !important;
        box-shadow: 0 6px 16px rgba(0,0,0,0.3);
      }

      .active-link::after {
        content: "";
        position: absolute;
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
        width: 40%;
        height: 3px;
        background: #fff;
        border-radius: 2px;
      }
    `}
  </style>
</li>


                 <li className="nav-item mx-2 d-flex align-items-center">
  <div
    className="user-avatar d-flex align-items-center justify-content-center me-2"
    style={{
      width: 40,
      height: 40,
      fontSize: 16,
      fontWeight: 700,
      color: "#fff",
      background: "linear-gradient(135deg, #007bff, #00d4ff)",
      borderRadius: "50%",
      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
  >
    {user?.name?.[0]?.toUpperCase() || "U"}
  </div>
  <span
    className="small text-muted"
    style={{
      fontWeight: 500,
      color: "#333",
      animation: "fadeIn 0.8s ease",
    }}
  >
    Welcome, <strong style={{ color: "#007bff" }}>{user?.name || user?.email}</strong>
  </span>

  <style>
    {`
      .user-avatar:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(0,0,0,0.35);
      }
      @keyframes fadeIn {
        0% { opacity: 0; transform: translateY(-4px); }
        100% { opacity: 1; transform: translateY(0); }
      }
    `}
  </style>
</li>

                 <li className="nav-item ms-lg-3">
    <button
      className="btn btn-sm logout-btn fw-semibold rounded-pill shadow-sm"
      onClick={logout}
    >
      🚪 Logout
    </button>

    <style>
      {`
        .logout-btn {
          padding: 0.375rem 1.5rem;
          background: linear-gradient(135deg, #ff5f6d, #ffc371);
          border: none;
          color: #fff;
          transition: all 0.25s ease-in-out;
        }

        .logout-btn:hover {
          background: linear-gradient(135deg, #ff416c, #ff4b2b);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.25);
        }
      `}
    </style>
  </li>
              </>
            ) : (
               <li className="nav-item ms-lg-3">
    <Link
      className="btn btn-sm login-btn fw-semibold rounded-pill shadow-sm"
      to="/login"
    >
      🔑 Login
    </Link>

    <style>
      {`
        .login-btn {
          padding: 0.375rem 1.5rem;
          background: linear-gradient(135deg, #36d1dc, #5b86e5);
          border: none;
          color: #fff;
          transition: all 0.25s ease-in-out;
        }

        .login-btn:hover {
          background: linear-gradient(135deg, #00c6ff, #0072ff);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.25);
        }
      `}
    </style>
  </li>
            )}

            {/* Theme Toggle */}
            <li className="nav-item ms-lg-4">
              <div className="btn-group btn-group-sm shadow-sm rounded-pill overflow-hidden">
                <button
                  className={`btn ${
                    theme === "light" ? "btn-primary text-white" : "btn-light"
                  }`}
                  onClick={() => setTheme("light")}
                >
                  ☀
                </button>
                <button
                  className={`btn ${
                    theme === "dark" ? "btn-primary text-white" : "btn-dark text-white"
                  }`}
                  onClick={() => setTheme("dark")}
                >
                  🌙
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
