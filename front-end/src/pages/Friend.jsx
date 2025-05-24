import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import LeftSidebar from "../assets/components/LeftSidebar";
import Avatar from "../assets/components/Avatar";
import "../assets/css/FriendList.css";

const FriendRequests = () => {
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [viewMode, setViewMode] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user_id } = useAppContext();
  const navigate = useNavigate();

  const fetchData = useCallback(async (endpoint, setter) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/friends/${endpoint}?user_id=${user_id}&page=${page}&pageSize=5`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      if (endpoint === "requests") {
        setFriendRequests(data.requests || []);
      } else {
        setFriends(data.friends || []);
      }
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
    }
  }, [user_id, page]);

  useEffect(() => {
    if (viewMode === "requests") {
      fetchData("requests", setFriendRequests);
    } else if (viewMode === "friends") {
      fetchData("list", setFriends);
    }
  }, [fetchData, viewMode, page]);

  const handleRequest = useCallback(async (requestId, action) => {
    try {
      const response = await fetch(`http://localhost:5000/api/friends/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ user_id: requestId }),
      });
      if (!response.ok) throw new Error("Request failed");
      fetchData("requests", setFriendRequests);
      if (action === "accept") fetchData("list", setFriends);
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
    }
  }, [fetchData]);

  const renderPagination = () => (
    <div className="pagination">
      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
        Trang trước
      </button>
      <span>Trang {page} / {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
        Trang sau
      </button>
    </div>
  );

  const renderTable = (data, isRequests) => (
    <>
      <table>
        <thead>
          <tr>
            <th>Tên</th>
            {isRequests && <th>Hành động</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.user_id}>
              <td>
                <Avatar
                  userId={item.user_id}
                  onProfile={() => navigate(`/profile/${item.user_id}`)}
                />
              </td>
              {isRequests && (
                <td>
                  <button onClick={() => handleRequest(item.user_id, "accept")}>
                    Chấp nhận
                  </button>
                  <button onClick={() => handleRequest(item.user_id, "reject")}>
                    Từ chối
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {renderPagination()}
    </>
  );

  return (
    <div className="friend-requests-container">
      <LeftSidebar />
      <main className="fr-main-content">
        <h2>Quản lý bạn bè</h2>

        <div className="toggle-buttons">
          <button
            onClick={() => {
              setViewMode(viewMode === "requests" ? null : "requests");
              setPage(1);
            }}
            className={viewMode === "requests" ? "active" : "unactive"}
          >
            {viewMode === "requests" ? "Ẩn Lời mời" : "Xem Lời mời"}
          </button>
          <button
            onClick={() => {
              setViewMode(viewMode === "friends" ? null : "friends");
              setPage(1);
            }}
            className={viewMode === "friends" ? "active" : "unactive"}
          >
            {viewMode === "friends" ? "Ẩn Bạn bè" : "Xem Bạn bè"}
          </button>
        </div>

        {viewMode === "requests" && (
          <section>
            <h3>Lời mời kết bạn</h3>
            {friendRequests.length
              ? renderTable(friendRequests, true)
              : <p>Không có lời mời kết bạn.</p>}
          </section>
        )}

        {viewMode === "friends" && (
          <section>
            <h3>Danh sách bạn bè</h3>
            {friends.length
              ? renderTable(friends, false)
              : <p>Bạn chưa có bạn bè nào.</p>}
          </section>
        )}
      </main>
    </div>
  );
};

export default FriendRequests;
