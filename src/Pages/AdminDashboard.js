// src/Pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosInstance from "../Utils/axiosInstance";

/* -------------------------------------------------------
   Payment status normalizer (no backend change required)
--------------------------------------------------------*/
const getPaymentStatus = (b) => {
  if (!b || typeof b !== "object") return "UNKNOWN";
  let v =
    b.paymentStatus ??
    b.payment_status ??
    b.paymentState ??
    b.payment_state ??
    b.transactionStatus ??
    b.razorpayStatus;

  const p = b.payment || b.transaction || b.txn || b.gateway || {};
  v =
    v ??
    p.status ??
    p.state ??
    p.paymentStatus ??
    p.payment_state ??
    p.payment_status ??
    p.result;

  const paidLike = [b.paid, b.isPaid, b.paymentSuccess, p.paid, p.captured, p.success];
  const refunded = p.refunded || b.refunded;
  const failedHints = [p.failureReason, p.error, p.errorCode, p.error_message, b.failureReason].filter(Boolean);
  const statusCode = p.statusCode ?? p.code ?? p.httpStatus;

  if (typeof v === "string") v = v.trim();
  const up = (v || "").toUpperCase();

  if (["SUCCESS", "SUCCEEDED", "PAID", "COMPLETED", "CAPTURED"].includes(up)) return "SUCCESS";
  if (["PENDING", "PROCESSING", "INITIATED", "CREATED", "AUTHORIZED", "AUTHORISED"].includes(up)) return "PENDING";
  if (["FAILED", "FAILURE", "CANCELLED", "CANCELED", "REFUNDED", "CHARGEBACK"].includes(up)) return "FAILED";

  if (refunded) return "FAILED";
  if (failedHints.length > 0) return "FAILED";
  if (paidLike.some((x) => x === true)) return "SUCCESS";
  if (paidLike.some((x) => x === false)) return "FAILED";

  if (typeof statusCode === "number") {
    if (statusCode >= 200 && statusCode < 300) return "SUCCESS";
    if (statusCode >= 400) return "FAILED";
    return "PENDING";
  }

  const razorpayStatus = p.razorpayStatus || b.razorpayPaymentStatus || b.razorpay_order_status;
  if (typeof razorpayStatus === "string") {
    const r = razorpayStatus.toUpperCase();
    if (["PAID", "CAPTURED"].includes(r)) return "SUCCESS";
    if (["CREATED", "AUTHORIZED"].includes(r)) return "PENDING";
    if (["FAILED", "REFUNDED"].includes(r)) return "FAILED";
  }

  const amount = p.amount ?? p.capturedAmount ?? p.net ?? p.total;
  if (amount && b.totalPrice && Number(amount) === Number(b.totalPrice) && (p.captured === true || p.capture === true)) {
    return "SUCCESS";
  }

  return "UNKNOWN";
};

const paymentBadgeClass = (status) => {
  const s = (status || "").toUpperCase();
  if (s === "SUCCESS") return "bg-success";
  if (s === "PENDING") return "bg-warning text-dark";
  if (s === "FAILED") return "bg-danger";
  return "bg-secondary";
};

