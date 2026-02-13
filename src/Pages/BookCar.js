// src/Pages/BookCar.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../Utils/axiosInstance";

// today's date in YYYY-MM-DD
const todayIso = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
})();

/** NOTE: logic kept as-is (no behavior change). */
function calcDaysInclusive(startIso, endIso) {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const s0 = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const e0 = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    const diffMs = e0.getTime() - s0.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export default function BookCar() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [blockingBookings, setBlockingBookings] = useState([]);

  const imgWrapRef = useRef(null);

  /** -------- Data fetching (unchanged logic) -------- */
  const fetchCar = async (opts = { cacheBuster: true }) => {
    setLoading(true);
    setError("");
    try {
      const qs = opts.cacheBuster ? `?t=${Date.now()}` : "";
      const res = await axiosInstance.get(`/getcars/get/${id}${qs}`);
      setCar(res.data);
    } catch (err) {
      console.error("Failed to fetch car:", err);
      setError("Failed to load car details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async function load() {
      await fetchCar({ cacheBuster: true });
    })();
  }, [id]); // eslint-disable-line

  useEffect(() => {
    if (!car || !startDate || !endDate) return setTotalPrice(0);
    const days = calcDaysInclusive(startDate, endDate);
    if (days <= 0) return setTotalPrice(0);
    setTotalPrice(days * (Number(car.rentPerDay ?? 0)));
  }, [car, startDate, endDate]);

  useEffect(() => {
    if (!car || !startDate || !endDate) return setBlockingBookings([]);
    (async function check() {
      try {
        const resp = await axiosInstance.get(`/booking/availability/${car.id}`, {
          params: { startDate, endDate },
        });
        if (resp?.data) {
          const { available, blockingBookings: blocks } = resp.data;
          setCar((prev) => ({ ...(prev || {}), available: !!available }));
          setBlockingBookings(Array.isArray(blocks) ? blocks : []);
          setInfoMsg("");
        }
      } catch (err) {
        console.error("Availability check failed:", err);
        setInfoMsg("Could not verify availability right now — try again.");
        setBlockingBookings([]);
      }
    })();
  }, [car?.id, startDate, endDate]);

  /** -------- Date helpers (unchanged) -------- */
  const minEndDate =
    startDate &&
    new Date(new Date(startDate).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const preventPaste = (e) => e.preventDefault();

  const handleStartChange = (value) => {
    setError("");
    setInfoMsg("");
    setBlockingBookings([]);
    if (!value) {
      setStartDate("");
      setEndDate("");
      return;
    }
    try {
      const s = new Date(value);
      s.setHours(0, 0, 0, 0);
      const t = new Date(todayIso);
      t.setHours(0, 0, 0, 0);
      if (s < t) return setInfoMsg("Start date cannot be in the past.");
    } catch {
      return setInfoMsg("Invalid start date.");
    }
    setStartDate(value);
    setEndDate("");
  };

  const handleEndChange = (value) => {
    setError("");
    setInfoMsg("");
    setBlockingBookings([]);
    if (!value) return setEndDate("");
    if (!startDate) return setInfoMsg("Please select start date first.");
    try {
      const e = new Date(value);
      e.setHours(0, 0, 0, 0);
      const min = new Date(minEndDate || todayIso);
      min.setHours(0, 0, 0, 0);
      if (e < min) return setInfoMsg("End date must be at least one day after the start date.");
    } catch {
      return setInfoMsg("Invalid end date.");
    }
    setEndDate(value);
  };

  /** -------- Submit (unchanged logic) -------- */
  async function handleBooking() {
    setError("");
    setInfoMsg("");

    if (!car) return setError("Car information is missing.");
    if (car.available === false) return setError("This car is currently unavailable for the selected dates.");

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const jwt = localStorage.getItem("jwt");
    if (!user?.id || !jwt) return navigate(`/login?redirect=${encodeURIComponent(`/book/${id}`)}`);

    if (!startDate || !endDate) return setError("Please select both start and end dates.");

    const s = new Date(startDate);
    const e = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    s.setHours(0, 0, 0, 0);
    if (s < today) return setError("Start date cannot be in the past.");
    if (e <= s) return setError("End date must be after start date.");

    setSubmitting(true);
    try {
      const resp = await axiosInstance.post(`/booking/rent/${user.id}/${car.id}`, null, {
        params: { startDate, endDate },
      });

      const bookingFromServer = resp?.data;
      const booking =
        bookingFromServer && bookingFromServer.id
          ? bookingFromServer
          : {
              id: bookingFromServer?.id || null,
              car,
              startDate,
              endDate,
              totalPrice,
              status: bookingFromServer?.status || "PENDING_APPROVAL",
            };

      await fetchCar({ cacheBuster: true });
      setInfoMsg("Booking created — redirecting to confirmation...");
      setTimeout(() => navigate("/booking-confirmation", { state: { booking } }), 300);
    } catch (err) {
      console.error("Booking error:", err);
      const msg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "Failed to create booking. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const daysCount = useMemo(
    () => (startDate && endDate ? Math.max(0, calcDaysInclusive(startDate, endDate)) : 0),
    [startDate, endDate]
  );
  const disabledConfirm =
    submitting || !startDate || !endDate || car?.available === false || daysCount <= 0;

  /** -------- UI -------- */
  if (loading) {
    return (
      <div className="container py-5">
        <style>{`
          .shimmer { position: relative; overflow: hidden; background: rgba(226,232,240,.65); border-radius: 14px; min-height: 220px; }
          .shimmer::after { content:""; position:absolute; inset:0; transform:translateX(-100%);
            background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.7), rgba(255,255,255,0)); animation: shimmer 1.15s infinite; }
          @keyframes shimmer { 100% { transform: translateX(100%); } }
        `}</style>
        <div className="row g-4">
          <div className="col-lg-8"><div className="shimmer" /></div>
          <div className="col-lg-4"><div className="shimmer" style={{ minHeight: 320 }} /></div>
        </div>
      </div>
    );
  }

  if (!car) {
    return <div className="container py-5 text-center text-danger">Car not found.</div>;
  }

  return (
    <div className="container my-4 my-md-5">
      <style>{`
        :root {
          --radius: 16px;
          --muted: #6b7280;
          --ink: #0f172a;
          --ink-soft: #334155;
          --accent: #2563eb;
          --accent2: #059669;
          --surface: rgba(255,255,255,.92);
          --border: rgba(2,6,23,.08);
          --shadow-1: 0 18px 44px rgba(2,8,23,.12);
          --shadow-2: 0 10px 32px rgba(2,8,23,.08);
        }
        .glass { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
                 backdrop-filter: blur(14px) saturate(1.1); -webkit-backdrop-filter: blur(14px) saturate(1.1);
                 box-shadow: var(--shadow-2); }
        .lift { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .lift:hover { transform: translateY(-3px); box-shadow: var(--shadow-1); }
        .hero {
          padding: 16px 18px; border-radius: var(--radius);
          background: linear-gradient(135deg, rgba(37,99,235,.10), rgba(5,150,105,.10));
          border: 1px solid var(--border); box-shadow: var(--shadow-2);
        }
        .stepper { display:flex; gap:10px; align-items:center; }
        .step { width:26px; height:26px; border-radius:999px; display:grid; place-items:center; font-weight:800; font-size:12px; color:#fff; }
        .step.active { background: linear-gradient(135deg,#2563eb,#22d3ee); box-shadow: 0 10px 24px rgba(37,99,235,.25); }
        .step.idle { background: #cbd5e1; color:#0f172a; }
        .dash { width:30px; height:3px; border-radius:999px; background: linear-gradient(90deg,#2563eb,#22d3ee); opacity:.6; }
        .badge-live { display:inline-flex; gap:8px; align-items:center; padding:6px 10px; border-radius:999px; font-weight:800; font-size:12px; color:#16a34a; background: rgba(34,197,94,.14); border: 1px solid rgba(34,197,94,.25); }
        .dot { width:10px; height:10px; border-radius:999px; background:#16a34a; box-shadow:0 0 0 0 rgba(34,197,94,.55); animation: pulse 1.6s cubic-bezier(.4,0,.2,1) infinite; }
        @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(34,197,94,.55);} 70%{box-shadow:0 0 0 12px rgba(34,197,94,0);} 100%{box-shadow:0 0 0 0 rgba(34,197,94,0);} }

        .image-area { background: linear-gradient(180deg, rgba(10,20,40,0.02), rgba(10,20,40,0.01)); display:flex; align-items:center; justify-content:center; min-height: 360px; padding: 18px; }
        .image-clip { width:100%; height:100%; max-height: 480px; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius: 14px; }
        .car-image { max-width:100%; max-height:100%; object-fit: contain; transform-origin:center; transition: transform 420ms cubic-bezier(.2,.9,.2,1), filter 260ms; filter: drop-shadow(0 22px 44px rgba(4,10,30,0.12)); }
        .image-clip:hover .car-image { transform: scale(1.03) translateY(-4px); }

        .pill { display:inline-flex; gap:8px; align-items:center; padding:6px 12px; border-radius:999px; font-weight:700; font-size:12px; border: 1px solid var(--border); background: rgba(255,255,255,.95); color: var(--ink-soft); }
        .pill-green { color:#16a34a; background: rgba(34,197,94,.12); border-color: rgba(34,197,94,.22); }
        .pill-red { color:#b4232e; background: rgba(220,53,69,.12); border-color: rgba(220,53,69,.22); }

        .btn-confirm {
          background: linear-gradient(135deg,#16a34a,#059669); border:none; color:#fff; font-weight:900; border-radius: 12px;
          box-shadow: 0 16px 36px rgba(5,150,105,0.18); transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }
        .btn-confirm:hover { transform: translateY(-2px); box-shadow: 0 20px 44px rgba(5,150,105,0.24); filter: brightness(1.04); }
        .btn-soft { border-radius: 12px; border: 1px solid var(--border); background: rgba(248,250,252,.85); }

        .summary-price { font-size: 24px; font-weight: 900; color: #0b63a6; margin-top: 2px; }
        .muted { color: var(--muted); }
        .title { color: var(--ink); font-weight: 800; letter-spacing: .2px; }
        .rating { display:flex; gap:2px; color:#f59e0b; }

        @media (max-width: 991px) { .image-clip { max-height: 300px; } }
      `}</style>

      {/* HERO */}
      <div className="hero mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3" role="region" aria-label="Booking header">
        <div className="d-flex align-items-center gap-3">
          <span className="badge-live" aria-live="polite"><span className="dot" /> LIVE</span>
          <div>
            <div className="title">Instant Booking</div>
            <div className="small muted">Pick dates, check availability, and confirm in seconds.</div>
          </div>
        </div>
        <div className="stepper" aria-label="Booking steps">
          <div className="step active" aria-current="step">1</div>
          <div className="dash" />
          <div className={`step ${startDate && endDate ? "active" : "idle"}`}>2</div>
          <div className="dash" />
          <div className={`step ${submitting ? "active" : "idle"}`}>3</div>
        </div>
      </div>

      <div className="row gx-4 gy-4">
        {/* LEFT: media + form */}
        <div className="col-12 col-lg-8">
          <div className="glass lift p-0">
            <div className="row g-0 align-items-stretch">
              {/* IMAGE */}
              <div className="col-md-6 position-relative">
                <div className="image-area">
                  <div className="image-clip" ref={imgWrapRef} aria-label="Car photo">
                    <img
                      src={car.imageUrl || car.image || "https://via.placeholder.com/1000x600?text=No+Image"}
                      alt={`${car.brand} ${car.model}`}
                      className="car-image"
                      loading="lazy"
                    />
                  </div>

                  {/* overlays */}
                  <div style={{ position: "absolute", left: 16, top: 16, display:"flex", gap:8, flexWrap:"wrap" }}>
                    <span className="pill">🚘 {car.carType || "Vehicle"}</span>
                    {car.year && <span className="pill">📅 {car.year}</span>}
                    <span className="pill">📍 {car.location || "N/A"}</span>
                  </div>
                  <div style={{ position: "absolute", left: 16, bottom: 16 }}>
                    <span className={`pill ${car.available ? "pill-green" : "pill-red"}`}>
                      {car.available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                </div>
              </div>

              {/* DETAILS + FORM */}
              <div className="col-md-6 d-flex flex-column">
                <div className="p-3 p-md-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h1 className="h5 m-0 title" style={{ lineHeight: 1.25 }}>
                        {car.brand} {car.model}
                      </h1>
                      <div className="small muted">{car.carType || "—"} • {car.year || "—"}</div>
                      <div className="small muted d-flex align-items-center gap-2">
                        <span>Location: {car.location || "N/A"}</span>
                        <span className="rating" aria-label="rating">★ ★ ★ ★ ☆</span>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-900" style={{ fontSize: 22, color: "#059669" }}>
                        ₹{car.rentPerDay ?? 0}/day
                      </div>
                      <div className="small muted">Instant pricing</div>
                    </div>
                  </div>

                  <hr className="my-3" />

                  {/* Booking controls */}
                  <div className="glass p-3" role="group" aria-label="Select dates">
                    <div className="row g-2 align-items-end">
                      <div className="col-12 col-sm-6">
                        <label className="form-label small mb-1" htmlFor="startDate">Start date</label>
                        <div className="input-group">
                          <span className="input-group-text" style={{ background:"#fff", borderRight:0 }} aria-hidden>📅</span>
                          <input
                            id="startDate"
                            type="date"
                            className="form-control"
                            value={startDate}
                            min={todayIso}
                            onChange={(e) => handleStartChange(e.target.value)}
                            onPaste={preventPaste}
                            aria-describedby="startHelp"
                          />
                        </div>
                        <div id="startHelp" className="small muted mt-1">Choose pickup day</div>
                      </div>

                      <div className="col-12 col-sm-6">
                        <label className="form-label small mb-1" htmlFor="endDate">End date</label>
                        <div className="input-group">
                          <span className="input-group-text" style={{ background:"#fff", borderRight:0 }} aria-hidden>📅</span>
                          <input
                            id="endDate"
                            type="date"
                            className="form-control"
                            value={endDate}
                            min={minEndDate || todayIso}
                            onChange={(e) => handleEndChange(e.target.value)}
                            disabled={!startDate}
                            onPaste={preventPaste}
                            aria-describedby="endHelp"
                          />
                        </div>
                        <div id="endHelp" className="small muted mt-1">
                          {!startDate ? "Select start first" : "At least one day after start"}
                        </div>
                      </div>
                    </div>

                    <div className="row mt-3">
                      <div className="col-6">
                        <small className="muted">Days</small>
                        <div className="fw-semibold" aria-live="polite">{daysCount > 0 ? daysCount : "—"}</div>
                      </div>
                      <div className="col-6 text-end">
                        <small className="muted">Total</small>
                        <div className="summary-price" aria-live="polite">₹{totalPrice}</div>
                      </div>
                    </div>

                    {infoMsg && <div className="mt-3 alert alert-info py-2 small" role="status">{infoMsg}</div>}
                    {error && <div className="mt-3 alert alert-danger py-2 small" role="alert">{error}</div>}

                    {blockingBookings?.length > 0 && (
                      <div className="mt-3 alert alert-warning small" role="region" aria-label="Conflicting bookings">
                        <strong>Conflict:</strong> This car is booked in the selected range:
                        <ul className="mb-0 mt-2">
                          {blockingBookings.map((b) => (
                            <li key={b.id || JSON.stringify(b)}>
                              {b.user?.fullname || "User"} — {b.startDate} → {b.endDate} {b.status ? `(${b.status})` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="d-flex gap-2 mt-3">
                      <button
                        className="btn btn-confirm flex-grow-1"
                        onClick={handleBooking}
                        disabled={disabledConfirm}
                        aria-disabled={disabledConfirm}
                      >
                        {submitting ? "Booking..." : "Confirm Booking"}
                      </button>
                      <button className="btn btn-soft" onClick={() => navigate(-1)} disabled={submitting}>
                        Cancel
                      </button>
                    </div>

                    <div className="mt-3 small muted">
                      <strong>Note:</strong> Booking is subject to availability & admin approval.
                    </div>
                  </div>

                  {/* trust badges */}
                  <div className="mt-3 d-flex flex-wrap gap-2 small">
                    <span className="pill">✅ Verified host</span>
                    <span className="pill">🛡️ Damage protection</span>
                    <span className="pill">⏱️ Free 15-min grace</span>
                    <span className="pill">📞 24×7 support</span>
                  </div>
                </div>

                <div className="p-3 mt-auto" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="small muted">
                    <div className="fw-bold">Extras</div>
                    Free pickup at selected locations · No hidden charges
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Policy */}
          <div className="glass lift p-3 mt-3">
            <h6 className="mb-2">Booking policy</h6>
            <ul className="small mb-0 muted">
              <li>Start date must be today or later.</li>
              <li>End date must be at least one day after start.</li>
              <li>Bookings require payment & admin approval.</li>
            </ul>
          </div>
        </div>

        {/* RIGHT: sticky summary */}
        <div className="col-12 col-lg-4">
          <div style={{ position: "sticky", top: 20 }}>
            <div className="glass lift p-3 mb-3" role="region" aria-label="Booking summary">
              <h6 className="mb-2">Your summary</h6>

              <div className="small muted">Car</div>
              <div className="fw-semibold mb-2">{car.brand} {car.model}</div>

              <div className="small muted">Dates</div>
              <div className="mb-1">{startDate || "—"} → {endDate || "—"}</div>
              <div className="small muted mb-2">{daysCount > 0 ? `${daysCount} day(s)` : "—"}</div>

              <div className="small muted">Price</div>
              <div className="summary-price mb-2">₹{totalPrice}</div>

              <div className="small muted">Status</div>
              <div className="mb-3">
                <span className={`badge ${car.available ? "bg-success" : "bg-danger"}`}>
                  {car.available ? "Available" : "Unavailable"}
                </span>
              </div>

              <button className="btn btn-primary w-100" onClick={handleBooking} disabled={disabledConfirm}>
                {submitting ? "Booking..." : "Proceed to Confirm"}
              </button>

              <div className="mt-3 small muted">
                Complete booking to proceed to payment and confirmation steps.
              </div>
            </div>

            <div className="glass lift p-3">
              <h6 className="mb-1">Need help?</h6>
              <p className="small muted mb-1">Contact support if you face any issue with booking or payment.</p>
              <a href="mailto:support@example.com" className="small">support@example.com</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
