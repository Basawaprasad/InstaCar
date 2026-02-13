// src/Pages/UserDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../Utils/axiosInstance";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterType, setFilterType] = useState("All");
  const [brandSearch, setBrandSearch] = useState("");

  // Advanced filter state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advBrand, setAdvBrand] = useState("");
  const [advLocation, setAdvLocation] = useState("");
  const [advCarType, setAdvCarType] = useState("");
  const [advMinPrice, setAdvMinPrice] = useState("");
  const [advMaxPrice, setAdvMaxPrice] = useState("");
  const [advYear, setAdvYear] = useState("");
  const [advAvailable, setAdvAvailable] = useState(true);
  const [advLoading, setAdvLoading] = useState(false);

  const jwt = localStorage.getItem("jwt");
  const userId = localStorage.getItem("userId");

  // 🌙 Theme handling
  const [theme, setTheme] = useState(() => localStorage.getItem("uiTheme") || "light");
  useEffect(() => {
    const syncTheme = () => setTheme(localStorage.getItem("uiTheme") || "light");
    window.addEventListener("storage", syncTheme);
    const poll = setInterval(syncTheme, 400);
    return () => {
      window.removeEventListener("storage", syncTheme);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    const dark = "#071225";
    const light = "#ffffff";
    document.body.style.background = theme === "dark" ? dark : light;
    document.body.style.color = theme === "dark" ? "#e6eef8" : "#111827";
    document.body.style.transition = "background 200ms ease, color 200ms ease";
  }, [theme]);

  const isDark = theme === "dark";
  const vars = {
    cardBg: isDark ? "#0b1220" : "#ffffff",
    surface: isDark ? "#07182a" : "#f8fafc",
    text: isDark ? "#e6eef8" : "#111827",
    muted: isDark ? "#9ca3af" : "#6c757d",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.05)",
  };

  // ---------------------- Data fetching (unchanged logic) ----------------------
  const fetchCars = async () => {
    try {
      const res = await axiosInstance.get("/getcars/getallcars");
      setCars(res.data || []);
    } catch (err) {
      console.error("Failed to fetch cars:", err);
      setError("Failed to fetch cars.");
    }
  };

  const fetchBookings = async () => {
    if (!userId || !jwt) return;
    try {
      const res = await axiosInstance.get(`/booking/user/${userId}`);
      setBookings(res.data || []);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      setBookings([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCars(), fetchBookings()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jwt, userId]);

  // ---------------------- Handlers (logic untouched) ----------------------
  const handleCancel = async (bookingId) => {
    if (!userId || !jwt) {
      alert("Please login to cancel bookings.");
      navigate("/login");
      return;
    }
    try {
      const res = await axiosInstance.put(`/booking/cancel/${userId}/${bookingId}`);
      const updatedBooking = res?.data;
      if (!updatedBooking || !updatedBooking.id) {
        alert(res?.data?.message || "Booking cancelled.");
        await fetchBookings();
        await fetchCars();
        return;
      }
      alert("Booking cancelled successfully!");
      setBookings((prev) => prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b)));
      const cancelledCar = updatedBooking.car;
      if (cancelledCar && cancelledCar.id) {
        setCars((prev) =>
          prev.map((c) => (c.id === cancelledCar.id ? { ...c, available: true, currentUser: null } : c))
        );
        navigate(`/cars/${cancelledCar.id}`);
      } else {
        fetchCars();
      }
    } catch (err) {
      console.error("Cancel failed:", err);
      const serverMsg = err?.response?.data?.message || err?.message || "Failed to cancel booking.";
      alert(serverMsg);
    }
  };

  const handleBook = (carId) => {
    if (!jwt) {
      navigate(`/login?redirect=${encodeURIComponent(`/book/${carId}`)}`);
      return;
    }
    navigate(`/book/${carId}`);
  };

  const handleReturn = async (bookingId) => {
    try {
      await axiosInstance.put(`/booking/return/${bookingId}`);
      alert("Car returned successfully!");
      fetchBookings();
      fetchCars();
    } catch (err) {
      console.error("Return failed:", err);
      const serverMsg = err?.response?.data?.message || err?.message || "Failed to return car.";
      alert(serverMsg);
    }
  };

  const hasActiveOrPendingBooking = bookings.some(
    (b) => b.status === "ACTIVE" || b.status === "PENDING_APPROVAL"
  );

  // ---------------------- Filters (unchanged logic) ----------------------
  const typesWithCounts = useMemo(() => {
    const map = new Map();
    cars.forEach((c) => {
      const key = (c?.carType && String(c.carType)) || "Other";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [{ type: "All", count: cars.length }, ...Array.from(map.entries()).map(([type, count]) => ({ type, count }))];
  }, [cars]);

  const filteredCars = useMemo(() => {
    let list = Array.isArray(cars) ? cars.slice() : [];
    if (filterType !== "All") {
      list = list.filter((c) => (c?.carType || "").toString() === filterType);
    }
    if (brandSearch.trim() !== "") {
      const q = brandSearch.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.brand || "").toLowerCase().includes(q) ||
          (c.model || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [cars, filterType, brandSearch]);

  // ---------------------- UI ----------------------
  if (loading)
    return (
      <div className="container my-5" style={{ color: vars.text }}>
        <div className="d-flex flex-column align-items-center">
          <div className="spinner-border text-primary" role="status" />
          <div className="mt-3">Loading cars...</div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="container my-5">
        <div className="alert alert-danger text-center">{error}</div>
      </div>
    );

  return (
    <div style={{ minHeight: "80vh" }}>
      <style>{`
        .dashboard-card { background: ${vars.cardBg}; color: ${vars.text}; border: ${vars.border}; border-radius: 12px; transition: background .2s ease, color .2s ease; }
        .dashboard-card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .muted { color: ${vars.muted}; }
        .pill-btn { border-radius: 999px; }
      `}</style>

      <div className="container mt-5">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="m-0" style={{ color: vars.text }}>Available Cars</h2>
          <small className="muted">{filteredCars.length} shown</small>
        </div>

        {/* Filters */}
        <div className="d-flex flex-column flex-md-row gap-3 mb-4">
          <div className="d-flex flex-wrap gap-2">
            {typesWithCounts.map(({ type, count }) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`btn btn-sm ${filterType === type ? "btn-primary" : "btn-outline-secondary"} pill-btn`}
              >
                {type} <span className="badge bg-light text-dark ms-2">{count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="ms-md-auto" style={{ minWidth: 280, maxWidth: 400 }}>
            <div className="input-group shadow-sm" style={{ borderRadius: 999, overflow: "hidden" }}>
              <input
                type="search"
                className="form-control border-0"
                placeholder="Search brand or model..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
              />
              <button className="btn btn-outline-secondary" onClick={() => setBrandSearch("")}>
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Cars grid */}
        <div className="row">
          {filteredCars.length > 0 ? (
            filteredCars.map((car) => (
              <div key={car.id} className="col-12 col-sm-6 col-lg-4 mb-4">
                <div className="card dashboard-card h-100">
                  <div style={{ height: 200, background: vars.surface }}>
                    <img
                      src={car.imageUrl || car.image || "https://via.placeholder.com/400x220?text=No+Image"}
                      alt={`${car.brand} ${car.model}`}
                      className="w-100 h-100"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div className="card-body d-flex flex-column">
                    <h6 className="fw-bold mb-1">{car.brand} {car.model}</h6>
                    <p className="small muted mb-1">Year: {car.year || "N/A"}</p>
                    <p className="small muted mb-1">Rent: ₹{car.rentPerDay}/day</p>
                    <p className="small muted mb-2">Location: {car.location || "N/A"}</p>

                    <div className="mt-auto d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-primary">₹{car.rentPerDay}/day</span>
                      <span className={`badge ${car.available ? "bg-success" : "bg-danger"}`}>
                        {car.available ? "Available" : "Unavailable"}
                      </span>
                    </div>

                    <button
                      className="btn btn-sm btn-primary w-100 mt-2"
                      onClick={() => handleBook(car.id)}
                      disabled={!car.available || hasActiveOrPendingBooking}
                    >
                      {!car.available ? "Unavailable" : hasActiveOrPendingBooking ? "Restricted" : "Book"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12 text-center py-5 muted">No cars available.</div>
          )}
        </div>

        {/* Divider */}
        <hr className="my-5" />

        {/* My Bookings */}
        {jwt && (
          <div>
            <h2 className="mb-4 fw-bold" style={{ color: vars.text }}>My Bookings</h2>
            {bookings.length > 0 ? (
              <div className="row g-4">
                {bookings.map((b) => (
                  <div key={b.id} className="col-12 col-md-6 col-lg-4">
                    <div className="card dashboard-card h-100">
                      <div className="card-body d-flex flex-column">
                        <h5 className="fw-bold text-primary">{b.car?.brand} {b.car?.model}</h5>
                        <p><strong>From:</strong> {b.startDate}</p>
                        <p><strong>To:</strong> {b.endDate}</p>
                        <p><strong>Status:</strong> <span className={`badge ${b.status === "ACTIVE" ? "bg-success" : b.status === "PENDING_APPROVAL" ? "bg-warning text-dark" : "bg-secondary"}`}>{b.status}</span></p>
                        <p><strong>Total:</strong> ₹{b.totalPrice}</p>
                        <div className="mt-auto d-flex gap-2">
                          {b.status === "ACTIVE" && (
                            <button className="btn btn-outline-success btn-sm" onClick={() => handleReturn(b.id)}>Return</button>
                          )}
                          {(b.status === "PENDING_APPROVAL" || b.status === "ACTIVE") && (
                            <button className="btn btn-outline-danger btn-sm" onClick={() => handleCancel(b.id)}>Cancel</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">You have no bookings yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
