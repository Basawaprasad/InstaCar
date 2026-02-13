import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../CSS/Login.css";
import carlogo from "../Images/CarlogoImage.png";
import Carvideo from "../Images/Carvideo.mp4";
import CarAudio from "../Images/CarDrift.wav"; // your car drift sound
import { useEffect } from "react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

    useEffect(() => {
    const audio = new Audio(CarAudio);
    audio.loop = true;        // loop sound
    audio.volume = 1.0       // low background volume
    audio.play().catch(() => {
      console.warn("Autoplay blocked by browser. User interaction needed.");
    });
    return () => {
      audio.pause();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post("http://localhost:8080/login", {
        email,
        password,
      });

      const { jwt, user } = response.data;

      localStorage.setItem("jwt", jwt);
      localStorage.setItem("role", user.role);
      localStorage.setItem("userId", user.id);
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: user.fullname,
          email: user.email,
          id: user.id,
        })
      );

      if (user.role === "ADMIN") navigate("/admin-dashboard");
      else navigate("/user-dashboard");
      window.location.reload();

    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError("Invalid email or password");
      } else {
        setError("Something went wrong. Please try again.");
      }
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

      <div className="login-card card shadow-lg p-4">
        <div className="text-center mb-4">
          <img src={carlogo} alt="Car Logo" style={{ width: "65px", marginBottom: "12px" }} />
          <h2 className="fw-bold">Welcome Back</h2>
          <p className="text-muted small">Login to continue your journey</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              className="form-control rounded-pill"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              className="form-control rounded-pill"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

         <button type="submit" className="btn btn-primary w-50 rounded-pill fw-bold car-btn" style={{ marginLeft: "87px" }}>
  <span className="btn-text">Login</span>
  <span className="car">🚘</span>
</button>

<style>
{`
.car-btn {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.car {
  display: inline-block;
  animation: drive 1.5s linear infinite;
  position: relative;
}

@keyframes drive {
  0% { transform: translateX(-5px) rotate(-10deg); }
  50% { transform: translateX(5px) rotate(10deg); }
  100% { transform: translateX(-5px) rotate(-10deg); }
}
`}
</style>

        </form>

        <p className="text-center mt-3 mb-0">
          Don’t have an account?{" "}
          <Link to="/register" className="text-decoration-none fw-bold text-primary">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

 

export default Login;
