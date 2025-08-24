import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('adminSession');
    window.location.href = "/login";
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="d-flex dashboard-container">
      <Sidebar 
        onLogout={handleLogout} 
        isCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
      />
      <div className="flex-grow-1 bg-light min-vh-100 main-content">
        <div className="p-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
