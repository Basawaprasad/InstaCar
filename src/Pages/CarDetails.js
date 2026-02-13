// src/Components/CarCard.js
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";

const CarCard = ({ car, disableBooking = false }) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const handleBook = () => {
    if (disableBooking) return;

    if (!user) {
      navigate(`/login?redirect=/book/${car.id}`);
    } else {
      navigate(`/book/${car.id}`);
    }
  };

  return (
    <div className="card shadow-sm h-100 border-0 car-hover">
      {/* Car Image */}
      <img
        src={car.imageUrl || car.image || "https://via.placeholder.com/300x180?text=No+Image"}
        alt={`${car.brand} ${car.model}`}
        className="card-img-top"
        style={{ height: "180px", objectFit: "cover" }}
      />

      {/* Card Body */}
      <div className="card-body d-flex flex-column">
        <h5 className="card-title fw-bold">{car.brand} {car.model}</h5>

        <ul className="list-unstyled small text-muted mb-3">
          <li>Year: <span className="fw-semibold">{car.year || "N/A"}</span></li>
          <li>Type: <span className="fw-semibold">{car.carType || "N/A"}</span></li>
          <li>Location: <span className="fw-semibold">{car.location || "N/A"}</span></li>
          <li>Price: <span className="fw-bold text-primary">₹{car.rentPerDay}</span>/day</li>
        </ul>

        {/* Availability Badge */}
        <span
          className={`badge mb-3 ${car.available ? "bg-success" : "bg-danger"}`}
          style={{ width: "fit-content" }}
        >
          {car.available ? "Available" : "Unavailable"}
        </span>

        {/* Book Button */}
        <button
          onClick={handleBook}
          disabled={disableBooking || !car.available}
          className={`btn mt-auto ${disableBooking || !car.available
            ? "btn-secondary disabled"
            : "btn-primary"
          }`}
        >
          {disableBooking ? "Booking Restricted" : "Book Now"}
        </button>
      </div>
    </div>
  );
};

export default CarCard;
