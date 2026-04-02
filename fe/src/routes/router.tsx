/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "@routes/protected-route";
import LoginPage from "@pages/login/login-page";
import App from "@root/app/app";
import { useAuthStore } from "@root/store/auth-store";

const Dashboard = () => <div>Dashboard</div>;
const Forbidden = () => {
  const logout = useAuthStore((s) => s.logout);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: 16,
        fontFamily: "sans-serif",
      }}
    >
      <h1>403 – Forbidden</h1>
      <p>Bạn không có quyền truy cập vào trang này.</p>
      <button
        onClick={logout}
        style={{
          padding: "8px 16px",
          border: "none",
          borderRadius: 6,
          background: "#d32f2f",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Đăng xuất
      </button>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/forbidden", element: <Forbidden /> },
      {
        element: <ProtectedRoute roles={["user", "guest"]} />, // ví dụ
        children: [
          { path: "/", element: <Dashboard /> },
          // thêm các route bảo vệ khác ở đây
        ],
      },
    ],
  },
]);
