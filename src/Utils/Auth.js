import axios from "axios";

export const handleLogout = async (navigate) => {
  try {
    await axios.post(
      "http://localhost:8080/logout",
      null,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
      }
    );
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    // Remove all user/session data
    localStorage.removeItem("jwt");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("user");

    // Redirect to login page
    navigate("/login");
  }
};
