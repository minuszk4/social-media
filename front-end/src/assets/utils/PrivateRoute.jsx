import React from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("user_id");

  return token && userId ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
