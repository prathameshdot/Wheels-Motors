import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Vehicles from "./pages/Vehicles";
import CompanyDetails from "./pages/CompanyDetails";
import Reports from "./pages/Reports";
import VehicleDetails from "./pages/VehicleDetails";
import DashboardHome from "./pages/DashboardHome";
import AdminProfile from "./pages/AdminProfile";
import { SuperAdminOnly } from "./components/ProtectedRoute";
import "./styles/theme.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <SuperAdminOnly>
            <Dashboard />
          </SuperAdminOnly>
        }>
          <Route index element={<DashboardHome />} />
          <Route path="users" element={<Users />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="vehicle-details" element={<VehicleDetails />} />
          <Route path="company" element={<CompanyDetails />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
