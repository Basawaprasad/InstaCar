// src/Pages/Profile.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../Utils/axiosInstance";

/** ---------- Tiny toast system (no extra files) ---------- */
const Toasts = ({ toasts, onClose }) => (
  <div
    aria-live="polite"
    aria-atomic="true"
    style={{ position: "fixed", right: 16, bottom: 16, zIndex: 2000, display: "grid", gap: 12 }}
  >
    {toasts.map((t) => (
      <div
        key={t.id}
        role="status"
        className={`alert alert-${t.variant || "info"} shadow-sm m-0`}
        style={{ minWidth: 280, maxWidth: 420 }}
      >
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            {t.title && <div className="fw-bold mb-1">{t.title}</div>}
            <div>{t.msg}</div>
          </div>
          <button type="button" className="btn-close" aria-label="Close notification" onClick={() => onClose(t.id)} />
        </div>
      </div>
    ))}
  </div>
);

/** ---------- Small inline SVG icons (no deps) ---------- */
const I = {
  return: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 7L4 12L9 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  cancel: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  invoice: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 3h8l3 3v15H8V3z" stroke="currentColor" strokeWidth="2"/><path d="M8 7h11" stroke="currentColor" strokeWidth="2"/><path d="M11 12h5M11 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  pdf: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6v20h12V8l-4-6z" stroke="currentColor" strokeWidth="2"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2"/><path d="M8 14h8M8 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  print: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9V3h12v6" stroke="currentColor" strokeWidth="2"/><path d="M6 17v4h12v-4" stroke="currentColor" strokeWidth="2"/><rect x="3" y="9" width="18" height="8" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 13h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  csv: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  whatsapp: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 11.5A8.5 8.5 0 1 1 11.5 3 8.5 8.5 0 0 1 20 11.5z" stroke="currentColor" strokeWidth="2"/><path d="M6 19l1.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M9 9c.3 2 2.7 4.4 4.6 4.6l1.2-1.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  email: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  copy: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  car: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 13l2-5 3-2h6l3 2 2 5" stroke="currentColor" strokeWidth="2"/><circle cx="7" cy="17" r="2" stroke="currentColor" strokeWidth="2"/><circle cx="17" cy="17" r="2" stroke="currentColor" strokeWidth="2"/></svg>
  ),
};

