// src/Pages/HomePage.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../Utils/axiosInstance";
import Footer from "../Components/Footer";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import "../Pages/BackgroundImg";
import bgImage from "../logo.svg";
import BackgroundImg from "../Pages/BackgroundImg";

function HomePage() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const navigate = useNavigate();

  // Advanced filter state (unchanged behaviour)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advBrand, setAdvBrand] = useState("");
  const [advLocation, setAdvLocation] = useState("");
  const [advCarType, setAdvCarType] = useState("");
  const [advMinPrice, setAdvMinPrice] = useState("");
  const [advMaxPrice, setAdvMaxPrice] = useState("");
  const [advYear, setAdvYear] = useState("");
  const [advAvailable, setAdvAvailable] = useState(true);
  const [advLoading, setAdvLoading] = useState(false);

  // Presentation: read theme set elsewhere (Navbar/Profile toggle)
  const [theme, setTheme] = useState(
    () => localStorage.getItem("uiTheme") || "light"
  );
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "uiTheme") {
        setTheme(e.newValue || "light");
      }
    };
    window.addEventListener("storage", onStorage);

    // small poll to catch same-tab updates that may not emit storage event
    const interval = setInterval(() => {
      const t = localStorage.getItem("uiTheme") || "light";
      if (t !== theme) setTheme(t);
    }, 500);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = document.getElementById("homeCarousel");
    if (!el || !window.bootstrap) return;

    const bs = window.bootstrap;
    const carousel =
      bs.Carousel.getInstance(el) ||
      new bs.Carousel(el, {
        interval: 100, // ms, change as needed (1000 = 1s)
        ride: true,
      });

    // start auto-slide once when component mounts
    carousel.cycle();

    const stopAutoOnNav = (e) => {
      carousel.pause();
      // optional: remove attribute so nothing restarts it automatically
      el.removeAttribute("data-bs-ride");
    };

    const prevBtn = el.querySelector(".carousel-control-prev");
    const nextBtn = el.querySelector(".carousel-control-next");

    prevBtn?.addEventListener("click", stopAutoOnNav);
    nextBtn?.addEventListener("click", stopAutoOnNav);

    return () => {
      prevBtn?.removeEventListener("click", stopAutoOnNav);
      nextBtn?.removeEventListener("click", stopAutoOnNav);
    };
  }, []);

  // ensure body background follows theme so left/right edges are consistent
  useEffect(() => {
    const darkBg = "#0b1220";
    const lightBg = "#ffffff";
    const prev = document.body.style.background;
    document.body.style.background = theme === "dark" ? darkBg : lightBg;
    document.body.style.transition = "background-color 240ms ease";

    return () => {
      // restore if necessary - leave to light by default
      document.body.style.background = prev || "";
    };
  }, [theme]);

  // useEffect(() => {
  //   const fetchCars = async () => {
  //     setLoading(true);
  //     try {
  //       const response = await axiosInstance.get("/getcars/available");
  //       setCars(
  //         Array.isArray(response.data)
  //           ? response.data
  //           : response.data.cars || []
  //       );
  //       setError("");
  //     } catch (err) {
  //       console.error("Failed to load cars:", err);
  //       setError("Failed to load cars. Please try again later.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchCars();
  // }, []);

  useEffect(() => {
    const fetchCars = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get("/getcars/getallcars");
        setCars(
          Array.isArray(response.data)
            ? response.data
            : response.data.cars || []
        );
        setError("");
      } catch (err) {
        console.error("Failed to load cars:", err);
        setError("Failed to load cars. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchCars();
  }, []);

  const handleBookNow = (carId) => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      navigate(`/login?redirect=${encodeURIComponent(`/book/${carId}`)}`);
    } else {
      navigate(`/book/${carId}`);
    }
  };

  const TYPE_MAP = {
    sedan: "Sedan",
    saloon: "Sedan",
    "4-door": "Sedan",
    hatch: "Hatchback",
    hatchback: "Hatchback",
    hetch: "Hatchback",
    "hatch-back": "Hatchback",
    suv: "SUV",
    crossover: "SUV",
    "sport-utility": "SUV",
    mpv: "MPV",
    van: "MPV",
    minivan: "MPV",
    coupe: "Coupe",
    convertible: "Coupe",
    truck: "Truck",
    pickup: "Truck",
  };

  const normalizeType = (raw) => {
    if (!raw && raw !== 0) return "Other";
    const s = String(raw).trim().toLowerCase();
    if (TYPE_MAP[s]) return TYPE_MAP[s];
    for (const key of Object.keys(TYPE_MAP)) {
      if (s.includes(key)) return TYPE_MAP[key];
    }
    if (s.length > 0 && s.length <= 20) {
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    return "Other";
  };

  const typesWithCounts = useMemo(() => {
    const counts = new Map();
    (cars || []).forEach((c) => {
      const t = normalizeType(c?.carType || "");
      counts.set(t, (counts.get(t) || 0) + 1);
    });
    const preferredTabs = ["All", "Hatchback", "Sedan", "SUV"];
    const rest = Array.from(counts.keys())
      .filter((k) => !preferredTabs.includes(k))
      .sort();
    const final = [
      ...preferredTabs.filter((p) => p === "All" || counts.has(p)),
      ...rest,
    ];
    return final.map((t) => ({
      type: t,
      count: t === "All" ? cars.length : counts.get(t),
    }));
  }, [cars]);

  const filteredCars = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    return (cars || []).filter((car) => {
      const norm = normalizeType(car?.carType || "");
      if (filterType && filterType !== "All" && norm !== filterType)
        return false;
      if (!q) return true;
      return (
        (car.brand || "").toLowerCase().includes(q) ||
        (car.model || "").toLowerCase().includes(q) ||
        (car.carType || "").toLowerCase().includes(q) ||
        (car.location || "").toLowerCase().includes(q) ||
        (car.year || "").toString().includes(q)
      );
    });
  }, [cars, search, filterType]);

  const handleImageError = (e, fallbackPath) => {
    try {
      if (e?.currentTarget && e.currentTarget.dataset?.errored !== "true") {
        e.currentTarget.dataset.errored = "true";
        e.currentTarget.src = `${process.env.PUBLIC_URL}/${fallbackPath}`;
      }
    } catch (ignored) {}
  };

  const applySimpleFilter = async () => {
    setAdvLoading(true);
    try {
      const params = {};
      if (advLocation) params.location = advLocation;
      if (advCarType) params.carType = advCarType;
      if (advMinPrice) params.minPrice = Number(advMinPrice);
      if (advMaxPrice) params.maxPrice = Number(advMaxPrice);

      const resp = await axiosInstance.get("/getcars/filter", { params });
      setCars(Array.isArray(resp.data) ? resp.data : resp.data.cars || []);
    } catch (err) {
      console.error("Simple filter failed:", err);
      alert("Failed to apply simple filter. See console.");
    } finally {
      setAdvLoading(false);
    }
  };

  const applyAdvancedFilter = async (
    page = 0,
    size = 24,
    sortBy = "id",
    sortDir = "asc"
  ) => {
    setAdvLoading(true);
    try {
      const params = {};
      if (advBrand) params.brand = advBrand;
      if (advLocation) params.location = advLocation;
      if (advCarType) params.carType = advCarType;
      if (advMinPrice) params.minPrice = Number(advMinPrice);
      if (advMaxPrice) params.maxPrice = Number(advMaxPrice);
      if (advYear) params.year = Number(advYear);
      params.available = advAvailable;
      params.page = page;
      params.size = size;
      params.sortBy = sortBy;
      params.sortDir = sortDir;

      const resp = await axiosInstance.get("/getcars/advanced-filter", {
        params,
      });
      const data = resp.data;
      const content = data?.content ?? (Array.isArray(data) ? data : []);
      setCars(content);
    } catch (err) {
      console.error("Advanced filter failed:", err);
      alert("Failed to apply advanced filter. See console.");
    } finally {
      setAdvLoading(false);
    }
  };
  // inside your component
  const pauseCarousel = () => {
    const el = document.getElementById("homeCarousel");
    if (!el || !window.bootstrap) return;
    const inst = window.bootstrap.Carousel.getInstance(el);
    if (inst) inst.pause();
  };
  const resetFiltersAndReload = async () => {
    setAdvBrand("");
    setAdvLocation("");
    setAdvCarType("");
    setAdvMinPrice("");
    setAdvMaxPrice("");
    setAdvYear("");
    setAdvAvailable(true);
    setSearch("");
    setFilterType("All");
    setShowAdvanced(false);
    setLoading(true);
    try {
      const res = await axiosInstance.get("/getcars/available");
      setCars(Array.isArray(res.data) ? res.data : res.data.cars || []);
    } catch (err) {
      console.error("Reload failed:", err);
      setError("Failed to load cars after reset.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container text-center my-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3">Loading Cars...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container text-center my-5">
        <h5 className="text-danger">{error}</h5>
      </div>
    );
  }

  // Inline UI styles (visual only)
  const styles = {
    pageWrapper: { width: "100%", paddingTop: 18, paddingBottom: 48 },
    innerContainer: {
      maxWidth: "1200px",
      margin: "0 auto",
      paddingLeft: 24,
      paddingRight: 24,
    },
    carouselCaption: {
      textShadow: "none",
      background: "rgba(0,0,0,0.22)",
      padding: ".5rem",
      borderRadius: ".25rem",
    },
    headerRow: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "1rem",
      justifyContent: "space-between",
    },
    searchContainer: { maxWidth: 520, marginLeft: "1rem" },
    pillInput: {
      border: 0,
      paddingLeft: ".6rem",
      height: 46,
      fontSize: "1rem",
      background: "transparent",
    },
    pillGroup: {
      borderRadius: 999,
      overflow: "hidden",
      boxShadow: "0 6px 18px rgba(20,20,20,0.06)",
    },
    cardImageBox: {
      height: 200,
      overflow: "hidden",
      background: "var(--surface, #f8f9fa)",
    },
    cardImage: { objectFit: "cover", height: "100%", width: "100%" },
    cardBox: { borderRadius: 12, border: "0", overflow: "hidden" },

    // advanced filter visuals
    advCard: {
      borderRadius: 12,
      boxShadow: "0 8px 22px rgba(2,6,23,0.04)",
      border: "1px solid rgba(0,0,0,0.04)",
    },
    advLabel: { fontSize: 13, fontWeight: 600, color: "#333" },
    advInput: {
      borderRadius: 10,
      border: "1px solid #e6e6e6",
      padding: ".6rem .75rem",
    },
    advSmallInput: {
      borderRadius: 8,
      border: "1px solid #e6e6e6",
      padding: ".45rem .5rem",
      textAlign: "center",
    },
    advActions: { display: "flex", gap: 10, alignItems: "center" },
    advApplyBtn: { borderRadius: 10, padding: ".45rem .9rem" },
  };

  // theme variables
  const darkVars = {
  "--bg": "#0f172a",              // deep slate
  "--card-bg": "#111827",         // dark card
  "--surface": "#020617",
  "--text": "#e5e7eb",            // soft white
  "--muted": "#9ca3af",           // muted gray
  "--accent": "#3b82f6",          // professional blue
  "--pill": "#111827",
  "--input-bg": "#020617",
  "--badge-available-bg": "#dcfce7",
  "--badge-available": "#166534",
};


 const lightVars = {
  "--bg": "#f8fafc",              // light slate
  "--card-bg": "#ffffff",
  "--surface": "#f1f5f9",
  "--text": "#0f172a",            // slate-900
  "--muted": "#64748b",           // slate-500
  "--accent": "#2563eb",          // professional blue
  "--pill": "#ffffff",
  "--input-bg": "#ffffff",
  "--badge-available-bg": "#dcfce7",
  "--badge-available": "#166534",
};


  const activeVars = theme === "dark" ? darkVars : lightVars;

  // limit to 8 cars (2 rows if 4 per row)
  const carsToShow = showAll ? filteredCars : filteredCars.slice(0, 8);

  return (
    // full width page wrapper uses theme background so edges are dark too
    <div
      className="page-bg"
      style={{
        background: activeVars["--bg"],
        width: "100%",
        minHeight: "100vh",
        paddingTop: 16,
        paddingBottom: 48,
        transition: "background-color 240ms ease",
      }}
    >
      {/* theme CSS injection for inner elements (visual only) */}
      <style>{`
        :root { ${Object.entries(activeVars)
          .map(([k, v]) => `${k}: ${v};`)
          .join("\n")} }

        .card-theme { background: var(--card-bg); color: var(--text); transition: background-color .2s ease, color .2s ease; }
        .muted-theme { color: var(--muted) !important; }
        .search-pill { background: var(--pill); border-radius: 999px; box-shadow: 0 8px 30px rgba(2,6,23,0.06); border: none; }
        .input-theme { background: var(--input-bg); color: var(--text); border: 1px solid rgba(255,255,255,0.02); }
        .badge-available-theme { background: var(--badge-available-bg); color: var(--badge-available); font-weight: 600; }
        .badge-unavailable-theme { background: #fee2e2; color: #7f1d1d; font-weight: 600; }
      `}</style>

      {/* center content container (transparent so full page bg shows) */}
      <div style={styles.innerContainer}>
        {/* Carousel */}

        <div
          id="homeCarousel"
          className="carousel slide mb-5 rounded shadow-sm card-theme"
          data-bs-ride="carousel"
          data-bs-interval="3000" // auto-slide every 3 sec
          style={{ position: "relative", zIndex: 0 }}
        >
          <div className="carousel-inner rounded">
            {/* Slide 1 */}
            <div className="carousel-item active">
              <img
                src="https://indiatourtaxi.com/assets/images/sections/ertiga-car-on-rent-in-delhi.webp"
                alt="Luxury Car"
                className="d-block w-100"
                style={{ height: "500px", objectFit: "cover" }} // reduced height
              />
              <div className="carousel-caption d-none d-md-block">
                <h5>Luxury Cars</h5>
                <p>Book premium cars for your journeys.</p>
              </div>
            </div>

            {/* Slide 2 */}
            <div className="carousel-item">
              <img
                src="https://www.v3cars.com/media/model-imgs/1674211375-bmw-x7-facelift.webp"
                alt="Easy Rentals"
                className="d-block w-100"
                style={{ height: "500px", objectFit: "cover" }}
              />
              <div className="carousel-caption d-none d-md-block">
                <h5>Easy Rentals</h5>
                <p>Quick booking, hassle-free process.</p>
              </div>
            </div>

            {/* Slide 3 */}
            <div className="carousel-item">
              <img
                src="https://selfdrives.in/backend/images/car_gallery/1630319864.png"
                alt="Explore Anywhere"
                className="d-block w-100"
                style={{ height: "500px", objectFit: "cover" }}
              />
              <div className="carousel-caption d-none d-md-block">
                <h5>Explore Anywhere</h5>
                <p>Your ride, your freedom.</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target="#homeCarousel"
            data-bs-slide="prev"
            onClick={pauseCarousel}
          >
            <span
              className="carousel-control-prev-icon"
              aria-hidden="true"
            ></span>
            <span className="visually-hidden">Previous</span>
          </button>

          <button
            className="carousel-control-next"
            type="button"
            data-bs-target="#homeCarousel"
            data-bs-slide="next"
            onClick={pauseCarousel}
          >
            <span
              className="carousel-control-next-icon"
              aria-hidden="true"
            ></span>
            <span className="visually-hidden">Next</span>
          </button>
        </div>

        {/* Header: title + tabs + search */}
        <div style={styles.headerRow} className="mb-4">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {/* <h2 className="mb-0 fw-bold" style={{ color: activeVars["--text"] }}>Available Cars</h2> */}

            <div
              className="btn-group"
              role="group"
              aria-label="Car type filter"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              {["All", "Hatchback", "Sedan", "SUV"].map((tab) => {
                const entry = typesWithCounts.find((t) => t.type === tab);
                if (!entry) return null;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterType(tab)}
                    className={`btn ${
                      filterType === tab ? "btn-primary" : "btn-outline-primary"
                    } pill-button`}
                    aria-pressed={filterType === tab}
                  >
                    {tab}{" "}
                    <span
                      className="badge bg-white text-dark ms-2"
                      style={{ fontWeight: 600 }}
                    >
                      {entry.count}
                    </span>
                  </button>
                );
              })}

              {typesWithCounts
                .filter(
                  (t) => !["All", "Hatchback", "Sedan", "SUV"].includes(t.type)
                )
                .map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setFilterType(t.type)}
                    className={`btn ${
                      filterType === t.type
                        ? "btn-primary"
                        : "btn-outline-primary"
                    } pill-button`}
                  >
                    {t.type}{" "}
                    <span className="badge bg-white text-dark ms-2">
                      {t.count}
                    </span>
                  </button>
                ))}
            </div>
          </div>

          {/* Search pill */}
          <div style={styles.searchContainer} className="ms-lg-4">
            <div className="input-group input-group-lg search-pill">
              <span
                className="input-group-text bg-white border-0"
                style={{
                  borderTopLeftRadius: 999,
                  borderBottomLeftRadius: 999,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-muted"
                  aria-hidden="true"
                >
                  <path
                    d="M21 21l-4.35-4.35"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="11"
                    cy="11"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <input
                type="text"
                className="form-control input-theme"
                placeholder="Search brand, model, type, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search cars"
                style={styles.pillInput}
              />

              <div className="input-group-append">
                <button
                  className="btn btn-light border-0"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  style={{
                    borderTopRightRadius: 999,
                    borderBottomRightRadius: 999,
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filter toggle + panel */}
        <div className="mb-4 d-flex gap-2 align-items-center">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => setShowAdvanced((s) => !s)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? "Hide Advanced Filters" : "Show Advanced Filters"}
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={resetFiltersAndReload}
          >
            Reset Filters
          </button>
        </div>

        {showAdvanced && (
          <div className="card mb-4 p-3 card-theme" style={styles.advCard}>
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-3">
                <label className="form-label mb-1" style={styles.advLabel}>
                  Brand
                </label>
                <input
                  value={advBrand}
                  onChange={(e) => setAdvBrand(e.target.value)}
                  className="form-control adv-input"
                  placeholder="e.g. Toyota"
                  style={styles.advInput}
                />
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label mb-1" style={styles.advLabel}>
                  Location
                </label>
                <input
                  value={advLocation}
                  onChange={(e) => setAdvLocation(e.target.value)}
                  className="form-control adv-input"
                  placeholder="City or area"
                  style={styles.advInput}
                />
              </div>

              <div className="col-12 col-md-2">
                <label className="form-label mb-1" style={styles.advLabel}>
                  Type
                </label>
                <input
                  value={advCarType}
                  onChange={(e) => setAdvCarType(e.target.value)}
                  className="form-control adv-input"
                  placeholder="Sedan, Hatch"
                  style={styles.advInput}
                />
              </div>

              <div className="col-6 col-md-1">
                <label className="form-label mb-1" style={styles.advLabel}>
                  Min ₹
                </label>
                <input
                  value={advMinPrice}
                  onChange={(e) => setAdvMinPrice(e.target.value)}
                  className="form-control adv-input text-center"
                  type="number"
                  style={styles.advSmallInput}
                  placeholder="0"
                />
              </div>

              <div className="col-6 col-md-1">
                <label className="form-label mb-1" style={styles.advLabel}>
                  Max ₹
                </label>
                <input
                  value={advMaxPrice}
                  onChange={(e) => setAdvMaxPrice(e.target.value)}
                  className="form-control adv-input text-center"
                  type="number"
                  style={styles.advSmallInput}
                  placeholder="0"
                />
              </div>

              <div className="col-6 col-md-1">
                <label className="form-label mb-1" style={styles.advLabel}>
                  Year
                </label>
                <input
                  value={advYear}
                  onChange={(e) => setAdvYear(e.target.value)}
                  className="form-control adv-input text-center"
                  type="number"
                  style={styles.advSmallInput}
                  placeholder="yyyy"
                />
              </div>

              <div className="col-6 col-md-1 d-flex align-items-center justify-content-center">
                <div className="form-check form-switch d-flex align-items-center gap-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={advAvailable}
                    onChange={(e) => setAdvAvailable(e.target.checked)}
                    id="advAvailable"
                    style={{ width: 42, height: 24 }}
                  />
                  <label
                    className="form-check-label small muted-theme"
                    htmlFor="advAvailable"
                  >
                    Only available
                  </label>
                </div>
              </div>

              <div
                className="col-12 d-flex flex-wrap gap-2"
                style={styles.advActions}
              >
                <button
                  className="btn btn-primary"
                  onClick={() => applyAdvancedFilter()}
                  disabled={advLoading}
                  style={styles.advApplyBtn}
                >
                  {advLoading ? "Applying..." : "Apply Advanced Filter"}
                </button>

                <button
                  className="btn btn-outline-primary"
                  onClick={applySimpleFilter}
                  disabled={advLoading}
                  style={{ ...styles.advApplyBtn, background: "#fff" }}
                >
                  {advLoading ? "Applying..." : "Apply Simple Filter"}
                </button>

                <button
                  className="btn btn-light"
                  onClick={resetFiltersAndReload}
                  style={{
                    ...styles.advApplyBtn,
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  Clear & Reload
                </button>
              </div>
            </div>
          </div>
        )}

        {/* cars grid */}
        {/* {filteredCars.length === 0 ? (
          <p className="text-center text-muted">No matching cars found.</p>
        ) : (
          <div className="row g-4">
            {filteredCars.map((car) => (
              <div key={car.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <div
                  className="card h-100 shadow-sm card-theme"
                  style={styles.cardBox}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={styles.cardImageBox}>
                    <img
                      src={car.imageUrl || car.image || "https://via.placeholder.com/300x200?text=No+Image"}
                      alt={`${car.brand || "Car"} ${car.model || ""}`}
                      className="w-100 h-100"
                      style={styles.cardImage}
                      onError={(e) => handleImageError(e, "car-placeholder.jpg")}
                    />
                  </div>

                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title fw-bold mb-1" style={{ color: activeVars["--text"] }}>{car.brand || "Unknown"} {car.model || ""}</h5>
                    <p className="text-muted small mb-3 muted-theme">{normalizeType(car.carType || "")} · {car.location || "N/A"}</p>

                    <div className="mt-auto d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold text-primary">₹{car.rentPerDay || "0"}/day</div>
                        <span className={`${car.available ? "badge-available-theme" : "badge-unavailable-theme"}`} style={{ padding: ".25rem .6rem", borderRadius: 999 }}>
                          {car.available ? "Available" : "Unavailable"}
                        </span>
                      </div>

                      <div>
                        {car.available ? (
                          <button className="btn btn-sm btn-primary rounded-pill px-3" onClick={() => handleBookNow(car.id)}>Book</button>
                        ) : (
                          <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" disabled>Unavailable</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )} */}

        {filteredCars.length === 0 ? (
          <p className="text-center text-muted">No matching cars found.</p>
        ) : (
          <>
            <BackgroundImg imageUrl={bgImage}>
              <div className="row g-4">
                {carsToShow.map((car) => (
                  <div
                    key={car.id}
                    className="col-12 col-sm-6 col-md-4 col-lg-3"
                  >
                    <div
                      className="card h-100 shadow-sm card-theme"
                      style={styles.cardBox}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-6px)";
                        e.currentTarget.style.boxShadow =
                          "0 12px 30px rgba(0,0,0,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {/* Image */}
                      <div style={styles.cardImageBox}>
                        <img
                          src={
                            car.imageUrl ||
                            car.image ||
                            "https://via.placeholder.com/300x200?text=No+Image"
                          }
                          alt={`${car.brand || "Car"} ${car.model || ""}`}
                          className="w-100 h-100"
                          style={styles.cardImage}
                          onError={(e) =>
                            handleImageError(e, "car-placeholder.jpg")
                          }
                        />
                      </div>

                      {/* Body */}
                      <div className="card-body d-flex flex-column">
                        <h5
                          className="card-title fw-bold mb-1"
                          style={{ color: activeVars["--text"] }}
                        >
                          {car.brand || "Unknown"} {car.model || ""}
                        </h5>
                        <p className="text-muted small mb-3 muted-theme">
                          {normalizeType(car.carType || "")} ·{" "}
                          {car.location || "N/A"}
                        </p>

                        <div className="mt-auto d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-bold text-primary">
                              ₹{car.rentPerDay || "0"}/day
                            </div>
                            <span
                              className={`${
                                car.available
                                  ? "badge-available-theme"
                                  : "badge-unavailable-theme"
                              }`}
                              style={{
                                padding: ".25rem .6rem",
                                borderRadius: 999,
                              }}
                            >
                              {car.available ? "Available" : "Unavailable"}
                            </span>
                          </div>

                          <div>
                            {car.available ? (
                              <button
                                className="btn btn-sm btn-primary rounded-pill px-3"
                                onClick={() => handleBookNow(car.id)}
                              >
                                Book
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                                disabled
                              >
                                Unavailable
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* View More / Less Button */}
              {filteredCars.length > 8 && (
                <div className="text-center mt-4">
                  <button
                    className="btn btn-outline-primary rounded-pill px-4"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? "View Less" : "View More"}
                  </button>
                </div>
              )}
            </BackgroundImg>
          </>
        )}
      </div>
    </div>
  );
}

export default HomePage;
