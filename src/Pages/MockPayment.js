// src/Pages/MockPayment.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../Utils/axiosInstance";

export default function MockPayment() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state?.booking || null;

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!booking) {
      setError("Booking not found. Please start payment from the booking confirmation page.");
    }
  }, [booking]);

  const handlePay = async (simulateStatus = "SUCCESS") => {
    setError("");
    setMessage("");
    if (!booking || !booking.id) {
      setError("Invalid booking.");
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        paymentId: `MOCK-${Date.now()}`,
        provider: "MOCK_GATEWAY",
        status: simulateStatus,
        amount: booking.totalPrice ?? 0
      };

      const resp = await axiosInstance.post(`/booking/payment/confirm/${booking.id}`, payload);

      const updated = resp?.data;
      setMessage("Payment processed successfully. Redirecting to My Bookings...");
      setTimeout(() => navigate("/bookings"), 1200);
    } catch (err) {
      console.error("Mock payment error:", err);
      const msg = err?.response?.data?.message || err?.message || "Payment failed";
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  if (!booking) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">Booking information is missing. Start payment from Booking Confirmation page.</div>
      </div>
    );
  }

  return (
    <div className="container my-5" style={{ maxWidth: 900 }}>
      <div className="card shadow-sm">
        <div className="card-body">
          <h4 className="mb-3">Mock Payment Gateway</h4>
          <p className="text-muted">Booking: <strong>{booking.car?.brand} {booking.car?.model}</strong></p>
          <p>From: <strong>{booking.startDate}</strong> — To: <strong>{booking.endDate}</strong></p>
          <h5 className="mt-2">Amount: ₹{booking.totalPrice}</h5>

          <div className="mt-4">
            <p className="small text-muted">This is a mock payment page for development. Choose an option:</p>

            <div className="d-flex gap-2">
              <button
                className="btn btn-success"
                onClick={() => handlePay("SUCCESS")}
                disabled={processing}
              >
                {processing ? "Processing..." : "Pay (simulate success)"}
              </button>

              <button
                className="btn btn-danger"
                onClick={() => handlePay("FAILED")}
                disabled={processing}
              >
                {processing ? "Processing..." : "Simulate failure"}
              </button>

              <button
                className="btn btn-outline-secondary ms-auto"
                onClick={() => navigate(-1)}
                disabled={processing}
              >
                Back
              </button>
            </div>

            {message && <div className="alert alert-success mt-3">{message}</div>}
            {error && <div className="alert alert-danger mt-3">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
