// src/Components/CarFilter.jsx
import React, { useEffect, useState } from "react";

/**
 * Props:
 *  - onApply(filters) => called when user applies filters (filters = { location, carType, minPrice, maxPrice, search })
 *  - initialTypes: array of strings (optional)
 *  - initialLocations: array of strings (optional)
 */
export default function CarFilter({ onApply, initialTypes = [], initialLocations = [] }) {
  const [carType, setCarType] = useState("All");
  const [location, setLocation] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");

  // Build combined filters and call onApply
  const apply = () => {
    onApply({
      carType: carType === "All" ? null : carType,
      location: location === "All" ? null : location,
      minPrice: minPrice ? Number(minPrice) : null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      search: search?.trim() || null,
    });
  };

  const clearAll = () => {
    setCarType("All");
    setLocation("All");
    setMinPrice("");
    setMaxPrice("");
    setSearch("");
    onApply({ carType: null, location: null, minPrice: null, maxPrice: null, search: null });
  };

  return (
    <div className="d-flex flex-column flex-md-row gap-2 gap-md-3 align-items-start align-items-md-center mb-4">
      <div className="d-flex gap-2">
        <select className="form-select form-select-sm" value={carType} onChange={(e) => setCarType(e.target.value)}>
          <option value="All">All types</option>
          {initialTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select className="form-select form-select-sm" value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="All">All locations</option>
          {initialLocations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <input
          type="number"
          className="form-control form-control-sm"
          placeholder="Min ₹"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          type="number"
          className="form-control form-control-sm"
          placeholder="Max ₹"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>

      <div className="input-group input-group-sm ms-md-auto" style={{ maxWidth: 360 }}>
        <input
          type="search"
          className="form-control form-control-sm"
          placeholder="Search brand / model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-outline-secondary btn-sm" onClick={() => apply()}>Apply</button>
        <button className="btn btn-outline-danger btn-sm" onClick={clearAll}>Clear</button>
      </div>
    </div>
  );
}
