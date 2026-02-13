// src/components/CarCard.jsx
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";

const CarCard = ({ car, startDate, endDate }) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const handleBook = () => {
    const query = new URLSearchParams();
    if (startDate) query.append("startDate", startDate);
    if (endDate) query.append("endDate", endDate);

    const path = `/book/${car.id}${query.toString() ? `?${query.toString()}` : ""}`;

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(path)}`);
    } else {
      navigate(path);
    }
  };

  return (
    <div
      className="car-card border rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 bg-white flex flex-col"
    >
      {/* Car Image */}
     <div className="h-40 bg-gray-100 overflow-hidden rounded-lg">
  <img
    src={
      car.imageUrl ||
      car.image ||
      "https://via.placeholder.com/300x180?text=No+Image"
    }
    alt={`${car.brand} ${car.model}`}
    className="w-full h-full object-cover transform transition duration-500 ease-in-out hover:scale-110"
    onError={(e) => {
      e.currentTarget.src =
        "https://via.placeholder.com/300x180?text=No+Image";
    }}
  />
</div>


      {/* Car Info */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold mb-1">
          {car.brand} {car.model}
        </h3>
        <p className="text-sm text-gray-600">Year: {car.year || "N/A"}</p>
        <p className="text-sm text-gray-600">Type: {car.carType || "N/A"}</p>
        <p className="text-sm text-gray-600 mb-2">Location: {car.location || "N/A"}</p>
        <p className="text-md font-semibold text-blue-600 mb-3">
          ₹{car.rentPerDay ?? 0}/day
        </p>

        {/* Availability Badge */}
        <span
          className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mb-3 ${
            car.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {car.available ? "Available" : "Unavailable"}
        </span>

        {/* Book Button */}
        <button
          onClick={handleBook}
          disabled={!car.available}
          className={`mt-auto w-full px-4 py-2 rounded-md font-medium transition ${
            car.available
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {car.available ? "Book Now" : "Not Available"}
        </button>
      </div>
    </div>
  );
};

export default CarCard;
