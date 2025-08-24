import { Link, useLocation } from "react-router-dom";

export default function Sidebar({ onLogout, isCollapsed, toggleSidebar }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="d-flex align-items-center justify-content-between">
          <div className={`logo-container ${isCollapsed ? 'd-none' : ''}`}>
            <img 
              src="/logo.png" 
              alt="Wheels & Motors" 
              className="logo-image"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="d-none">
              <div className="bg-white rounded p-2" style={{width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <i className="fas fa-car text-dark" style={{fontSize: '1.2rem'}}></i>
              </div>
            </div>
            <div>
              <div className="app-title">Admin Panel</div>
              <div className="app-subtitle">Management System</div>
            </div>
          </div>
          <button 
            className="btn btn-link text-white p-0 border-0" 
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>
      </div>
      
      <hr className="text-secondary mx-3" />
      
      <ul className="nav nav-pills flex-column mb-auto px-3">
        <li className="nav-item mb-2">
          <Link 
            to="/dashboard" 
            className={`nav-link d-flex align-items-center ${isActive('/dashboard') && location.pathname === '/dashboard' ? 'active' : ''}`}
            title="Dashboard"
          >
            <i className="fas fa-tachometer-alt me-2"></i>
            <span className={isCollapsed ? 'd-none' : ''}>Dashboard</span>
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link 
            to="/dashboard/users" 
            className={`nav-link d-flex align-items-center ${isActive('/dashboard/users') ? 'active' : ''}`}
            title="Manage Users"
          >
            <i className="fas fa-users me-2"></i>
            <span className={isCollapsed ? 'd-none' : ''}>Manage Users</span>
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link 
            to="/dashboard/vehicles" 
            className={`nav-link d-flex align-items-center ${isActive('/dashboard/vehicles') ? 'active' : ''}`}
            title="Manage Vehicles"
          >
            <i className="fas fa-car me-2"></i>
            <span className={isCollapsed ? 'd-none' : ''}>Manage Vehicles</span>
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link 
            to="/dashboard/vehicle-details" 
            className={`nav-link d-flex align-items-center ${isActive('/dashboard/vehicle-details') ? 'active' : ''}`}
            title="Vehicle Details"
          >
            <i className="fas fa-list-alt me-2"></i>
            <span className={isCollapsed ? 'd-none' : ''}>Vehicle Details</span>
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link 
            to="/dashboard/company" 
            className={`nav-link d-flex align-items-center ${isActive('/dashboard/company') ? 'active' : ''}`}
            title="Company Details"
          >
            <i className="fas fa-building me-2"></i>
            <span className={isCollapsed ? 'd-none' : ''}>Company Details</span>
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link 
            to="/dashboard/reports" 
            className={`nav-link d-flex align-items-center ${isActive('/dashboard/reports') ? 'active' : ''}`}
            title="Reports"
          >
            <i className="fas fa-chart-bar me-2"></i>
            <span className={isCollapsed ? 'd-none' : ''}>Reports</span>
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link 
            to="/dashboard/profile" 
            className={`nav-link d-flex align-items-center ${isActive('/dashboard/profile') ? 'active' : ''}`}
            title="Admin Profile"
          >
            <i className="fas fa-user-cog me-2"></i>
            <span className={isCollapsed ? 'd-none' : ''}>Profile</span>
          </Link>
        </li>
      </ul>
      
      <hr className="text-secondary mx-3" />
      <div className="px-3 pb-3">
        <button 
          onClick={onLogout} 
          className="btn btn-danger w-100 d-flex align-items-center justify-content-center"
          title="Logout"
        >
          <i className="fas fa-sign-out-alt me-2"></i>
          <span className={isCollapsed ? 'd-none' : ''}>Logout</span>
        </button>
      </div>
    </div>
  );
}