/* ======================================================
   Root: AdminDashboard
====================================================== */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard"); // dashboard | users | cars | bookings

  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem("uiTheme") || "light");
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    localStorage.setItem("uiTheme", next);
    setTheme(next);
  };

  useEffect(() => {
    const syncTheme = () => setTheme(localStorage.getItem("uiTheme") || "light");
    window.addEventListener("storage", syncTheme);
    const poll = setInterval(syncTheme, 600);
    return () => {
      window.removeEventListener("storage", syncTheme);
      clearInterval(poll);
    };
  }, []);

  const isDark = theme === "dark";
  const vars = {
    bg: isDark ? "#0b1220" : "#f2f6ff",
    surface: isDark ? "rgba(16,24,40,.75)" : "#ffffff",
    border: isDark ? "rgba(255,255,255,.10)" : "rgba(2,6,23,.08)",
    text: isDark ? "#e7eef8" : "#0f172a",
    muted: isDark ? "#a6b1c2" : "#64748b",
    accent: isDark ? "#7dd3fc" : "#2563eb",
    shadow: isDark ? "0 18px 60px rgba(0,0,0,.42)" : "0 22px 60px rgba(2,8,23,.12)",
    grad: isDark
      ? "linear-gradient(135deg,#0b1220 0%, #1e293b 60%, #0ea5e9 120%)"
      : "linear-gradient(135deg,#dbeafe 0%, #e0e7ff 50%, #cffafe 120%)",
  };

  useEffect(() => {
    document.body.style.background = vars.bg;
    document.body.style.color = vars.text;
  }, [vars.bg, vars.text]);

  return (
    <div className="container-fluid">
      <style>{`
        .appbar {
          background: ${vars.grad};
          border-bottom: 1px solid ${vars.border};
          border-radius: 18px;
          padding: 14px 18px;
          color: ${vars.text};
        }
        .sidebar { background:${isDark ? "#0b1220" : "#0f172a"}; color:#fff; }
        .sidebar .nav-link { color: rgba(255,255,255,.9); border-radius: 12px; }
        .sidebar .nav-link.active { background:#1f2937; color:#fff; }
        .glass { background:${vars.surface}; border:1px solid ${vars.border}; border-radius:18px; box-shadow:${vars.shadow}; backdrop-filter: blur(10px); }
        .lift { transition: transform .18s ease, box-shadow .18s ease; }
        .lift:hover { transform: translateY(-3px); box-shadow: 0 28px 70px ${isDark ? "rgba(0,0,0,.45)" : "rgba(2,8,23,.16)"}; }
        .muted { color:${vars.muted}; }
        .chip { background:${isDark ? "rgba(255,255,255,.06)" : "#fff"}; border:1px solid ${vars.border}; padding:8px 14px; border-radius:999px; cursor:pointer; }
        .chip.active { border-color:${vars.accent}; color:${vars.accent}; font-weight:800; box-shadow: inset 0 0 0 1px ${vars.accent}; }
        .table thead th { position: sticky; top: 0; z-index: 1; user-select:none; }
        th[role="button"] { cursor: pointer; }
        .btn-ghost { background: transparent; border:1px solid ${vars.border}; }
        .drawer {
          position: fixed; top:0; right:0; height:100%; width: 460px; max-width: 90vw;
          background:${vars.surface}; border-left:1px solid ${vars.border}; box-shadow:${vars.shadow}; z-index: 1060;
          transform: translateX(0);
        }
        .skeleton {
          display:inline-block; background:${isDark ? "rgba(255,255,255,.06)" : "#f4f6fb"};
          border-radius: 8px; height: 12px; width: 100%;
          animation: pulse 1.3s ease-in-out infinite;
        }
        @keyframes pulse { 0%{opacity:.6} 50%{opacity:1} 100%{opacity:.6} }
        .scroll-x { overflow-x:auto; }
      `}</style>

      {/* App bar */}
      <div className="row">
        <div className="col-12 my-3">
          <div className="appbar glass lift d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <span className="fs-5 fw-bold">🚗 InstaCar Admin Console</span>
              <span className="badge bg-info text-dark">v1.0</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-ghost" onClick={() => window.dispatchEvent(new Event("refresh-stats"))}>🔄 Refresh</button>
              <button className="btn btn-ghost" onClick={toggleTheme}>
                {isDark ? "🌞 Light" : "🌙 Dark"}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  localStorage.removeItem("jwt");
                  localStorage.removeItem("user");
                  localStorage.removeItem("userId");
                  navigate("/login");
                }}
              >
                🔒 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row flex-nowrap">
        {/* Sidebar */}
        <div className="col-auto col-md-3 col-xl-2 px-sm-2 px-0 sidebar min-vh-100 shadow">
          <div className="d-flex flex-column align-items-sm-start px-3 pt-3 text-white h-100">
            <Link to="/admin-dashboard" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
              <span className="fs-4 fw-bold">🏁 Dashboard</span>
            </Link>
            <hr className="text-secondary w-100" />
            <ul className="nav nav-pills flex-column mb-sm-auto mb-0 w-100 gap-1">
              {[
                { key: "dashboard", label: "📊 Overview" },
                { key: "bookings", label: "📑 Bookings" },
                { key: "cars", label: "🚘 Cars" },
                { key: "users", label: "👥 Users" },
              ].map((item) => (
                <li key={item.key} className="nav-item w-100">
                  <button
                    className={`nav-link text-start w-100 ${view === item.key ? "active fw-bold" : ""}`}
                    onClick={() => setView(item.key)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
            <hr className="text-secondary w-100 mt-auto" />
            <div className="pb-3 w-100">
              <small className="text-white-50">Tip: toggle theme on top bar.</small>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col py-4">
          {view === "dashboard" && <Overview />}
          {view === "bookings" && <BookingsPanel />}
          {view === "cars" && <CarsPanel />}
          {view === "users" && <UsersPanel />}
        </div>
      </div>
    </div>
  );
}

/* =================== OVERVIEW =================== */
function Overview() {
  const [stats, setStats] = useState({ users: 0, cars: 0, pending: 0, active: 0, totalBookings: 0 });
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  const countFromData = (data) => {
    if (Array.isArray(data)) return data.length;
    if (!data) return 0;
    if (typeof data === "object") {
      if (typeof data.count === "number") return data.count;
      if (typeof data.total === "number") return data.total;
      if (Array.isArray(data.data)) return data.data.length;
    }
    return 0;
  };

  const computeActiveFromBookings = (bookings) => {
    if (!Array.isArray(bookings)) return 0;
    return bookings.filter((b) => {
      const st = (b.status || "").toString().toLowerCase();
      return ["approved", "active", "ongoing", "in_progress", "running"].includes(st);
    }).length;
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const primaryResults = await Promise.allSettled([
        axiosInstance.get("/users"),
        axiosInstance.get("/getcars/getallcars"),
        axiosInstance.get("/booking/pending"),
      ]);

      const usersResp = primaryResults[0].status === "fulfilled" ? primaryResults[0].value : null;
      const carsResp = primaryResults[1].status === "fulfilled" ? primaryResults[1].value : null;
      const pendingResp = primaryResults[2].status === "fulfilled" ? primaryResults[2].value : null;

      const users = usersResp ? (Array.isArray(usersResp.data) ? usersResp.data.length : countFromData(usersResp.data)) : 0;
      const cars = carsResp ? (Array.isArray(carsResp.data) ? carsResp.data.length : countFromData(carsResp.data)) : 0;
      const pending = pendingResp ? (Array.isArray(pendingResp.data) ? pendingResp.data.length : countFromData(pendingResp.data)) : 0;

      const otherResults = await Promise.allSettled([
        axiosInstance.get("/booking/active"),
        axiosInstance.get("/booking"),
      ]);

      let active = 0;
      let totalBookings = 0;
      if (otherResults[0]?.status === "fulfilled") active = countFromData(otherResults[0].value.data);
      if (otherResults[1]?.status === "fulfilled") {
        const allData = otherResults[1].value.data;
        totalBookings = countFromData(allData);
        if (!active) active = computeActiveFromBookings(Array.isArray(allData) ? allData : allData?.data || []);
      } else {
        if (!totalBookings && active) totalBookings = active;
      }

      if (!totalBookings) {
        try {
          const allResp2 = await axiosInstance.get("/booking");
          totalBookings = Array.isArray(allResp2.data) ? allResp2.data.length : countFromData(allResp2.data);
          if (!active) {
            active = computeActiveFromBookings(
              Array.isArray(allResp2.data) ? allResp2.data : allResp2.data?.data || []
            );
          }
        } catch {}
      }

      setStats({ users, cars, pending, active, totalBookings });
      setUpdatedAt(new Date());
    } catch (e) {
      console.error("Overview load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("refresh-stats", handler);
    return () => window.removeEventListener("refresh-stats", handler);
  }, [load]);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-between align-items-center">
        <h2 className="fw-bold mb-0">📊 Admin Overview</h2>
        <div className="d-flex align-items-center gap-2">
          <small className="muted">
            {updatedAt ? `Last updated ${updatedAt.toLocaleTimeString()}` : "—"}
          </small>
          <button className="btn btn-ghost" onClick={load}>🔁 Refresh</button>
        </div>
      </div>

      <div className="row g-4">
        <StatCard label="Total Users" value={stats.users} color="primary" loading={loading} icon="👤" />
        <StatCard label="Total Cars" value={stats.cars} color="success" loading={loading} icon="🚘" />
        <StatCard label="Pending Approvals" value={stats.pending} color="warning" loading={loading} icon="⏳" />
        <StatCard label="Active Bookings" value={stats.active} color="info" loading={loading} icon="🟢" />
        <StatCard label="Total Bookings" value={stats.totalBookings} color="secondary" loading={loading} icon="📦" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color, loading, icon }) {
  return (
    <div className="col-6 col-md-4 col-lg-3 col-xxl-2">
      <div className="card border-0 text-center glass lift">
        <div className="card-body py-3">
          <div className="small muted mb-1">{label}</div>
          <div className={`fw-bold fs-3 text-${color}`} aria-live="polite">
            {loading ? <span className="skeleton" style={{ height: 24, display: "block" }} /> : value}
          </div>
          <div className="muted">{icon}</div>
        </div>
      </div>
    </div>
  );
}

/* =================== USERS =================== */
function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 250);
    return () => clearTimeout(t);
  }, [qInput]);

  // Active bookings by user
  const [activeByUser, setActiveByUser] = useState(new Map());

  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    axiosInstance
      .get("/users")
      .then((r) => setUsers(Array.isArray(r.data) ? r.data : r.data?.data || []))
      .catch((e) => console.error(e));

    axiosInstance
      .get("/booking/active")
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
        const m = new Map();
        list.forEach((bk) => {
          const uid = bk?.user?.id || bk?.userId;
          if (!uid) return;
          if (!m.has(uid)) m.set(uid, []);
          m.get(uid).push(bk);
        });
        setActiveByUser(m);
      })
      .catch(() => setActiveByUser(new Map()));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axiosInstance.delete(`/delete/${id}`);
      setUsers((s) => s.filter((u) => u.id !== id));
      window.dispatchEvent(new Event("refresh-stats"));
    } catch (err) {
      console.error(err);
      alert("Failed to delete user.");
    }
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) =>
        (u.fullname || "").toLowerCase().includes(query) ||
        (u.email || "").toLowerCase().includes(query) ||
        (u.drivingLicenseNumber || "").toLowerCase().includes(query)
    );
  }, [users, q]);

  const openUserActives = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };
  const selectedUserActives = useMemo(
    () => (!selectedUser ? [] : activeByUser.get(selectedUser.id) || []),
    [selectedUser, activeByUser]
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-bold m-0">👥 Manage Users</h3>
        <div className="input-group" style={{ maxWidth: 420 }}>
          <span className="input-group-text">🔎</span>
          <input
            className="form-control"
            placeholder="Search name, email or DL…"
            value={qInput}
            onChange={(e) => {
              setQInput(e.target.value);
              setQ(e.target.value);
            }}
          />
          <button className="btn btn-outline-secondary" onClick={() => { setQInput(""); setQ(""); }}>
            Clear
          </button>
        </div>
      </div>

      <div className="table-responsive glass">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>DL Number</th>
              <th>Active Bookings</th>
              <th>Member Since</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const count = (activeByUser.get(u.id) || []).length;
              return (
                <tr key={u.id}>
                  <td>{u.fullname}</td>
                  <td>{u.email}</td>
                  <td>{u.drivingLicenseNumber}</td>
                  <td>
                    {count > 0 ? (
                      <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => openUserActives(u)}
                        aria-haspopup="dialog"
                      >
                        View {count}
                      </button>
                    ) : (
                      <span className="badge bg-secondary">0</span>
                    )}
                  </td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                  <td className="d-flex gap-2">
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>
                      Delete
                    </button>
                    {u.email && (
                      <a className="btn btn-sm btn-outline-primary" href={`mailto:${u.email}`} rel="noreferrer">
                        Email
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center muted py-4">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Active bookings modal */}
      {showModal && selectedUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="d-flex align-items-center justify-content-center"
          style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.55)", zIndex: 1050, padding: 16 }}
          onClick={() => setShowModal(false)}
        >
          <div className="glass p-3 p-md-4" style={{ maxWidth: 1024, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h4 className="m-0">Active bookings — {selectedUser.fullname}</h4>
                <div className="muted small">
                  Email: {selectedUser.email} • DL: {selectedUser.drivingLicenseNumber || "—"}
                </div>
              </div>
              <button className="btn btn-light" onClick={() => setShowModal(false)} aria-label="Close">
                ✖
              </button>
            </div>

            {selectedUserActives.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Car</th>
                      <th>Reg#</th>
                      <th>Period</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUserActives.map((b) => (
                      <tr key={b.id}>
                        <td>{b.id}</td>
                        <td>{b.car?.brand} {b.car?.model}</td>
                        <td>{b.car?.registrationNumber || "—"}</td>
                        <td className="small"><b>{b.startDate}</b> → <b>{b.endDate}</b></td>
                        <td>₹{b.totalPrice}</td>
                        <td>
                          <span className={`badge ${
                            (b.status||"").toLowerCase()==="active" ? "bg-success" :
                            (b.status||"").toLowerCase().includes("pending") ? "bg-warning text-dark" :
                            (b.status||"").toLowerCase().includes("rejected") ? "bg-danger" : "bg-secondary"
                          }`}>{b.status}</span>
                        </td>
                        <td>
                          {(() => { const s = getPaymentStatus(b);
                            return (<span className={`badge ${paymentBadgeClass(s)}`}>{s}</span>);
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="muted">No active bookings for this user.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =================== CARS =================== */
function CarsPanel() {
  const [cars, setCars] = useState([]);
  const [newCar, setNewCar] = useState({
    brand: "",
    model: "",
    year: "",
    registrationNumber: "",
    rentPerDay: "",
    minPrice: "",
    maxPrice: "",
    location: "",
    available: true,
    imageUrl: "",
  });
  const [adding, setAdding] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    try {
      const r = await axiosInstance.get("/getcars/getallcars");
      setCars(r.data);
    } catch (err) {
      console.error("Failed to load cars", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this car?")) return;
    try {
      await axiosInstance.delete(`/getcars/deletecar/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
      });
      setCars((s) => s.filter((c) => c.id !== id));
      window.dispatchEvent(new Event("refresh-stats"));
    } catch (err) {
      if (err?.response?.status === 409) {
        alert(err.response.data || "Cannot delete: related bookings exist.");
      } else {
        console.error(err);
        alert("Failed to delete car.");
      }
    }
  };

  const normalizeNumber = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const handleAddCar = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const payload = {
        ...newCar,
        year: normalizeNumber(newCar.year),
        rentPerDay: normalizeNumber(newCar.rentPerDay),
        minPrice: normalizeNumber(newCar.minPrice),
        maxPrice: normalizeNumber(newCar.maxPrice),
      };
      const res = await axiosInstance.post("/getcars/cars", payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
      });
      setCars((s) => [...s, res.data]);
      setNewCar({
        brand: "",
        model: "",
        year: "",
        registrationNumber: "",
        rentPerDay: "",
        minPrice: "",
        maxPrice: "",
        location: "",
        available: true,
        imageUrl: "",
      });
      alert("✅ Car added successfully");
      window.dispatchEvent(new Event("refresh-stats"));
    } catch (err) {
      console.error(err);
      alert("❌ Failed to add car");
    } finally {
      setAdding(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingCar) return;
    setSavingEdit(true);
    try {
      const payload = {
        ...editingCar,
        year: normalizeNumber(editingCar.year),
        rentPerDay: normalizeNumber(editingCar.rentPerDay),
        minPrice: normalizeNumber(editingCar.minPrice),
        maxPrice: normalizeNumber(editingCar.maxPrice),
      };
      const res = await axiosInstance.put(`/getcars/edit/${editingCar.id}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
      });
      setCars((s) => s.map((c) => (c.id === res.data.id ? res.data : c)));
      setEditingCar(null);
      alert("✅ Car updated successfully");
      window.dispatchEvent(new Event("refresh-stats"));
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update car");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-bold m-0">🚘 Manage Cars</h3>
        <button className="btn btn-ghost" onClick={loadCars}>🔁 Refresh</button>
      </div>

      {/* Add Car Form */}
      <form onSubmit={handleAddCar} className="glass p-3 p-md-4 mb-4 lift border-0">
        <h5 className="mb-3">➕ Add New Car</h5>
        <div className="row g-3">
          {[
            { key: "brand", type: "text", placeholder: "Brand", required: true },
            { key: "model", type: "text", placeholder: "Model", required: true },
            { key: "year", type: "number", placeholder: "Year", required: true },
            { key: "registrationNumber", type: "text", placeholder: "Registration Number", required: true },
            { key: "rentPerDay", type: "number", placeholder: "Rent Per Day", required: true },
            { key: "minPrice", type: "number", placeholder: "Min Price", required: true },
            { key: "maxPrice", type: "number", placeholder: "Max Price", required: true },
            { key: "location", type: "text", placeholder: "Location", required: true },
            { key: "imageUrl", type: "text", placeholder: "Image URL (optional)", required: false },
          ].map((f) => (
            <div key={f.key} className="col-md-4">
              <input
                type={f.type}
                className="form-control"
                placeholder={f.placeholder}
                value={newCar[f.key]}
                onChange={(e) => setNewCar({ ...newCar, [f.key]: e.target.value })}
                required={f.required}
              />
            </div>
          ))}
        </div>
        <div className="form-check mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="availableCheck"
            checked={newCar.available}
            onChange={(e) => setNewCar({ ...newCar, available: e.target.checked })}
          />
          <label className="form-check-label" htmlFor="availableCheck">
            Available
          </label>
        </div>
        <button className="btn btn-success mt-3" type="submit" disabled={adding}>
          {adding ? "Adding..." : "Add Car"}
        </button>
      </form>

      {/* Edit Car Form */}
      {editingCar && (
        <form onSubmit={handleEditSave} className="glass p-3 p-md-4 mb-4 lift">
          <h5 className="mb-2">✏️ Edit Car</h5>
          <div className="row g-3">
            {[
              { key: "brand", type: "text" },
              { key: "model", type: "text" },
              { key: "year", type: "number" },
              { key: "registrationNumber", type: "text" },
              { key: "rentPerDay", type: "number" },
              { key: "minPrice", type: "number" },
              { key: "maxPrice", type: "number" },
              { key: "location", type: "text" },
              { key: "imageUrl", type: "text" },
            ].map((f) => (
              <div key={f.key} className="col-md-4">
                <input
                  type={f.type}
                  className="form-control"
                  value={editingCar[f.key] || ""}
                  onChange={(e) => setEditingCar({ ...editingCar, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="form-check mt-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="editAvailableCheck"
              checked={!!editingCar.available}
              onChange={(e) => setEditingCar({ ...editingCar, available: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="editAvailableCheck">
              Available
            </label>
          </div>
          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-primary" type="submit" disabled={savingEdit}>
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setEditingCar(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Cars list */}
      <div className="row g-4">
        {cars.map((car) => (
          <div key={car.id} className="col-md-4">
            <div className="card glass lift h-100">
              <img
                src={car.imageUrl || "https://via.placeholder.com/640x360?text=No+Image"}
                className="card-img-top"
                alt={car.brand}
                style={{ height: "200px", objectFit: "cover" }}
              />
              <div className="card-body d-flex flex-column">
                <h5 className="fw-bold">
                  {car.brand} {car.model}
                </h5>
                <div className="small muted mb-1">
                  {car.year} • ₹{car.rentPerDay}/day
                </div>
                <div className="small muted mb-2">
                  Min: {car.minPrice ?? "—"} • Max: {car.maxPrice ?? "—"}
                </div>
                <div className="small muted">📍 {car.location ?? "—"}</div>
                <div className="d-flex gap-2 mt-auto pt-2">
                  <button className="btn btn-sm btn-outline-warning" onClick={() => setEditingCar(car)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(car.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {cars.length === 0 && <p className="muted">No cars found</p>}
      </div>
    </div>
  );
}

/* =================== BOOKINGS =================== */
function BookingsPanel() {
  const [tab, setTab] = useState("pending"); // pending | active | all
  const [pending, setPending] = useState([]);
  const [active, setActive] = useState([]);
  const [all, setAll] = useState([]);

  // search (debounced)
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 250);
    return () => clearTimeout(t);
  }, [qInput]);

  // date range filter (YYYY-MM-DD)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // payment status filter
  const [payFilter, setPayFilter] = useState("ALL"); // ALL | SUCCESS | PENDING | FAILED

  // location filter
  const [location, setLocation] = useState("ALL");

  // sorting & pagination
  const [sort, setSort] = useState({ key: "id", dir: "desc" });
  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // auto refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshRef = useRef(null);

  // column visibility
  const [visible, setVisible] = useState({
    user: true,
    contact: true,
    car: true,
    location: true,
    period: true,
    total: true,
    status: true,
    payment: true,
    view: true,
    actions: true, // context actions column
    select: true,  // pending selection column
  });

  const toggleCol = (key) => setVisible((v) => ({ ...v, [key]: !v[key] }));

  // printable invoice (front-end)
  const openInvoiceWindow = (b) => {
    const pay = getPaymentStatus(b);
    const w = window.open("", "_blank", "width=900,height=700");
    const styles = `
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',sans-serif;padding:24px;color:#0f172a}
        .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
        .badge{display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid #d1d5db;font-size:12px}
        .muted{color:#64748b}
        .box{border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-top:12px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{border-bottom:1px solid #e5e7eb;padding:8px 6px;text-align:left}
        .right{text-align:right}
        .btn{padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer}
      </style>`;
    const html = `
      <html><head><title>Invoice #${b.id}</title>${styles}</head><body>
        <div class="head">
          <div>
            <h2 style="margin:0">Invoice #${b.id}</h2>
            <div class="muted" style="margin-top:4px">Generated: ${new Date().toLocaleString()}</div>
          </div>
          <div>
            <div class="badge">Payment: ${pay}</div>
          </div>
        </div>
        <div class="box">
          <strong>Bill To:</strong><br/>
          ${b.user?.fullname || "—"}<br/>
          ${b.user?.email || ""} ${b.user?.phone ? "• " + b.user.phone : ""}<br/>
          DL: ${b.user?.drivingLicenseNumber || "—"}
        </div>
        <div class="box">
          <strong>Booking Details</strong>
          <table>
            <tr><th>Car</th><td>${(b.car?.brand || "") + " " + (b.car?.model || "")}</td></tr>
            <tr><th>Reg #</th><td>${b.car?.registrationNumber || "—"}</td></tr>
            <tr><th>Location</th><td>${b.car?.location || "—"}</td></tr>
            <tr><th>Start</th><td>${b.startDate || "—"}</td></tr>
            <tr><th>End</th><td>${b.endDate || "—"}</td></tr>
            <tr><th>Status</th><td>${b.status || "—"}</td></tr>
            <tr><th>Payment ID</th><td>${b.paymentId || "—"}</td></tr>
          </table>
        </div>
        <div class="box">
          <strong>Charges</strong>
          <table>
            <tr><td>Rental Amount</td><td class="right">₹${Number(b.totalPrice || 0).toLocaleString()}</td></tr>
            <tr><td><em>Taxes (included if applicable)</em></td><td class="right">—</td></tr>
            <tr><th>Total</th><th class="right">₹${Number(b.totalPrice || 0).toLocaleString()}</th></tr>
          </table>
        </div>
        <p class="muted">* This invoice is system-generated for record purpose. Use “Save as PDF” from the print dialog.</p>
        <div style="margin-top:16px">
          <button class="btn" onclick="window.print()">🧾 Print / Save PDF</button>
        </div>
      </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
  };

  const fetchAll = useCallback(async () => {
    try {
      const [p, a, allRes] = await Promise.all([
        axiosInstance.get("/booking/pending").catch(() => ({ data: [] })),
        axiosInstance.get("/booking/active").catch(() => ({ data: [] })),
        axiosInstance.get("/booking").catch(() => ({ data: [] })),
      ]);
      setPending(Array.isArray(p.data) ? p.data : p.data?.data || []);
      setActive(Array.isArray(a.data) ? a.data : a.data?.data || []);
      setAll(Array.isArray(allRes.data) ? allRes.data : allRes.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (autoRefresh) {
      refreshRef.current = setInterval(() => fetchAll(), 30000);
    } else if (refreshRef.current) {
      clearInterval(refreshRef.current);
    }
    return () => refreshRef.current && clearInterval(refreshRef.current);
  }, [autoRefresh, fetchAll]);

  const handleApprove = async (id) => {
    try {
      await axiosInstance.put(`/booking/approve/${id}`);
      setPending((b) => b.filter((x) => x.id !== id));
      window.dispatchEvent(new Event("refresh-stats"));
    } catch (err) {
      console.error(err);
      alert("Failed to approve booking");
    }
  };

  const handleReject = async (id) => {
    try {
      await axiosInstance.put(`/booking/reject/${id}`);
      setPending((b) => b.filter((x) => x.id !== id));
      window.dispatchEvent(new Event("refresh-stats"));
    } catch (err) {
      console.error(err);
      alert("Failed to reject booking");
    }
  };

  const handleReturn = async (id) => {
    if (!window.confirm("Mark this booking as returned now?")) return;
    try {
      await axiosInstance.put(`/booking/return/${id}`);
      // refresh lists
      fetchAll();
      window.dispatchEvent(new Event("refresh-stats"));
      alert("✅ Return processed");
    } catch (err) {
      console.error(err);
      alert("Failed to mark as returned");
    }
  };

  // selection for bulk actions (pending)
  const [selected, setSelected] = useState(new Set());
  const toggleRow = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const selectAllVisible = (rows) => {
    const ids = rows.map((r) => r.id).filter(Boolean);
    setSelected(new Set(ids));
  };
  const clearSelection = () => setSelected(new Set());

  const bulkApprove = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Approve ${selected.size} booking(s)?`)) return;
    try {
      await Promise.all([...selected].map((id) => axiosInstance.put(`/booking/approve/${id}`)));
      fetchAll();
      clearSelection();
      window.dispatchEvent(new Event("refresh-stats"));
    } catch {
      alert("Some approvals failed. Please check logs.");
    }
  };

  const bulkReject = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Reject ${selected.size} booking(s)?`)) return;
    try {
      await Promise.all([...selected].map((id) => axiosInstance.put(`/booking/reject/${id}`)));
      fetchAll();
      clearSelection();
      window.dispatchEvent(new Event("refresh-stats"));
    } catch {
      alert("Some rejections failed. Please check logs.");
    }
  };

  const rows = tab === "pending" ? pending : tab === "active" ? active : all;

  // build location options from current rows
  const locationOptions = useMemo(() => {
    const set = new Set();
    (rows || []).forEach((b) => {
      const loc = b?.car?.location;
      if (loc) set.add(loc);
    });
    return ["ALL", ...Array.from(set)];
  }, [rows]);

  const dateFiltered = useMemo(() => {
    if (!from && !to) return rows;
    return (rows || []).filter((b) => {
      const s = b.startDate || "";
      const e = b.endDate || "";
      const afterFrom = !from || e >= from;
      const beforeTo = !to || s <= to;
      return afterFrom && beforeTo;
    });
  }, [rows, from, to]);

  const searchFiltered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return dateFiltered;
    return (dateFiltered || []).filter((b) => {
      const u = b.user || {};
      const c = b.car || {};
      return (
        (u.fullname || "").toLowerCase().includes(query) ||
        (u.email || "").toLowerCase().includes(query) ||
        (c.brand || "").toLowerCase().includes(query) ||
        (c.model || "").toLowerCase().includes(query) ||
        (c.registrationNumber || "").toLowerCase().includes(query) ||
        (b.status || "").toLowerCase().includes(query)
      );
    });
  }, [dateFiltered, q]);

  const payFiltered = useMemo(() => {
    if (payFilter === "ALL") return searchFiltered;
    return (searchFiltered || []).filter((b) => getPaymentStatus(b) === payFilter);
  }, [searchFiltered, payFilter]);

  const locFiltered = useMemo(() => {
    if (location === "ALL") return payFiltered;
    return (payFiltered || []).filter((b) => (b.car?.location || "") === location);
  }, [payFiltered, location]);

  const sorted = useMemo(() => {
    const arr = [...(locFiltered || [])];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      const pick = (row) =>
        key === "user"
          ? row.user?.fullname ?? ""
          : key === "car"
          ? `${row.car?.brand ?? ""} ${row.car?.model ?? ""}`.trim()
          : key === "total"
          ? Number(row.totalPrice ?? 0)
          : key === "startDate"
          ? row.startDate ?? ""
          : key === "status"
          ? row.status ?? ""
          : Number(row.id ?? 0);
      const A = pick(a);
      const B = pick(b);
      const cmp = A > B ? 1 : A < B ? -1 : 0;
      return cmp * (dir === "asc" ? 1 : -1);
    });
    return arr;
  }, [locFiltered, sort]);

  // reset page when filters/sorts change
  useEffect(() => {
    setPage(1);
  }, [tab, q, from, to, sort, payFilter, location]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page]
  );

  // revenue aggregates
  const revenue = useMemo(
    () => (sorted || []).reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0),
    [sorted]
  );

  const revenueByLocation = useMemo(() => {
    const map = new Map();
    (sorted || []).forEach((b) => {
      const loc = b?.car?.location || "Unknown";
      const v = Number(b.totalPrice) || 0;
      map.set(loc, (map.get(loc) || 0) + v);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [sorted]);

  const exportCsv = () => {
    const headers = ["Booking ID", "User", "Email", "Car", "Reg", "Location", "Start", "End", "Total", "Status", "Payment"];
    const rowsCsv = sorted.map((b) => [
      b.id,
      b.user?.fullname ?? "",
      b.user?.email ?? "",
      `${b.car?.brand ?? ""} ${b.car?.model ?? ""}`.trim(),
      b.car?.registrationNumber ?? "",
      b.car?.location ?? "",
      b.startDate ?? "",
      b.endDate ?? "",
      b.totalPrice ?? "",
      b.status ?? "",
      getPaymentStatus(b),
    ]);
    const csv = [headers, ...rowsCsv]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bookings_${tab}.csv`;
    a.click();
  };

  const headerSortIcon = (key) =>
    sort.key === key ? (sort.dir === "asc" ? "▲" : "▼") : "↕";

  // Booking drawer
  const [drawer, setDrawer] = useState(null); // the selected booking

  return (
    <div>
      {/* Topline controls */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div className="d-flex align-items-center gap-2">
          <h3 className="fw-bold m-0">📑 Bookings</h3>
          <span className="badge bg-secondary">Rows: {sorted.length}</span>
          <span className="badge bg-success">Revenue: ₹{revenue.toLocaleString()}</span>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {[
            { k: "pending", label: `Pending (${pending.length})` },
            { k: "active", label: `Active (${active.length})` },
            { k: "all", label: `All (${all.length})` },
          ].map((t) => (
            <button key={t.k} className={`chip ${tab === t.k ? "active" : ""}`} onClick={() => setTab(t.k)}>
              {t.label}
            </button>
          ))}

          {/* Column visibility dropdown (Bootstrap) */}
          <div className="dropdown">
            <button className="btn btn-ghost dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
              🧩 Columns
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-2" style={{ minWidth: 240 }}>
              {[
                ["user", "User"],
                ["contact", "Contact"],
                ["car", "Car"],
                ["location", "Location"],
                ["period", "Period"],
                ["total", "Total"],
                ["status", "Status"],
                ["payment", "Payment"],
                ["view", "View Button"],
                ["actions", tab === "pending" ? "Actions (Approve/Reject)" : "Actions (Return)"],
                ...(tab === "pending" ? [["select", "Selection Checkbox"]] : []),
              ].map(([key, label]) => (
                <li key={key} className="d-flex align-items-center px-2 py-1">
                  <input
                    id={`col-${key}`}
                    type="checkbox"
                    className="form-check-input me-2"
                    checked={visible[key]}
                    onChange={() => toggleCol(key)}
                  />
                  <label htmlFor={`col-${key}`} className="form-check-label">{label}</label>
                </li>
              ))}
            </ul>
          </div>

          <button className="btn btn-outline-primary" onClick={exportCsv}>⬇️ Export CSV</button>
          <button className="btn btn-ghost" onClick={fetchAll}>🔁 Refresh</button>
          <div className="form-check form-switch ms-2">
            <input className="form-check-input" type="checkbox" id="autoRefresh" checked={autoRefresh} onChange={(e)=>setAutoRefresh(e.target.checked)} />
            <label className="form-check-label" htmlFor="autoRefresh">Auto-refresh</label>
          </div>
        </div>
      </div>

      {/* Revenue mini-cards by location */}
      <div className="scroll-x mb-3">
        <div className="d-flex gap-3" style={{ minHeight: 0 }}>
          {revenueByLocation.map(([loc, amt]) => (
            <div key={loc} className="glass lift px-3 py-2" style={{ borderRadius: 14, minWidth: 180 }}>
              <div className="muted small">📍 {loc}</div>
              <div className="fw-bold">₹{amt.toLocaleString()}</div>
            </div>
          ))}
          {revenueByLocation.length === 0 && (
            <div className="muted">No revenue to summarize for current filters.</div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
        <div className="d-flex gap-2">
          <div className="input-group" style={{ maxWidth: 360 }}>
            <span className="input-group-text">🔎</span>
            <input
              className="form-control"
              placeholder="Search user, car, reg#, or status…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
            />
            <button className="btn btn-outline-secondary" onClick={() => { setQInput(""); setQ(""); }}>
              Clear
            </button>
          </div>
          <select className="form-select" style={{ maxWidth: 200 }} value={payFilter} onChange={(e) => setPayFilter(e.target.value)}>
            {["ALL", "SUCCESS", "PENDING", "FAILED"].map((x) => (
              <option key={x} value={x}>Payment: {x}</option>
            ))}
          </select>
          <select className="form-select" style={{ maxWidth: 220 }} value={location} onChange={(e) => setLocation(e.target.value)}>
            {locationOptions.map((x) => (
              <option key={x} value={x}>Location: {x}</option>
            ))}
          </select>
        </div>

        <div className="d-flex gap-2">
          <input type="date" className="form-control" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="form-control" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="btn btn-light" onClick={() => { setFrom(""); setTo(""); }}>
            Reset dates
          </button>
        </div>
      </div>

      {/* Bulk actions for pending */}
      {tab === "pending" && (
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="muted small">Bulk actions apply to selected pending rows.</div>
          <div className="d-flex gap-2">
            <button className="btn btn-success btn-sm" disabled={selected.size === 0} onClick={bulkApprove}>✅ Approve Selected</button>
            <button className="btn btn-danger btn-sm" disabled={selected.size === 0} onClick={bulkReject}>🛑 Reject Selected</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-responsive glass">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-dark">
            <tr>
              {tab === "pending" && visible.select && <th style={{ width: 42 }}>
                <input
                  type="checkbox"
                  onChange={(e) => (e.target.checked ? selectAllVisible(pageRows) : clearSelection())}
                  checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                  aria-label="Select all visible"
                />
              </th>}
              {visible.user && (
                <th role="button" aria-sort={sort.key==="user" ? sort.dir : "none"} onClick={() => toggleSort("user")}>
                  User {headerSortIcon("user")}
                </th>
              )}
              {visible.contact && <th>Contact</th>}
              {visible.car && (
                <th role="button" aria-sort={sort.key==="car" ? sort.dir : "none"} onClick={() => toggleSort("car")}>
                  Car {headerSortIcon("car")}
                </th>
              )}
              {visible.location && <th>Location</th>}
              {visible.period && (
                <th role="button" aria-sort={sort.key==="startDate" ? sort.dir : "none"} onClick={() => toggleSort("startDate")}>
                  Period {headerSortIcon("startDate")}
                </th>
              )}
              {visible.total && (
                <th role="button" aria-sort={sort.key==="total" ? sort.dir : "none"} onClick={() => toggleSort("total")}>
                  Total {headerSortIcon("total")}
                </th>
              )}
              {visible.status && (
                <th role="button" aria-sort={sort.key==="status" ? sort.dir : "none"} onClick={() => toggleSort("status")}>
                  Status {headerSortIcon("status")}
                </th>
              )}
              {visible.payment && <th>Payment</th>}
              {visible.view && <th></th>}
              {visible.actions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((b) => (
              <tr key={b.id}>
                {tab === "pending" && visible.select && (
                  <td>
                    <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggleRow(b.id)} aria-label={`Select booking ${b.id}`} />
                  </td>
                )}

                {visible.user && (
                  <td>
                    <div className="fw-semibold">{b.user?.fullname || "—"}</div>
                    <div className="small muted">ID: {b.user?.id || b.userId || "—"}</div>
                  </td>
                )}

                {visible.contact && (
                  <td className="small">
                    <div>
                      {b.user?.email ? <a href={`mailto:${b.user.email}`}>{b.user.email}</a> : "—"}
                    </div>
                    {b.user?.phone && <div className="muted"><a href={`tel:${b.user.phone}`}>{b.user.phone}</a></div>}
                  </td>
                )}

                {visible.car && (
                  <td>
                    <div className="fw-semibold">
                      {b.car?.brand} {b.car?.model}
                    </div>
                    <div className="small muted">Reg: {b.car?.registrationNumber || "—"}</div>
                  </td>
                )}

                {visible.location && <td className="small">{b.car?.location || "—"}</td>}

                {visible.period && (
                  <td className="small">
                    <div>
                      <b>{b.startDate}</b> → <b>{b.endDate}</b>
                    </div>
                    {b.returnedAt && <div className="muted">Returned: {b.returnedAt}</div>}
                  </td>
                )}

                {visible.total && <td>₹{b.totalPrice}</td>}

                {visible.status && (
                  <td>
                    <span
                      className={`badge ${
                        (b.status || "").toLowerCase() === "active"
                          ? "bg-success"
                          : (b.status || "").toLowerCase().includes("pending")
                          ? "bg-warning text-dark"
                          : (b.status || "").toLowerCase().includes("rejected")
                          ? "bg-danger"
                          : "bg-secondary"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                )}

                {visible.payment && (
                  <td>
                    {(() => {
                      const s = getPaymentStatus(b);
                      return (
                        <div className="d-flex align-items-center gap-2">
                          <span className={`badge ${paymentBadgeClass(s)}`}>{s}</span>
                          {b.paymentId && (
                            <button
                              className="btn btn-sm btn-light"
                              title={`Payment ID: ${b.paymentId}`}
                              onClick={() => navigator.clipboard.writeText(b.paymentId)}
                            >
                              ⧉
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                )}

                {visible.view && (
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-ghost" onClick={() => setDrawer(b)}>🔍 View</button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => openInvoiceWindow(b)}>
                        🧾 Invoice (PDF)
                      </button>
                    </div>
                  </td>
                )}

                {visible.actions && (
                  <td>
                    {tab === "pending" ? (
                      <div className="d-flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(b.id)}>
                          Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(b.id)}>
                          Reject
                        </button>
                      </div>
                    ) : tab === "active" ? (
                      <button className="btn btn-outline-success btn-sm" onClick={() => handleReturn(b.id)}>
                        🚗 Return Now
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center muted py-4">
                  No bookings to show
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="muted">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} of {sorted.length}
        </small>
        <div className="btn-group">
          <button className="btn btn-outline-secondary btn-sm" disabled={page === 1} onClick={() => setPage(1)}>
            «
          </button>
          <button className="btn btn-outline-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            ‹
          </button>
          <span className="btn btn-outline-secondary btn-sm disabled">
            {page}/{totalPages}
          </span>
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            ›
          </button>
          <button className="btn btn-outline-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
            »
          </button>
        </div>
      </div>

      {/* Booking details drawer */}
      {drawer && (
        <div className="drawer p-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5 className="m-0">Booking #{drawer.id}</h5>
              <div className="muted small">
                {drawer.user?.fullname} • {drawer.user?.email || "—"}
              </div>
            </div>
            <button className="btn btn-light" onClick={() => setDrawer(null)} aria-label="Close">✖</button>
          </div>

          <div className="glass p-3 mb-3">
            <div className="row g-2">
              <div className="col-6">
                <div className="muted small">User</div>
                <div className="fw-semibold">{drawer.user?.fullname || "—"}</div>
                <div className="small">
                  {drawer.user?.email ? <a href={`mailto:${drawer.user.email}`}>{drawer.user.email}</a> : "—"}
                </div>
                {drawer.user?.phone && <div className="small"><a href={`tel:${drawer.user.phone}`}>{drawer.user.phone}</a></div>}
                <div className="small">DL: {drawer.user?.drivingLicenseNumber || "—"}</div>
              </div>
              <div className="col-6">
                <div className="muted small">Car</div>
                <div className="fw-semibold">{drawer.car?.brand} {drawer.car?.model}</div>
                <div className="small">Reg#: {drawer.car?.registrationNumber || "—"}</div>
                <div className="small">📍 {drawer.car?.location || "—"}</div>
              </div>
              <div className="col-6">
                <div className="muted small">Period</div>
                <div className="small"><b>{drawer.startDate}</b> → <b>{drawer.endDate}</b></div>
              </div>
              <div className="col-6">
                <div className="muted small">Financials</div>
                <div className="small">Total: <b>₹{drawer.totalPrice}</b></div>
                <div className="small">Status: <span className="badge bg-secondary">{drawer.status}</span></div>
                <div className="small">
                  Payment: <span className={`badge ${paymentBadgeClass(getPaymentStatus(drawer))}`}>{getPaymentStatus(drawer)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Raw payment insights if present */}
          {(drawer.payment || drawer.transaction || drawer.txn || drawer.gateway || drawer.paymentStatus || drawer.paymentId) && (
            <div className="glass p-3 mb-3">
              <div className="fw-semibold mb-2">Payment Details</div>
              <div className="small">Provider: {drawer.paymentProvider || drawer.gateway?.provider || "—"}</div>
              <div className="small">
                Payment ID: {drawer.paymentId ? (
                  <>
                    <code>{drawer.paymentId}</code>{" "}
                    <button className="btn btn-sm btn-light" onClick={() => navigator.clipboard.writeText(drawer.paymentId)}>Copy</button>
                  </>
                ) : "—"}
              </div>
              <pre className="small mt-2 mb-0" style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(drawer.payment || drawer.transaction || drawer.txn || drawer.gateway || { paymentStatus: drawer.paymentStatus }, null, 2)}
              </pre>
            </div>
          )}

          {/* Contextual actions */}
          <div className="d-flex gap-2">
            {drawer.user?.email && (
              <a className="btn btn-outline-primary" href={`mailto:${drawer.user.email}`} rel="noreferrer">✉️ Email User</a>
            )}
            {drawer.user?.phone && (
              <a className="btn btn-outline-secondary" href={`tel:${drawer.user.phone}`} rel="noreferrer">📞 Call User</a>
            )}
            <button className="btn btn-outline-secondary" onClick={() => openInvoiceWindow(drawer)}>🧾 Invoice (PDF)</button>
            {drawer.status === "PENDING_APPROVAL" && (
              <>
                <button className="btn btn-success" onClick={() => handleApprove(drawer.id)}>✅ Approve</button>
                <button className="btn btn-danger" onClick={() => handleReject(drawer.id)}>🛑 Reject</button>
              </>
            )}
            {drawer.status === "ACTIVE" && (
              <button className="btn btn-outline-success" onClick={() => handleReturn(drawer.id)}>🚗 Return Now</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
