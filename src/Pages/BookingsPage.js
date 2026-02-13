// src/Pages/BookingsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "../Utils/axiosInstance";
import { useNavigate } from "react-router-dom";

const BookingsPage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [previewBooking, setPreviewBooking] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const jwt = localStorage.getItem("jwt");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const userId = user?.id;

  // Theme (presentation only)
  const [theme, setTheme] = useState(() => localStorage.getItem("uiTheme") || "light");

  useEffect(() => {
    const onStorage = (e) => { if (e.key === "uiTheme") setTheme(e.newValue || "light"); };
    window.addEventListener("storage", onStorage);
    const poll = setInterval(() => {
      const t = localStorage.getItem("uiTheme") || "light";
      if (t !== theme) setTheme(t);
    }, 400);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const dark = "#0b1220";
    const light = "#ffffff";
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = theme === "dark" ? dark : light;
    document.body.style.color = theme === "dark" ? "#e6eef8" : "#111827";
    document.body.style.transition = "background-color 220ms ease, color 220ms ease";
    return () => { document.body.style.background = prevBg || ""; document.body.style.color = prevColor || ""; };
  }, [theme]);

  // --- Design tokens ---
  const isDark = theme === "dark";
  const vars = {
    pageBg: isDark ? "#0b1220" : "#f6f8fc",
    ink: isDark ? "#e6eef8" : "#0f172a",
    muted: isDark ? "#9fb1c6" : "#6b7280",
    card: isDark ? "rgba(15,23,42,.65)" : "rgba(255,255,255,.96)",
    border: isDark ? "rgba(148,163,184,.18)" : "rgba(2,6,23,.08)",
    accent: isDark ? "#7aa2ff" : "#2563eb",
    success: "#16a34a",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#0ea5e9",
    shadow1: isDark ? "0 12px 48px rgba(0,0,0,.38)" : "0 12px 48px rgba(2,8,23,.12)",
    glass: isDark ? "rgba(13,18,33,.75)" : "rgba(255,255,255,.92)",
  };

  // ------- Helpers / business logic (unchanged) -------
  const fmt = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    } catch { return iso; }
  };

  const fetchBookings = async () => {
    setLoading(true); setError("");
    try {
      const res = await axiosInstance.get(`/booking/user/${userId}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setBookings(res.data || []);
    } catch (err) {
      console.error("Failed to fetch bookings:", err?.response ?? err);
      if (err?.response?.status === 401) { navigate("/login"); return; }
      setError(err?.response?.data?.message || "Failed to fetch bookings.");
    } finally { setLoading(false); }
  };

  const handleCancel = async (booking) => {
    if (!booking) return;
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    setCancellingId(booking.id);
    try {
      const resp = await axiosInstance.put(
        `/booking/cancel/${userId}/${booking.id}`, {},
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const updated = resp?.data;
      if (updated?.id) {
        const enriched = { ...updated, ...(updated?.paymentStatus === "SUCCESS" ? { refundPending: true } : {}) };
        setBookings((prev) => prev.map((b) => (b.id === enriched.id ? enriched : b)));
        alert(updated?.paymentStatus === "SUCCESS"
          ? "Booking cancelled. Refund (80% after fee) will be processed within 2 business days."
          : "Booking cancelled successfully!");
      } else {
        await fetchBookings();
      }
    } catch (err) {
      console.error("Cancel failed:", err?.response ?? err);
      if (err?.response) {
        alert(`Failed to cancel booking: ${err.response.data?.message || err.message}`);
        if (err.response.status === 401) navigate("/login");
      } else alert("Failed to cancel booking. Please try again.");
    } finally { setCancellingId(null); }
  };

  useEffect(() => {
    if (!userId || !jwt) { navigate("/login"); return; }
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, jwt]);

  const openPreview = (b) => { setPreviewBooking(b); setPreviewOpen(true); };
  const closePreview = () => { setPreviewOpen(false); setPreviewBooking(null); };

  const canCancel = (status, startDateStr) => {
    if (!status) return false;
    if (status === "PENDING_PAYMENT" || status === "PENDING_APPROVAL") return true;
    if (status === "ACTIVE") {
      if (!startDateStr) return true;
      try {
        const s = new Date(startDateStr);
        const t = new Date();
        const sd = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        const td = new Date(t.getFullYear(), t.getMonth(), t.getDate());
        return sd > td;
      } catch { return false; }
    }
    return false;
  };

  // ---------------- Filters (same behavior) ----------------
  const [tab, setTab] = useState("ALL"); // ALL | UPCOMING | PAST
  const [query, setQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState(new Set());
  const [onlyRefundPending, setOnlyRefundPending] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("NEWEST");

  const toggleStatus = (s) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const clearFilters = () => {
    setTab("ALL"); setQuery(""); setStatusFilters(new Set());
    setOnlyRefundPending(false); setDateFrom(""); setDateTo(""); setSort("NEWEST");
  };

  const overlapsRange = (b, fromIso, toIso) => {
    if (!fromIso && !toIso) return true;
    const bStart = new Date(b.startDate);
    const bEnd = new Date(b.endDate);
    const rStart = fromIso ? new Date(fromIso) : null;
    const rEnd = toIso ? new Date(toIso) : null;
    if (rStart && bEnd < rStart) return false;
    if (rEnd && bStart > rEnd) return false;
    return true;
  };

  const now = new Date();
  const justDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const filtered = useMemo(() => {
    let list = [...bookings];
    if (tab !== "ALL") {
      list = list.filter((b) => {
        const end = new Date(b.endDate);
        return tab === "UPCOMING" ? justDate(end) >= justDate(now) : justDate(end) < justDate(now);
      });
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((b) => {
        const car = b.car || {};
        return (
          (car.brand || "").toLowerCase().includes(q) ||
          (car.model || "").toLowerCase().includes(q) ||
          (car.registrationNumber || "").toLowerCase().includes(q) ||
          (car.location || "").toLowerCase().includes(q)
        );
      });
    }
    if (statusFilters.size > 0) list = list.filter((b) => statusFilters.has(b.status));
    if (onlyRefundPending) list = list.filter((b) => b.refundPending === true);
    if (dateFrom || dateTo) list = list.filter((b) => overlapsRange(b, dateFrom, dateTo));

    list.sort((a, b) => {
      switch (sort) {
        case "OLDEST": return new Date(a.startDate) - new Date(b.startDate);
        case "START_ASC": return new Date(a.startDate) - new Date(b.startDate);
        case "START_DESC": return new Date(b.startDate) - new Date(a.startDate);
        case "PRICE_ASC": return (a.totalPrice || 0) - (b.totalPrice || 0);
        case "PRICE_DESC": return (b.totalPrice || 0) - (a.totalPrice || 0);
        case "NEWEST":
        default: return new Date(b.startDate) - new Date(a.startDate);
      }
    });
    return list;
  }, [bookings, tab, query, statusFilters, onlyRefundPending, dateFrom, dateTo, sort]);

  // ======== NEW: UI polish, icons and essential utilities (NO business-logic changes) ========

  // Icons (inline SVG, no deps)
  const Icon = {
    invoice: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 3h8l3 3v15H8V3z" stroke="currentColor" strokeWidth="2"/><path d="M8 7h11" stroke="currentColor" strokeWidth="2"/><path d="M11 12h5M11 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    pdf: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6v20h12V8l-4-6z" stroke="currentColor" strokeWidth="2"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2"/><path d="M8 14h8M8 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    print: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9V3h12v6" stroke="currentColor" strokeWidth="2"/><path d="M6 17v4h12v-4" stroke="currentColor" strokeWidth="2"/><rect x="3" y="9" width="18" height="8" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 13h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    csv: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="2"/><path d="M20 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    copy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/></svg>,
    whatsapp: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 11.5A8.5 8.5 0 1 1 11.5 3 8.5 8.5 0 0 1 20 11.5z" stroke="currentColor" strokeWidth="2"/><path d="M6 19l1.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M9 9c.3 2 2.7 4.4 4.6 4.6l1.2-1.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    email: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  };

  // Build printable invoice HTML (same scheme as Profile)
  const buildInvoiceHTML = (b) => {
    const fmtDate = (d) => {
      const n = new Date(d);
      if (isNaN(n)) return d || "—";
      return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(n);
    };
    const money = (n) =>
      typeof n === "number"
        ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
        : "₹—";
    const car = b.car || {};

    return `<!doctype html><html><head><meta charset="utf-8"/><title>Invoice #${b.id}</title>
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
tfoot th,tfoot td{font-weight:800}
.right{text-align:right}
.carimg{width:100%;max-height:220px;object-fit:cover;border-radius:10px;border:1px solid var(--border)}
.btn{padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:#fff;cursor:pointer;margin-top:14px}
@media print {.btn{display:none}}
</style></head><body>
<div class="wrap">
  <div class="head">
    <div><div class="brand">ITV Car Rental</div><div class="muted">Tax Invoice / Receipt</div></div>
    <div><div class="badge">Payment: ${b.paymentStatus || "—"}</div><div class="muted" style="margin-top:6px">Generated ${new Date().toLocaleString()}</div></div>
  </div>

  <div class="box">
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div style="flex:1 1 260px"><img class="carimg" src="${car.imageUrl || car.image || "https://via.placeholder.com/800x450?text=Car"}" /></div>
      <div style="flex:1 1 260px">
        <table>
          <tbody>
            <tr><th>Invoice</th><td>#${b.id}</td></tr>
            <tr><th>Period</th><td>${fmtDate(b.startDate)} → ${fmtDate(b.endDate)}</td></tr>
            <tr><th>Car</th><td>${(car.brand||"")+" "+(car.model||"")}</td></tr>
            <tr><th>Registration</th><td>${car.registrationNumber || "—"}</td></tr>
            <tr><th>Location</th><td>${car.location || "—"}</td></tr>
            <tr><th>Payment</th><td>${b.paymentStatus || "—"}</td></tr>
          </tbody>
          <tfoot><tr><th>Total</th><td class="right">${money(Number(b.totalPrice)||0)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  </div>

  <button class="btn" onclick="window.print()">🧾 Print / Save as PDF</button>
</div></body></html>`;
  };

  const openInvoiceWindow = (b) => {
    const html = buildInvoiceHTML(b);
    const win = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
    if (win && win.document) {
      win.document.open(); win.document.write(html); win.document.close();
      try { win.focus(); } catch {}
      return;
    }
    // Fallback: hidden iframe + print
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed"; iframe.style.right = "-9999px"; iframe.style.bottom = "-9999px";
    iframe.width = "0"; iframe.height = "0"; document.body.appendChild(iframe);
    const idoc = iframe.contentWindow || iframe.contentDocument;
    const doc = idoc.document || idoc;
    doc.open(); doc.write(html); doc.close();
    setTimeout(()=>{ idoc.print?.(); setTimeout(()=>iframe.remove(), 1200); },250);
  };

  const downloadICS = (b) => {
    const dt = (iso) => {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2,"0");
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    };
    const lines = [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//ITV Car Rental//Bookings//EN","BEGIN:VEVENT",
      `UID:booking-${b.id}@itvcar`,
      `DTSTAMP:${dt(new Date().toISOString())}`,
      `DTSTART:${dt(b.startDate)}`,
      `DTEND:${dt(b.endDate)}`,
      `SUMMARY:Car booking #${b.id} — ${(b.car?.brand||"")+" "+(b.car?.model||"")}`,
      `DESCRIPTION:Pickup ${b.car?.location||""}\\nTotal ${b.totalPrice||""}`,
      "END:VEVENT","END:VCALENDAR"
    ].join("\r\n");
    const blob = new Blob([lines], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `booking_${b.id}.ics`; a.click(); URL.revokeObjectURL(a.href);
  };

  const exportFilteredCSV = () => {
    const headers = ["Booking ID","Status","Payment","Car","Reg","Location","Start","End","Total"];
    const rows = filtered.map(b => [
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
    a.download = "bookings_filtered.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const printList = () => window.print();

  const copyId = async (id) => {
    try { await navigator.clipboard.writeText(String(id)); alert(`Copied #${id}`); } catch { /*noop*/ }
  };

  const shareWhatsApp = (b) => {
    const msg = `Booking #${b.id} — ${(b.car?.brand||"")+" "+(b.car?.model||"")}\nFrom ${b.startDate} to ${b.endDate}\nTotal ₹${b.totalPrice}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  const shareEmail = (b) => {
    const subject = `Booking #${b.id} — ${(b.car?.brand||"")+" "+(b.car?.model||"")}`;
    const body = `Hi,%0D%0A%0D%0ADetails:%0D%0ABooking #${b.id}%0D%0AFrom ${b.startDate} to ${b.endDate}%0D%0ATotal ₹${b.totalPrice}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  // Badge visuals
  const badgeMeta = (b) => {
    if (b?.refundPending) return { text: "REFUND PENDING", bg: vars.danger, icon: "↺" };
    switch (b?.status) {
      case "ACTIVE": return { text: "ACTIVE", bg: vars.success, icon: "✓" };
      case "PENDING_APPROVAL": return { text: "PENDING APPROVAL", bg: vars.warning, icon: "…" };
      case "PENDING_PAYMENT": return { text: "PENDING PAYMENT", bg: vars.accent, icon: "₹" };
      case "CANCELLED": return { text: "CANCELLED", bg: vars.muted, icon: "✖" };
      case "COMPLETED": return { text: "COMPLETED", bg: vars.success, icon: "✔" };
      default: return { text: b?.status || "—", bg: vars.muted, icon: "•" };
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: vars.pageBg }}>
      <style>{`
        /* Sticky filter toolbar */
        .toolbar {
          position: sticky; top: 12px; z-index: 20;
          border-radius: 14px; backdrop-filter: blur(10px);
          background: ${vars.glass};
          border: 1px solid ${vars.border};
          box-shadow: ${vars.shadow1};
        }
        .toolbar .seg {
          display:inline-flex; border:1px solid ${vars.border}; border-radius:12px; overflow:hidden;
        }
        .seg button {
          border:0; background:transparent; padding:6px 12px; font-weight:700; font-size:12px;
          color:${vars.muted};
        }
        .seg button.active { background:${isDark ? "rgba(122,162,255,.18)" : "rgba(37,99,235,.10)"}; color:${vars.accent}; }
        .chip {
          border:1px solid ${vars.border}; background:${isDark ? "#0f172a" : "#fff"};
          padding:4px 10px; border-radius:999px; cursor:pointer; user-select:none; font-size:12px; font-weight:700;
          transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease;
        }
        .chip:hover { transform: translateY(-1px); box-shadow:${vars.shadow1}; }
        .chip.active { background:${isDark ? "rgba(122,162,255,.18)" : "rgba(37,99,235,.10)"}; border-color:${vars.accent}; color:${vars.accent}; }
        .i-group .input-group-text { border-right:0; }
        .i-group .form-control { border-left:0; }
        .form-control, .form-select { font-size: 0.875rem; }
        .glass {
          background:${vars.card}; border:1px solid ${vars.border}; border-radius:16px; box-shadow:${vars.shadow1}; overflow:hidden;
        }
        .lift { transition: transform .18s ease, box-shadow .18s ease; }
        .lift:hover { transform: translateY(-3px); box-shadow:${vars.shadow1}; }
        .booking-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; font-weight:800; font-size:11px; letter-spacing:.2px; }

        /* Action pills */
        .actionbar { display:flex; flex-wrap:wrap; gap:8px 10px; padding:8px; border:1px solid ${vars.border}; border-radius:12px;
                     background:${isDark ? "rgba(255,255,255,.04)" : "rgba(248,250,252,.9)"}; }
        .action-btn { display:inline-flex; align-items:center; gap:8px; height:32px; padding:0 12px; border-radius:999px;
                      font-weight:600; font-size:12px; border:1px solid ${vars.border};
                      background:${isDark ? "rgba(255,255,255,.06)" : "#fff"}; color:${vars.ink};
                      transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background-color .12s ease; }
        .action-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px ${isDark ? "rgba(0,0,0,.25)" : "rgba(2,8,23,.12)"}; }
        .action-btn:focus-visible { outline: 3px solid ${isDark ? "rgba(96,165,250,.38)" : "rgba(37,99,235,.35)"}; outline-offset: 2px; }
        .action-btn--soft { background:${isDark ? "rgba(59,130,246,.12)" : "rgba(37,99,235,.08)"}; border-color:${isDark ? "rgba(96,165,250,.25)" : "rgba(37,99,235,.25)"}; color:${isDark ? "#93c5fd" : "#1d4ed8"}; }
        .action-btn--danger { background:${isDark ? "rgba(244,63,94,.12)" : "rgba(244,63,94,.08)"}; border-color:${isDark ? "rgba(244,63,94,.35)" : "rgba(244,63,94,.35)"}; color:#b4232e; }

        /* skeletons */
        .shimmer { position:relative; overflow:hidden; background:${isDark ? "rgba(15,23,42,.7)" : "rgba(226,232,240,.65)"}; border-radius:14px; min-height:200px; border:1px solid ${vars.border}; }
        .shimmer::after { content:""; position:absolute; inset:0; transform:translateX(-100%);
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.35), rgba(255,255,255,0)); animation: shimmer 1.15s infinite; }
        @keyframes shimmer { 100% { transform: translateX(100%); } }

        /* modal */
        .modal-mask { position: fixed; inset: 0; background: rgba(2,6,23,.55); display: grid; place-items: center; z-index: 1050; padding: 20px; }
        .modal-card { width: 100%; max-width: 720px; border-radius: 16px; background: ${vars.card}; border: 1px solid ${vars.border}; box-shadow: ${vars.shadow1}; overflow: hidden; }
        .modal-header, .modal-footer { padding: 10px 14px; border-bottom: 1px solid ${vars.border}; }
        .modal-footer { border-top: 1px solid ${vars.border}; border-bottom: none; display:flex; justify-content:flex-end; gap:10px; }
      `}</style>

      <div className="container py-3 py-md-4">
        {/* Toolbar */}
        <div className="toolbar p-2 p-md-3 mb-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Tabs (segmented) */}
            <div className="seg me-2">
              {["ALL","UPCOMING","PAST"].map(t => (
                <button key={t} className={`btn btn-sm ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
                  {t==="ALL"?"All":t==="UPCOMING"?"Upcoming":"Past"}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="i-group input-group input-group-sm" style={{ minWidth: 240, maxWidth: 360 }}>
              <span className="input-group-text">🔎</span>
              <input
                type="text"
                className="form-control"
                placeholder="Search brand / model / reg / location"
                value={query}
                onChange={(e)=>setQuery(e.target.value)}
              />
            </div>

            {/* Dates */}
            <div className="i-group input-group input-group-sm" style={{ width: 180 }}>
              <span className="input-group-text">From</span>
              <input type="date" className="form-control" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} />
            </div>

            <div className="i-group input-group input-group-sm" style={{ width: 180 }}>
              <span className="input-group-text">To</span>
              <input type="date" className="form-control" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} />
            </div>

            {/* Sort */}
            <div className="i-group input-group input-group-sm" style={{ width: 180 }}>
              <span className="input-group-text">Sort</span>
              <select className="form-select" value={sort} onChange={(e)=>setSort(e.target.value)}>
                <option value="NEWEST">Newest</option>
                <option value="OLDEST">Oldest</option>
                <option value="START_ASC">Start ↑</option>
                <option value="START_DESC">Start ↓</option>
                <option value="PRICE_ASC">Price ↑</option>
                <option value="PRICE_DESC">Price ↓</option>
              </select>
            </div>

            {/* Right side */}
            <div className="ms-auto d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>Clear</button>
              <button className="btn btn-sm btn-outline-primary" onClick={exportFilteredCSV} title="Export filtered as CSV">
                <span style={{ display:"inline-flex", marginRight:6 }}>{Icon.csv}</span> Export CSV
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={printList} title="Print list">
                <span style={{ display:"inline-flex", marginRight:6 }}>{Icon.print}</span> Print
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={fetchBookings}
                title="Refresh"
              >
                <span style={{ display:"inline-flex", marginRight:6 }}>{Icon.refresh}</span> Refresh
              </button>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={()=>{ const t = theme === "dark" ? "light" : "dark"; localStorage.setItem("uiTheme", t); setTheme(t); }}
                title="Toggle theme"
              >
                {theme==="dark"?"☀️ Light":"🌙 Dark"}
              </button>
            </div>
          </div>

          {/* Status chips row */}
          <div className="mt-2 d-flex flex-nowrap gap-2" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {["ACTIVE","PENDING_PAYMENT","PENDING_APPROVAL","COMPLETED","CANCELLED"].map(s=>(
              <span
                key={s}
                className={`chip ${statusFilters.has(s)?"active":""}`}
                onClick={()=>toggleStatus(s)}
                title={s.replace("_"," ")}
              >
                {s.replace("_"," ")}
              </span>
            ))}
            <label className="chip ms-1" style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={onlyRefundPending}
                onChange={(e)=>setOnlyRefundPending(e.target.checked)}
                style={{ transform:"scale(.9)" }}
              />
              Refund pending
            </label>

            <span className="ms-auto muted small">
              Showing <strong>{filtered.length}</strong> / {bookings.length}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger glass" role="alert" style={{ borderRadius: 14 }}>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="row gy-4">
            {[...Array(6)].map((_, i) => (
              <div className="col-12 col-md-6 col-lg-4" key={i}><div className="shimmer" /></div>
            ))}
          </div>
        )}

        {/* Cards */}
        {!loading && filtered.length > 0 && (
          <div className="row gy-4">
            {filtered.map((booking) => {
              const meta = badgeMeta(booking);
              return (
                <div key={booking.id} className="col-12 col-md-6 col-lg-4">
                  <div className="glass lift h-100">
                    <div className="p-3 d-flex flex-column h-100">
                      <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${vars.border}` }}>
                        <img
                          src={booking.car?.imageUrl || booking.car?.image || "https://via.placeholder.com/640x360?text=No+Image"}
                          alt={`${booking.car?.brand || ""} ${booking.car?.model || ""}`}
                          style={{ width: "100%", height: 180, objectFit: "cover" }}
                          loading="lazy"
                        />
                      </div>

                      <div className="d-flex justify-content-between align-items-start mt-3">
                        <div>
                          <div className="fw-bold" style={{ color: vars.ink, fontSize: 18 }}>
                            {booking.car?.brand} {booking.car?.model}
                          </div>
                          <div className="muted small">
                            Reg: {booking.car?.registrationNumber || "—"} · {booking.car?.location || "—"}
                          </div>
                        </div>
                        <span className="booking-badge" style={{ background: meta.bg, color: "#fff" }}>
                          <span style={{ fontWeight: 900 }}>{meta.icon}</span> {meta.text}
                        </span>
                      </div>

                      <div className="mt-3 p-3" style={{ background: isDark ? "rgba(2,6,23,.5)" : "#fff", borderRadius: 12, border: `1px solid ${vars.border}` }}>
                        <div className="d-flex justify-content-between">
                          <div>
                            <div className="muted small">From</div>
                            <div className="fw-semibold" style={{ color: vars.ink }}>{fmt(booking.startDate)}</div>
                          </div>
                          <div className="text-end">
                            <div className="muted small">To</div>
                            <div className="fw-semibold" style={{ color: vars.ink }}>{fmt(booking.endDate)}</div>
                          </div>
                        </div>
                        <div className="d-flex justify-content-between mt-2">
                          <div className="muted small">Total</div>
                          <div className="fw-bold" style={{ color: vars.ink }}>₹{booking.totalPrice ?? "—"}</div>
                        </div>
                      </div>

                      {/* Existing row: preview + cancel (unchanged) */}
                      <div className="mt-3 d-flex justify-content-between align-items-center gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={()=>openPreview(booking)}>Preview</button>
                        {canCancel(booking.status, booking.startDate) && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={()=>handleCancel(booking)}
                            disabled={cancellingId === booking.id}
                          >
                            {cancellingId === booking.id ? "Cancelling…" : "Cancel"}
                          </button>
                        )}
                      </div>

                      {/* New: Pro action bar */}
                      <div className="actionbar mt-2">
                        <button className="action-btn action-btn--soft" onClick={()=>openInvoiceWindow(booking)} title="View invoice">
                          <span style={{display:"inline-flex"}}>{Icon.invoice}</span> Invoice
                        </button>
                        <button className="action-btn" onClick={()=>openInvoiceWindow(booking)} title="Save as PDF (via print)">
                          <span style={{display:"inline-flex"}}>{Icon.pdf}</span> PDF
                        </button>
                        <button className="action-btn" onClick={()=>window.print()} title="Print page">
                          <span style={{display:"inline-flex"}}>{Icon.print}</span> Print
                        </button>
                        <button className="action-btn" onClick={()=>downloadICS(booking)} title="Add to Calendar">
                          <span style={{display:"inline-flex"}}>{Icon.calendar}</span> Calendar
                        </button>
                        <button className="action-btn" onClick={()=>copyId(booking.id)} title="Copy booking ID">
                          <span style={{display:"inline-flex"}}>{Icon.copy}</span> Copy ID
                        </button>
                        <button className="action-btn" onClick={()=>shareWhatsApp(booking)} title="Share on WhatsApp">
                          <span style={{display:"inline-flex"}}>{Icon.whatsapp}</span> WhatsApp
                        </button>
                        <button className="action-btn" onClick={()=>shareEmail(booking)} title="Share via Email">
                          <span style={{display:"inline-flex"}}>{Icon.email}</span> Email
                        </button>
                        {booking.status === "CANCELLED" && booking.refundPending && (
                          <span className="action-btn action-btn--danger" title="Refund is being processed">Refund Pending</span>
                        )}
                      </div>

                      {booking.status === "PENDING_PAYMENT" && (
                        <div className="mt-2 small" style={{ color: vars.muted }}>
                          Awaiting payment. Complete payment to confirm your booking.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="glass text-center py-5">
            <div style={{ fontSize: 42, lineHeight: 1 }}>🔎</div>
            <h5 className="mt-2 fw-bold" style={{ color: vars.ink }}>No bookings match your filters</h5>
            <p className="muted small mb-3">Try changing status, dates, or search keywords.</p>
            <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>Clear Filters</button>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewOpen && previewBooking && (
        <div className="modal-mask" onClick={closePreview}>
          <div className="modal-card" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header d-flex justify-content-between align-items-center">
              <div className="fw-bold" style={{ color: vars.ink, fontSize: 18 }}>
                {previewBooking.car?.brand} {previewBooking.car?.model}
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={closePreview}>Close</button>
            </div>
            <div className="p-3">
              <div className="row g-3 align-items-stretch">
                <div className="col-12 col-md-6">
                  <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${vars.border}` }}>
                    <img
                      src={previewBooking.car?.imageUrl || previewBooking.car?.image || "https://via.placeholder.com/640x360?text=No+Image"}
                      alt="Preview"
                      style={{ width: "100%", height: 240, objectFit: "cover" }}
                    />
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="p-1">
                    <div className="muted small mb-1">Dates</div>
                    <div className="fw-semibold" style={{ color: vars.ink }}>
                      {fmt(previewBooking.startDate)} → {fmt(previewBooking.endDate)}
                    </div>

                    <div className="muted small mt-3 mb-1">Location</div>
                    <div style={{ color: vars.ink }}>{previewBooking.car?.location || "—"}</div>

                    <div className="muted small mt-3 mb-1">Registration</div>
                    <div style={{ color: vars.ink }}>{previewBooking.car?.registrationNumber || "—"}</div>

                    <div className="muted small mt-3 mb-1">Total</div>
                    <div className="fw-bold" style={{ color: vars.ink, fontSize: 20 }}>
                      ₹{previewBooking.totalPrice ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {canCancel(previewBooking.status, previewBooking.startDate) && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={()=>{ closePreview(); handleCancel(previewBooking); }}
                >
                  Cancel Booking
                </button>
              )}
              <button className="btn btn-outline-secondary btn-sm" onClick={closePreview}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
