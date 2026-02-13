// src/Pages/BookingConfirmation.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../Utils/axiosInstance";

export default function BookingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialBooking = location.state?.booking || null;

  const [booking, setBooking] = useState(initialBooking);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!booking) {
      setMessage(
        "Booking details not found. You can check your bookings from the dashboard."
      );
    }
  }, [booking]);

  /* ================= Razorpay Loader ================= */
  function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () =>
        reject(new Error("Failed to load Razorpay SDK"));
      document.body.appendChild(script);
    });
  }

  /* ================= Payment ================= */
  async function handleRazorpayPay() {
    setError("");
    setMessage("");

    if (!booking || !booking.id) {
      setError("Booking not found. Please go back.");
      return;
    }

    setProcessing(true);
    try {
      const resp = await axiosInstance.post(
        `/booking/payment/order/${booking.id}`
      );

      const { order, keyId } = resp.data;
      if (!order) throw new Error("Order creation failed");

      await loadRazorpayScript();

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: `${booking.car?.brand} ${booking.car?.model}`,
        description: `Booking #${booking.id}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            const payload = {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            };

            const confirmResp = await axiosInstance.post(
              `/booking/payment/confirm/${booking.id}`,
              payload
            );

            setBooking(confirmResp.data);
            setMessage(
              "Payment successful. Booking is awaiting admin approval."
            );

            setTimeout(() => navigate("/bookings"), 1400);
          } catch (err) {
            setError(
              err?.response?.data?.message ||
                "Payment confirmation failed."
            );
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: booking.user?.fullname || "",
          email: booking.user?.email || "",
        },
        notes: {
          bookingId: booking.id,
        },
        theme: {
          color: "#2563eb",
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        setError(
          response.error?.description || "Payment failed or cancelled."
        );
        setProcessing(false);
      });

      rzp.open();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to initiate payment."
      );
      setProcessing(false);
    }
  }

  /* ================= UI ================= */
  return (
    <div className="container my-5">
      <style>{`
        body { background:#f8fafc; }
        .surface {
          background:#fff;
          border-radius:18px;
          border:1px solid #e5e7eb;
          box-shadow:0 25px 60px rgba(0,0,0,.08);
        }
        .hero {
          background:linear-gradient(135deg,#2563eb,#1e40af);
          color:#fff;
          border-radius:18px;
          padding:24px;
        }
        .badge-status {
          padding:6px 14px;
          border-radius:999px;
          font-weight:700;
          font-size:13px;
        }
        .badge-pending {
          background:#fef3c7;
          color:#92400e;
        }
        .badge-active {
          background:#dcfce7;
          color:#166534;
        }
        .price {
          font-size:26px;
          font-weight:900;
          color:#1d4ed8;
        }
        .icon-box {
          width:44px;
          height:44px;
          border-radius:12px;
          background:#eff6ff;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:20px;
        }
      `}</style>

      {/* ================= HERO ================= */}
      <div className="hero mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h3 className="fw-bold mb-1">Booking Confirmation</h3>
          <div className="opacity-75">
            Review details and complete payment securely
          </div>
        </div>
        <div>
          <span
            className={`badge-status ${
              booking?.status === "ACTIVE"
                ? "badge-active"
                : "badge-pending"
            }`}
          >
            {booking?.status || "PENDING"}
          </span>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      {!booking ? (
        <div className="surface p-5 text-center">
          <p className="mb-3">{message}</p>
          <div className="d-flex justify-content-center gap-2">
            <button
              className="btn btn-primary"
              onClick={() => navigate("/bookings")}
            >
              My Bookings
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => navigate("/")}
            >
              Home
            </button>
          </div>
        </div>
      ) : (
        <div className="surface p-4">
          <div className="row g-4">
            {/* IMAGE */}
            <div className="col-md-5">
              <div
                style={{
                  height: 240,
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "#f1f5f9",
                }}
              >
                <img
                  src={
                    booking.car?.imageUrl ||
                    booking.car?.image ||
                    "https://via.placeholder.com/800x450"
                  }
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            </div>

            {/* DETAILS */}
            <div className="col-md-7">
              <h5 className="fw-bold mb-1">
                {booking.car?.brand} {booking.car?.model}
              </h5>
              <div className="text-muted mb-3">
                {booking.car?.carType} • {booking.car?.location}
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6 d-flex gap-2">
                  <div className="icon-box">📅</div>
                  <div>
                    <div className="small text-muted">From</div>
                    <div>{booking.startDate}</div>
                  </div>
                </div>

                <div className="col-6 d-flex gap-2">
                  <div className="icon-box">📅</div>
                  <div>
                    <div className="small text-muted">To</div>
                    <div>{booking.endDate}</div>
                  </div>
                </div>

                <div className="col-6 d-flex gap-2">
                  <div className="icon-box">⏱️</div>
                  <div>
                    <div className="small text-muted">Days</div>
                    <div>
                      {booking.startDate && booking.endDate
                        ? Math.max(
                            1,
                            Math.ceil(
                              (new Date(booking.endDate) -
                                new Date(booking.startDate)) /
                                (1000 * 60 * 60 * 24)
                            )
                          )
                        : "-"}
                    </div>
                  </div>
                </div>

                <div className="col-6 d-flex gap-2">
                  <div className="icon-box">💳</div>
                  <div>
                    <div className="small text-muted">Total</div>
                    <div className="price">₹{booking.totalPrice}</div>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-primary px-4"
                  onClick={handleRazorpayPay}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Processing
                    </>
                  ) : (
                    "Pay with Razorpay"
                  )}
                </button>

                <button
                  className="btn btn-outline-secondary ms-auto"
                  onClick={() => navigate("/bookings")}
                >
                  My Bookings
                </button>
              </div>

              {message && (
                <div className="alert alert-success mt-3">{message}</div>
              )}
              {error && (
                <div className="alert alert-danger mt-3">{error}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
