// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import MockPayment from "./Pages/MockPayment";
import HomePage from "./Pages/HomePage";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import BookCar from "./Pages/BookCar";
import BookingConfirmation from "./Pages/BookingConfirmation";
import UserDashBoard from "./Pages/UserDashBoard";
import NavBar from "./Components/NavBar";
import BookingsPage from "./Pages/BookingsPage";
import Profile from "./Pages/Profile";

// Footer component (reusable site-wide footer)
import Footer from "./Components/Footer";
import AdminDashboard from "./Pages/AdminDashboard"; // Admin dashboard

function App() {
  return (
    <>
      <NavBar />

      <main style={{ minHeight: "calc(100vh - 220px)" }}>
        {/* main is used so footer sits visually after content */}
        <Routes>
          <Route path="/" element={<HomePage />} /> {/* HomePage as landing */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/book/:id" element={<BookCar />} />
          <Route path="/booking-confirmation" element={<BookingConfirmation />} />
          <Route path="/user-dashboard" element={<UserDashBoard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="*" element={<div style={{ padding: 48, textAlign: "center" }}>Page Not Found</div>} />
          <Route path="/mock-payment" element={<MockPayment />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
        </Routes>
      </main>

      {/* Footer shown on every page */}
      <Footer />
    </>
  );
}

export default App;
