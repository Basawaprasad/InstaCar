import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosInstance from "../Utils/axiosInstance";
import "../CSS/Register.css"; // <-- Add a CSS file for animations
import carlogo from "../Images/CarlogoImage.png";
import Carvideo from "../Images/Carvideo.mp4";
import CarAudio from "../Images/CarDrift.wav"; // your car drift sound
import { useEffect } from "react";

const Register = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpassword, setCPassword] = useState("");
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

   useEffect(() => {
      const audio = new Audio(CarAudio);
      audio.loop = true;        // loop sound
      audio.volume = 0.2;       // low background volume
      audio.play().catch(() => {
        console.warn("Autoplay blocked by browser. User interaction needed.");
      });
      return () => {
        audio.pause();
      };
    }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== cpassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await axiosInstance.post("/registeruser", {
        fullname: fullName.trim(),
        email: email.trim(),
        password,
        cpassword,
        drivingLicenseNumber: drivingLicenseNumber.trim(),
      });

      setSuccess("✅ Registration successful! Redirecting to login...");

      // Clear form
      setFullName("");
      setEmail("");
      setPassword("");
      setCPassword("");
      setDrivingLicenseNumber("");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

   return (
    <div className="login-container">
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        className="background-video"
        src={Carvideo}
        type="video/mp4"
      />

      {/* Overlay for better text readability */}
      <div className="overlay"></div>

      <div
        className="registercard p-4 shadow-lg border-0"
        style={{
           maxWidth: "500px",
    width: "100%",
    borderRadius: "15px",
    background: "rgba(255,255,255,0.95)",
    zIndex: 2,
    margin: "40px 0", // gives space when scrolling
        }}
      >
        <div className="text-center mb-4">
          <img
            src={carlogo}
            alt="Car Logo"
            style={{ width: "60px", marginBottom: "10px" }}
          />
          <h2 className="fw-bold">Create Your Account</h2>
          <p className="text-muted small">Join us and book your dream ride 🚗</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-1">
            <label className="form-label fw-semibold">Full Name</label>
            <input
              type="text"
              className="form-control rounded-pill"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="mb-1">
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              className="form-control rounded-pill"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-1">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              className="form-control rounded-pill"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="mb-1">
            <label className="form-label fw-semibold">Confirm Password</label>
            <input
              type="password"
              className="form-control rounded-pill"
              value={cpassword}
              onChange={(e) => setCPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="mb-1">
            <label className="form-label fw-semibold">Driving License Number</label>
            <input
              type="text"
              className="form-control rounded-pill"
              value={drivingLicenseNumber}
              onChange={(e) => setDrivingLicenseNumber(e.target.value)}
              required
            />
          </div>

          <button
  type="submit"
  className={`btn register-btn w-100 rounded-pill fw-bold ${loading ? "loading" : ""}`}
  disabled={loading}
>
  {loading ? (
    <span className="car-animation">
      🚘 Registering...
    </span>
  ) : (
    "🚘 Register"
  )}
</button>

<style>
{`
.register-btn {
  background: linear-gradient(135deg, #36d1dc, #5b86e5);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  border: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.register-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.2);
}

.car-animation {
  display: inline-block;
  animation: moveCar 1s linear infinite;
}

@keyframes moveCar {
  0% { transform: translateX(0); }
  50% { transform: translateX(8px); }
  100% { transform: translateX(0); }
}
`}
</style>

        </form>

        <div className="text-center mt-3">
          <small>
            Already have an account?{" "}
            <Link to="/login" className="text-decoration-none fw-bold text-primary">
              Login here
            </Link>
          </small>
        </div>
      </div>
    </div>
  );
};

export default Register;