export default function Profile() {
  const navigate = useNavigate();
  const jwt = localStorage.getItem("jwt");
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const userId = storedUser?.id || localStorage.getItem("userId");

  const [profile, setProfile] = useState(storedUser || null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [theme, setTheme] = useState(() => localStorage.getItem("uiTheme") || "light");

  // Modal for car details
  const [carModalOpen, setCarModalOpen] = useState(false);
  const [modalCar, setModalCar] = useState(null);

  // UI: filters/sort
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("START_DESC");

  // Tabs (nice shortcuts for status)
  const tabs = [
    { key: "ALL", label: "All" },
    { key: "ACTIVE", label: "Active" },
    { key: "PENDING_APPROVAL", label: "Pending" },
    { key: "PENDING_PAYMENT", label: "Payment Due" },
    { key: "COMPLETED", label: "Completed" },
    { key: "CANCELLED", label: "Cancelled" },
  ];

  // Toasts
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);
  const pushToast = useCallback((t) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.ttl ?? 3500);
  }, []);
  const closeToast = (id) => setToasts((prev) => prev.filter((x) => x.id !== id));

  // Formatters
  const fmtDate = (iso) => {
    if (!iso) return "N/A";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  };
  const fmtMoney = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
      : "₹—";

  // Data load (same endpoints/logic)
  useEffect(() => {
    if (!userId || !jwt) {
      navigate("/login");
      return;
    }

    let mounted = true;
    (async function load() {
      setLoading(true);
      setError("");

      try {
        const userResp = await axiosInstance.get(`/users/${userId}`);
        if (mounted) setProfile(userResp.data || storedUser || null);
      } catch {
        if (mounted && storedUser) setProfile(storedUser);
      }

      try {
        const resB = await axiosInstance.get(`/booking/user/${userId}`);
        if (mounted) setBookings(Array.isArray(resB.data) ? resB.data : []);
      } catch {
        if (mounted) setBookings([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [jwt, userId, navigate]);

  // Live theme + body bg
  useEffect(() => {
    localStorage.setItem("uiTheme", theme);
    const dark = "#0b1220";
    const light = "#ffffff";
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = theme === "dark" ? dark : light;
    document.body.style.color = theme === "dark" ? "#e6eef8" : "#111827";
    document.body.style.transition = "background-color 220ms ease, color 220ms ease";
    return () => {
      document.body.style.background = prevBg || "";
      document.body.style.color = prevColor || "";
    };
  }, [theme]);

  // Actions (unchanged logic)
  const logout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Cancel booking?")) return;
    setActionLoading(true);
    try {
      const res = await axiosInstance.put(`/booking/cancel/${userId}/${bookingId}`);
      const updated = res?.data;
      if (updated && updated.id) {
        setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      } else {
        const r = await axiosInstance.get(`/booking/user/${userId}`);
        setBookings(r.data || []);
      }
      pushToast({ variant: "warning", title: "Cancelled", msg: "Your booking was cancelled." });
    } catch (err) {
      pushToast({ variant: "danger", title: "Cancel failed", msg: err?.response?.data?.message || "Please try again." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (bookingId) => {
    if (!window.confirm("Return car now?")) return;
    setActionLoading(true);
    try {
      await axiosInstance.put(`/booking/return/${bookingId}`);
      const r = await axiosInstance.get(`/booking/user/${userId}`);
      setBookings(r.data || []);
      pushToast({ variant: "success", title: "Returned", msg: "Car returned successfully." });
    } catch (err) {
      pushToast({ variant: "danger", title: "Return failed", msg: err?.response?.data?.message || "Please try again." });
    } finally {
      setActionLoading(false);
    }
  };

  // ---------- NEW: Invoice / Print / Calendar / Share helpers ----------
  const buildInvoiceHTML = (b) => {
    const fmt = (d) => {
      const date = new Date(d);
      return Number.isNaN(date) ? (d || "—") :
        new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(date);
    };
    const money = (n) => typeof n === "number"
      ? new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n)
      : "₹—";

    const pay = b.paymentStatus || "—";
    const user = profile || {};
    const car = b.car || {};

    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Invoice #${b.id}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  :root{--ink:#0f172a;--muted:#64748b;--border:#e5e7eb;}
  *{box-sizing:border-box} body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',sans-serif;margin:0;color:var(--ink);background:#fff;}
  .wrap{max-width:880px;margin:24px auto;padding:0 16px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
  .brand{font-weight:800;font-size:22px}
  .badge{display:inline-block;border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px}
  .box{border:1px solid var(--border);border-radius:12px;padding:14px;margin-top:16px}
  .muted{color:var(--muted)}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{padding:10px 8px;border-bottom:1px solid var(--border);text-align:left}
  tfoot th, tfoot td{font-weight:800}
  code{background:#f3f4f6;border:1px solid var(--border);padding:2px 6px;border-radius:6px}
  .right{text-align:right}
  .btn{padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:#fff;cursor:pointer;margin-top:14px}
  .row{display:flex;gap:16px;flex-wrap:wrap}
  .col{flex:1 1 280px}
  .carimg{width:100%;max-height:220px;object-fit:cover;border-radius:10px;border:1px solid var(--border)}
  @media print {.btn{display:none}}
</style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <div>
        <div class="brand">ITV Car Rental</div>
        <div class="muted">Tax Invoice / Receipt</div>
      </div>
      <div>
        <div class="badge">Payment: ${pay}</div>
        <div class="muted" style="margin-top:6px">Generated ${new Date().toLocaleString()}</div>
      </div>
    </div>

    <div class="row">
      <div class="col box">
        <div class="muted" style="margin-bottom:6px">Billed To</div>
        <div><b>${user.fullname || "—"}</b></div>
        <div class="muted">${user.email || "—"} ${user.phone ? "• " + user.phone : ""}</div>
        <div class="muted">DL: ${user.drivingLicenseNumber || "—"}</div>
      </div>

      <div class="col box">
        <div class="muted" style="margin-bottom:6px">Invoice</div>
        <div><b>#${b.id}</b></div>
        <div class="muted">Period: ${fmt(b.startDate)} → ${fmt(b.endDate)}</div>
        <div class="muted">Status: ${b.status || "—"}</div>
        ${b.paymentId ? `<div class="muted">Payment ID: <code>${b.paymentId}</code></div>` : ""}
      </div>
    </div>

    <div class="box">
      <div class="row">
        <div class="col">
          <img class="carimg" src="${car.imageUrl || car.image || "https://via.placeholder.com/800x450?text=Car"}" alt="Car"/>
        </div>
        <div class="col">
          <table>
            <tbody>
              <tr><th>Car</th><td>${(car.brand||"") + " " + (car.model||"")}</td></tr>
              <tr><th>Registration</th><td>${car.registrationNumber || "—"}</td></tr>
              <tr><th>Pickup Location</th><td>${car.location || "—"}</td></tr>
              <tr><th>Rental Amount</th><td>${money(Number(b.totalPrice)||0)}</td></tr>
            </tbody>
            <tfoot>
              <tr><th>Total</th><td class="right">${money(Number(b.totalPrice)||0)}</td></tr>
            </tfoot>
          </table>
          <div class="muted" style="margin-top:6px">* Taxes included if applicable.</div>
        </div>
      </div>
    </div>

    <button class="btn" onclick="window.print()">🧾 Print / Save as PDF</button>
  </div>
</body>
</html>`;
  };

  // Try new window synchronously; if blocked, fall back to hidden iframe
  const openInvoiceWindow = (booking) => {
    const html = buildInvoiceHTML(booking);

    const win = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
    if (win && win.document) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      try { win.focus(); } catch {}
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "-9999px";
    iframe.style.bottom = "-9999px";
    iframe.width = "0";
    iframe.height = "0";
    document.body.appendChild(iframe);
    const idoc = iframe.contentWindow || iframe.contentDocument;
    const doc = idoc.document || idoc;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      idoc.focus?.();
      idoc.print?.();
      setTimeout(() => iframe.remove(), 1200);
    }, 250);
  };

  const saveInvoiceAsPDF = (b) => openInvoiceWindow(b);

  const buildICS = (b) => {
    const dt = (iso) => {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    };
    const lines = [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//ITV Car Rental//Bookings//EN","BEGIN:VEVENT",
      `UID:booking-${b.id}@itvcar`,
      `DTSTAMP:${dt(new Date().toISOString())}`,
      `DTSTART:${dt(b.startDate)}`,
      `DTEND:${dt(b.endDate)}`,
      `SUMMARY:Car booking #${b.id} — ${(b.car?.brand||"") + " " + (b.car?.model||"")}`,
      `DESCRIPTION:Pickup ${b.car?.location||""}\\nTotal ${b.totalPrice||""}`,
      "END:VEVENT","END:VCALENDAR"
    ].join("\r\n");

    return new Blob([lines], { type: "text/calendar;charset=utf-8" });
  };

  const downloadICS = (b) => {
    const blob = buildICS(b);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `booking_${b.id}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportMyBookingsCSV = () => {
    const headers = ["Booking ID","Status","Payment","Car","Reg","Location","Start","End","Total"];
    const rows = bookings.map(b => [
      b.id,
      b.status || "",
      b.paymentStatus || "",
      `${b.car?.brand||""} ${b.car?.model||""}`.trim(),
      b.car?.registrationNumber || "",
      b.car?.location || "",
      b.startDate || "",
      b.endDate || "",
      b.totalPrice ?? ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "my_bookings.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const shareWhatsApp = (b) => {
    const msg = `Booking #${b.id} — ${(b.car?.brand||"") + " " + (b.car?.model||"")}\n` +
                `From ${b.startDate} to ${b.endDate}\nTotal ₹${b.totalPrice}\n` +
                `${window.location.origin}/profile#booking-${b.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  const shareEmail = (b) => {
    const subject = `Booking #${b.id} — ${(b.car?.brand||"") + " " + (b.car?.model||"")}`;
    const body = `Hi,%0D%0A%0D%0AHere are my booking details:%0D%0A` +
                 `Car: ${(b.car?.brand||"") + " " + (b.car?.model||"")}%0D%0A` +
                 `From: ${b.startDate}%0D%0ATo: ${b.endDate}%0D%0A` +
                 `Total: ₹${b.totalPrice}%0D%0A%0D%0ALink: ${window.location.origin}/profile#booking-${b.id}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  // Derived counts
  const activeCount = useMemo(() => bookings.filter((b) => b.status === "ACTIVE").length, [bookings]);
  const pendingCount = useMemo(() => bookings.filter((b) => b.status === "PENDING_APPROVAL").length, [bookings]);
  const cancelledCount = useMemo(() => bookings.filter((b) => b.status === "CANCELLED").length, [bookings]);

  // Filters/sort logic
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    let arr = bookings;
    if (statusFilter !== "ALL") arr = arr.filter((b) => (b.status || "").toUpperCase() === statusFilter);
    if (text) {
      arr = arr.filter((b) => {
        const brand = b.car?.brand || "";
        const model = b.car?.model || "";
        return `${brand} ${model}`.toLowerCase().includes(text) || String(b.id).includes(text);
      });
    }
    const sorted = [...arr].sort((a, b) => {
      const ad = new Date(a.startDate || 0).getTime();
      const bd = new Date(b.startDate || 0).getTime();
      const byTotal = (b.totalPrice ?? 0) - (a.totalPrice ?? 0);
      switch (sortBy) {
        case "PRICE_DESC":
          return byTotal;
        case "PRICE_ASC":
          return -byTotal;
        case "START_ASC":
          return ad - bd;
        case "START_DESC":
        default:
          return bd - ad;
      }
    });
    return sorted;
  }, [bookings, q, statusFilter, sortBy]);

  // Modal helpers
  const openCarModal = (car) => {
    setModalCar(car || null);
    setCarModalOpen(true);
  };
  const closeCarModal = () => {
    setCarModalOpen(false);
    setModalCar(null);
  };
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setCarModalOpen(false);
    if (carModalOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [carModalOpen]);

  // Theme palette
  const isDark = theme === "dark";
  const palette = {
    cardBg: isDark ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.96)",
    border: isDark ? "rgba(255,255,255,.08)" : "rgba(2,6,23,.08)",
    text: isDark ? "#e6eef8" : "#111827",
    subtext: isDark ? "#93a4b6" : "#6b7280",
    surface: isDark
      ? "radial-gradient(1200px 600px at 10% -10%, rgba(59,130,246,.18), transparent 40%), radial-gradient(1000px 600px at 90% -10%, rgba(34,211,238,.16), transparent 42%)"
      : "radial-gradient(1200px 600px at 10% -10%, rgba(13,110,253,.08), transparent 40%), radial-gradient(1000px 600px at 90% -10%, rgba(14,165,233,.08), transparent 42%)",
    accent: isDark ? "#60a5fa" : "#0d6efd",
    good: "#16a34a",
    warn: "#b45309",
    danger: "#b4232e",
  };
  const statusBadge = (s) => {
    const map = {
      ACTIVE: "success",
      PENDING_APPROVAL: "warning text-dark",
      PENDING_PAYMENT: "info",
      COMPLETED: "success",
      CANCELLED: "danger",
    };
    return `badge bg-${map[s] || "secondary"}`;
  };

  if (loading) {
    return (
      <div className="container py-5">
        <style>{`
          .shimmer { position: relative; overflow: hidden; background: rgba(226,232,240,.75); border-radius: 12px; }
          .shimmer:after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.7), rgba(255,255,255,0)); animation: shimmer 1.2s infinite; }
        `}</style>
        <div className="row g-4">
          <div className="col-md-4"><div className="shimmer" style={{ height: 360 }} /></div>
          <div className="col-md-8">
            <div className="shimmer" style={{ height: 140, marginBottom: 12 }} />
            <div className="shimmer" style={{ height: 280 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return <div className="p-6 text-center text-danger">❌ Profile not available</div>;

  return (
    <div
      className="py-5"
      style={{
        color: palette.text,
        background: palette.surface,
        minHeight: "100vh",
      }}
    >
      {/* Global decorative styles + new action button system */}
      <style>{`
        .glass { backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        .lift:hover { transform: translateY(-3px); box-shadow: 0 18px 46px rgba(2,8,23,.18); border-color: rgba(13,110,253,.22)!important; }
        .lift { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .pulse-dot { width:10px; height:10px; border-radius:50%; background:#16a34a; box-shadow:0 0 0 0 rgba(22,163,74,.6); animation:pulse 1.6s cubic-bezier(0.4,0,0.2,1) infinite; }
        @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(22,163,74,.5);} 70%{box-shadow:0 0 0 12px rgba(22,163,74,0);} 100%{box-shadow:0 0 0 0 rgba(22,163,74,0);} }
        .chip { padding:.4rem .7rem; border-radius:999px; font-weight:600; border:1px solid ${palette.border}; background:${isDark ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.8)"}; }
        .chip.active { color:#fff; background: linear-gradient(135deg, #3b82f6, #22d3ee); border-color: transparent; box-shadow: 0 10px 28px rgba(2,8,23,.18); }
        .btn-group .btn { border-radius:10px !important; }
        .btn { border-radius:10px; }
        .btn-sm { padding: .35rem .65rem; }

        /* === PRO ACTION BAR === */
        .actionbar {
          display:flex; flex-wrap:wrap; gap:8px 10px;
          padding:8px; border:1px solid ${palette.border}; border-radius:12px;
          background:${isDark ? "rgba(255,255,255,.04)" : "rgba(248,250,252,.9)"};
        }
        .action-btn {
          display:inline-flex; align-items:center; gap:8px;
          height:36px; padding:0 12px; border-radius:999px;
          font-weight:600; font-size:13px; line-height:1;
          border:1px solid ${palette.border};
          background:${isDark ? "rgba(255,255,255,.06)" : "#fff"};
          color:${palette.text};
          box-shadow:${isDark ? "0 1px 0 rgba(255,255,255,.06) inset" : "0 1px 0 rgba(255,255,255,.9) inset"};
          transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background-color .12s ease;
        }
        .action-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px ${isDark ? "rgba(0,0,0,.25)" : "rgba(2,8,23,.12)"}; }
        .action-btn:active { transform: translateY(0); }
        .action-btn:focus-visible { outline: 3px solid ${isDark ? "rgba(96,165,250,.38)" : "rgba(37,99,235,.35)"}; outline-offset: 2px; }

        .action-btn--ghost {
          background: transparent;
        }
        .action-btn--soft {
          background:${isDark ? "rgba(59,130,246,.12)" : "rgba(37,99,235,.08)"};
          border-color:${isDark ? "rgba(96,165,250,.25)" : "rgba(37,99,235,.25)"};
          color:${isDark ? "#93c5fd" : "#1d4ed8"};
        }
        .action-btn--prime {
          background:${isDark ? "rgba(34,197,94,.16)" : "rgba(16,185,129,.12)"};
          border-color:${isDark ? "rgba(34,197,94,.35)" : "rgba(16,185,129,.35)"};
          color:#15803d;
        }
        .action-btn--danger {
          background:${isDark ? "rgba(244,63,94,.12)" : "rgba(244,63,94,.08)"};
          border-color:${isDark ? "rgba(244,63,94,.35)" : "rgba(244,63,94,.35)"};
          color:#b4232e;
        }
        .action-btn .i { display:inline-flex; }
      `}</style>

      {/* Hero header */}
      <div className="container">
        <div
          className="glass border shadow-lg mb-4"
          style={{
            borderColor: palette.border,
            borderRadius: 18,
            overflow: "hidden",
            background: isDark
              ? "linear-gradient(135deg, rgba(15,23,42,.9), rgba(2,6,23,.8))"
              : "linear-gradient(135deg, rgba(255,255,255,.9), rgba(248,250,252,.9))",
          }}
        >
          <div
            style={{
              background:
                "url(https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=1920&auto=format&fit=crop) center/cover no-repeat",
              height: 140,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(2,6,23,.0), rgba(2,6,23,.55))",
              }}
            />
          </div>
          <div className="p-3 p-md-4 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <img
                src={
                  profile?.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    profile?.fullname || profile?.email || "User"
                  )}&background=60a5fa&color=fff&rounded=true`
                }
                alt="avatar"
                className="rounded-circle border"
                style={{
                  width: 84,
                  height: 84,
                  objectFit: "cover",
                  marginTop: -56,
                  borderColor: palette.accent,
                  boxShadow: "0 12px 28px rgba(2,8,23,.35)",
                }}
              />
              <div>
                <h3 className="fw-bold m-0">{profile?.fullname || "User"}</h3>
                <div className="small" style={{ color: palette.subtext }}>{profile?.email}</div>
                <div className="d-flex align-items-center gap-2 mt-2">
                  <span className="pulse-dot" />
                  <span className="fw-semibold" style={{ color: palette.good }}>Live</span>
                  <span className="small" style={{ color: palette.subtext }}>Bookings & profile sync</span>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <div className="btn-group">
                <button className={`btn btn-sm ${theme === "light" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setTheme("light")}>☀ Light</button>
                <button className={`btn btn-sm ${theme === "dark" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setTheme("dark")}>🌙 Dark</button>
              </div>
              <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Profile & quick stats */}
          <div className="col-lg-4">
            <div className="card shadow-lg border glass lift" style={{ background: palette.cardBg, borderColor: palette.border, borderRadius: 16 }}>
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">Account</h5>
                <div className="small" style={{ color: palette.subtext }}>
                  <div className="mb-2"><b className="text-reset">Phone:</b> {profile?.phone || "N/A"}</div>
                  <div className="mb-2"><b className="text-reset">Member since:</b> {fmtDate(profile?.createdAt)}</div>
                  <div className="mb-2"><b className="text-reset">ID:</b> {profile?.id || "—"}</div>
                </div>
                <div className="alert alert-info mt-3 mb-0">
                  Tip: Keep your contact info updated for faster pickup.
                </div>
              </div>
            </div>

            <div className="d-grid gap-3 mt-3">
              <StatTile color="rgba(34,197,94,.12)" title="Active" value={activeCount} tone={palette.good} />
              <StatTile color="rgba(245,158,11,.12)" title="Pending" value={pendingCount} tone={palette.warn} />
              <StatTile color="rgba(220,53,69,.12)" title="Cancelled" value={cancelledCount} tone={palette.danger} />
            </div>
          </div>

          {/* Bookings */}
          <div className="col-lg-8">
            {/* Toolbar */}
            <div
              className="mb-3 d-flex flex-wrap gap-2 justify-content-between align-items-end p-3 glass border"
              style={{
                background: isDark
                  ? "linear-gradient(135deg, rgba(37,99,235,.16), rgba(14,165,233,.12))"
                  : "linear-gradient(135deg, rgba(13,110,253,.08), rgba(14,165,233,.08))",
                borderColor: palette.border,
                borderRadius: 12,
              }}
            >
              <div>
                <h5 className="fw-bold m-0">📌 My Bookings</h5>
                <small style={{ color: palette.subtext }}>Manage reservations, payments, and returns.</small>
              </div>
              <div className="d-flex gap-2">
                <input
                  className="form-control form-control-sm"
                  style={{ minWidth: 200 }}
                  placeholder="Search car or #id"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <select
                  className="form-select form-select-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="START_DESC">Newest start date</option>
                  <option value="START_ASC">Oldest start date</option>
                  <option value="PRICE_DESC">Price: High → Low</option>
                  <option value="PRICE_ASC">Price: Low → High</option>
                </select>
              </div>
            </div>

            {/* Tabs */}
            <div className="d-flex flex-wrap gap-2 mb-3">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  className={`chip ${statusFilter === t.key ? "active" : ""}`}
                  onClick={() => setStatusFilter(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Error / Empty */}
            {error && <div className="alert alert-warning">{error}</div>}
            {!filtered.length && (
              <div
                className="text-center glass border p-4"
                style={{ background: "rgba(255,255,255,.6)", borderColor: palette.border, borderRadius: 12 }}
              >
                <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 10 }}>🚗</div>
                <h6 className="mb-1" style={{ color: palette.text }}>No bookings found</h6>
                <div className="small" style={{ color: palette.subtext }}>Try another tab or clear your search.</div>
              </div>
            )}

            {/* Booking cards */}
            <div className="row g-3">
              {filtered.map((b) => (
                <div key={b.id} className="col-12 col-md-6" id={`booking-${b.id}`}>
                  <div className="card h-100 shadow-sm border glass lift" style={{ borderRadius: 12, overflow: "hidden", borderColor: palette.border }}>
                    <div style={{ position: "relative", height: 160, background: "#0b1220" }}>
                      <img
                        src={b.car?.imageUrl || b.car?.image || "https://via.placeholder.com/400x200?text=No+Image"}
                        alt="car"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      <span className={`${statusBadge(b.status)} position-absolute`} style={{ left: 12, bottom: 12 }}>
                        {b.status}
                      </span>
                    </div>

                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="fw-bold mb-1">{b.car?.brand} {b.car?.model}</h6>
                          <div className="small" style={{ color: palette.subtext }}>#{b.id}</div>
                        </div>
                        <div className="text-end">
                          <div className="small" style={{ color: palette.subtext }}>Total</div>
                          <div className="fw-bold">{fmtMoney(b.totalPrice)}</div>
                        </div>
                      </div>

                      {/* Mini timeline */}
                      <div className="mt-2 small">
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge text-bg-light">From</span>
                          <span className="fw-semibold">{fmtDate(b.startDate)}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <span className="badge text-bg-light">To</span>
                          <span className="fw-semibold">{fmtDate(b.endDate)}</span>
                        </div>
                      </div>

                      <div className="d-flex align-items-center justify-content-between mt-2 small">
                        <div style={{ color: palette.subtext }}>Payment: <b className="text-reset">{b.paymentStatus || "—"}</b></div>
                        <div className="d-flex gap-2">
                          <button
                            className="action-btn action-btn--ghost"
                            onClick={() => {
                              navigator.clipboard?.writeText(String(b.id));
                              pushToast({ variant: "info", title: "Copied", msg: `Booking #${b.id} copied` });
                            }}
                            title="Copy booking ID"
                          >
                            <span className="i">{I.copy}</span> ID
                          </button>
                          <button className="action-btn action-btn--ghost" onClick={() => openCarModal(b.car)} title="View car">
                            <span className="i">{I.car}</span> Car
                          </button>
                        </div>
                      </div>

                      {b.status === "PENDING_PAYMENT" && (
                        <div className="mt-2" style={{ background: "rgba(14,165,233,.08)", color: "#0369a1", border: "1px solid rgba(14,165,233,.18)", borderRadius: 10, padding: "8px 10px", fontSize: 13 }}>
                          Your booking is awaiting payment. Please complete payment to confirm.
                        </div>
                      )}

                      {/* Pro action bar */}
                      <div className="actionbar mt-3">
                        {b.status === "ACTIVE" && (
                          <button className="action-btn action-btn--prime" onClick={() => handleReturn(b.id)} disabled={actionLoading} title="Return car">
                            <span className="i">{I.return}</span> Return
                          </button>
                        )}
                        {(b.status === "ACTIVE" || b.status === "PENDING_APPROVAL") && (
                          <button className="action-btn action-btn--danger" onClick={() => handleCancel(b.id)} disabled={actionLoading} title="Cancel booking">
                            <span className="i">{I.cancel}</span> Cancel
                          </button>
                        )}

                        <button className="action-btn action-btn--soft" onClick={() => openInvoiceWindow(b)} title="View invoice">
                          <span className="i">{I.invoice}</span> Invoice
                        </button>
                        <button className="action-btn action-btn--ghost" onClick={() => saveInvoiceAsPDF(b)} title="Save as PDF">
                          <span className="i">{I.pdf}</span> PDF
                        </button>
                        <button className="action-btn action-btn--ghost" onClick={() => window.print()} title="Print page">
                          <span className="i">{I.print}</span> Print
                        </button>

                        <button className="action-btn action-btn--ghost" onClick={() => downloadICS(b)} title="Add to Calendar">
                          <span className="i">{I.calendar}</span> Calendar
                        </button>
                        <button className="action-btn action-btn--ghost" onClick={exportMyBookingsCSV} title="Export all bookings">
                          <span className="i">{I.csv}</span> CSV
                        </button>

                        <button className="action-btn action-btn--prime" onClick={() => shareWhatsApp(b)} title="Share via WhatsApp">
                          <span className="i">{I.whatsapp}</span> WhatsApp
                        </button>
                        <button className="action-btn action-btn--soft" onClick={() => shareEmail(b)} title="Share via Email">
                          <span className="i">{I.email}</span> Email
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Car Modal */}
      {carModalOpen && modalCar && (
        <div
          role="dialog"
          aria-modal="true"
          className="position-fixed inset-0 d-flex align-items-center justify-content-center"
          style={{ zIndex: 1200, background: "rgba(2,8,23,.55)" }}
          onClick={(e) => e.target === e.currentTarget && closeCarModal()}
        >
          <div
            className="rounded shadow-lg glass"
            style={{
              width: "92%",
              maxWidth: 980,
              maxHeight: "86vh",
              overflow: "auto",
              borderRadius: 12,
              background: palette.cardBg,
              color: palette.text,
              border: `1px solid ${palette.border}`,
            }}
          >
            <div className="p-3 d-flex justify-content-between align-items-start border-bottom" style={{ borderColor: palette.border }}>
              <div>
                <h5 className="mb-0">{modalCar.brand} {modalCar.model}</h5>
                <small style={{ color: palette.subtext }}>{modalCar.carType || "N/A"} • {modalCar.location || "N/A"}</small>
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={closeCarModal}>Close</button>
            </div>

            <div className="p-3">
              <div className="row g-3">
                <div className="col-md-6">
                  <div style={{ borderRadius: 10, overflow: "hidden", background: "#0b1220" }}>
                    <img
                      src={modalCar.imageUrl || modalCar.image || "https://via.placeholder.com/800x450?text=No+Image"}
                      alt={`${modalCar.brand} ${modalCar.model}`}
                      style={{ width: "100%", height: 320, objectFit: "cover", display: "block" }}
                    />
                  </div>
                </div>

                <div className="col-md-6 d-flex flex-column">
                  <div className="mb-2 small">
                    <div><strong>Year:</strong> {modalCar.year || "N/A"}</div>
                    <div><strong>Rent / day:</strong> {fmtMoney(modalCar.rentPerDay ?? NaN)}</div>
                    <div><strong>Available:</strong> {modalCar.available ? "Yes" : "No"}</div>
                    <div><strong>Registration:</strong> {modalCar.registrationNumber || "N/A"}</div>
                  </div>

                  <div className="mt-auto d-flex gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        if (!jwt) {
                          navigate(`/login?redirect=${encodeURIComponent(`/book/${modalCar.id}`)}`);
                        } else {
                          navigate(`/book/${modalCar.id}`);
                        }
                        closeCarModal();
                      }}
                      disabled={!modalCar.available}
                    >
                      {modalCar.available ? "Book this car" : "Not available"}
                    </button>

                    <button className="btn btn-outline-secondary" onClick={() => alert("More details page not added yet 😄")}>
                      More details
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Toasts */}
      <Toasts toasts={toasts} onClose={closeToast} />
    </div>
  );
}

/* ---------- Small presentational tile ---------- */
function StatTile({ color, title, value, tone }) {
  return (
    <div className="p-3 rounded glass shadow-sm" style={{ background: color }}>
      <div className="fw-semibold" style={{ color: tone }}>{title}</div>
      <div className="h3 m-0">{value}</div>
    </div>
  );
}
