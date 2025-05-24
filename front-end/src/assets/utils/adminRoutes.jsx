import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(null); // null = loading
  const token = localStorage.getItem("token");

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/admin/check", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        if (data.isAdmin === true) setIsAdmin(true);
        else setIsAdmin(false);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [token]);

  if (isAdmin === null) return <p>Đang kiểm tra quyền truy cập...</p>;
  if (isAdmin === false) return <Navigate to="/home" replace />;
  return children;
};

export default AdminRoute;
