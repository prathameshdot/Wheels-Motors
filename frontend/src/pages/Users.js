import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import emailjs from '@emailjs/browser';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Add User Form
  const [addForm, setAddForm] = useState({
    email: "",
    password: "",
    phone: "",
    status: "active",
    role: "user",
    access_days: ""
  });

  // Edit User Form
  const [editForm, setEditForm] = useState({
    id: "",
    email: "",
    phone: "",
    status: "active",
    role: "user",
    access_days: ""
  });

  useEffect(() => {
    fetchUsers();
    checkExpiredUsers();
  }, []);

  async function checkExpiredUsers() {
    try {
      const { data: expiredUsers, error } = await supabase
        .from("users")
        .select("id")
        .lt("expiry_date", new Date().toISOString())
        .eq("status", "active");

      if (error) throw error;

      if (expiredUsers && expiredUsers.length > 0) {
        const { error: updateError } = await supabase
          .from("users")
          .update({ status: "inactive" })
          .in("id", expiredUsers.map(user => user.id));

        if (updateError) throw updateError;
        console.log(`Auto-blocked ${expiredUsers.length} expired users`);
      }
    } catch (error) {
      console.error("Error checking expired users:", error);
    }
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Error fetching users: " + error.message);
    }
    setLoading(false);
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: addForm.email,
        password: addForm.password,
        email_confirm: true
      });

      if (authError) throw authError;

      // Add user details to users table
      const expiryDate = addForm.access_days ? 
        new Date(Date.now() + parseInt(addForm.access_days) * 24 * 60 * 60 * 1000).toISOString() : 
        null;
        
      const { error: dbError } = await supabase
        .from("users")
        .insert([{
          id: authData.user.id,
          email: addForm.email,
          phone: addForm.phone,
          status: addForm.status,
          role: addForm.role,
          access_days: parseInt(addForm.access_days) || null,
          expiry_date: expiryDate
        }]);

      if (dbError) throw dbError;

      // Send email with credentials
      try {
        await emailjs.send(
          'service_0zzn02b',
          'template_user_credentials',
          {
            to_email: addForm.email,
            user_name: addForm.email,
            user_email: addForm.email,
            user_password: addForm.password,
            app_name: "Wheels & Motors Admin"
          },
          'YOUR_PUBLIC_KEY'
        );
      } catch (emailError) {
        console.warn("Email sending failed:", emailError);
      }

      // Reset form and refresh users
      setAddForm({
        email: "",
        password: "",
        phone: "",
        status: "active",
        role: "user",
        access_days: ""
      });
      setShowAddModal(false);
      fetchUsers();
      alert("User added successfully!");
    } catch (error) {
      console.error("Error adding user:", error);
      alert("Error adding user: " + error.message);
    }
    setLoading(false);
  }

  async function handleEditUser(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const expiryDate = editForm.access_days ? 
        new Date(Date.now() + parseInt(editForm.access_days) * 24 * 60 * 60 * 1000).toISOString() : 
        null;
        
      const { error } = await supabase
        .from("users")
        .update({
          phone: editForm.phone,
          status: editForm.status,
          role: editForm.role,
          access_days: parseInt(editForm.access_days) || null,
          expiry_date: expiryDate
        })
        .eq("id", editForm.id);

      if (error) throw error;

      setShowEditModal(false);
      fetchUsers();
      alert("User updated successfully!");
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error updating user: " + error.message);
    }
    setLoading(false);
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      fetchUsers();
      alert("User deleted successfully!");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error deleting user: " + error.message);
    }
    setLoading(false);
  }

  function openEditModal(user) {
    setEditForm({
      id: user.id,
      email: user.email,
      phone: user.phone || "",
      status: user.status || "active",
      role: user.role || "user",
      access_days: user.access_days || ""
    });
    setShowEditModal(true);
  }

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);
    
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h2 mb-2 text-gradient">
            <i className="fas fa-users me-2"></i>Manage Users
          </h1>
          <p className="text-muted mb-0">Create and manage user accounts with access control</p>
        </div>
        <button 
          className="btn btn-primary futuristic-border"
          onClick={() => setShowAddModal(true)}
        >
          <i className="fas fa-user-plus me-2"></i>Add New User
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="card mb-4 futuristic-border">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-8">
              <div className="search-container">
                <i className="fas fa-search search-icon"></i>
                <input
                  type="text"
                  className="form-control search-input"
                  placeholder="Search by email or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Users</option>
                <option value="active">Active Users</option>
                <option value="inactive">Inactive Users</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card futuristic-border">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-table me-2"></i>Users List ({filteredUsers.length})
          </h5>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border spinner-border-lg" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Access Days</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-circle me-3">
                            <i className="fas fa-user"></i>
                          </div>
                          <div>
                            <div className="fw-bold">{user.email}</div>
                            <small className="text-muted">ID: {user.id.substring(0, 8)}...</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <i className="fas fa-phone me-1"></i>{user.phone || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {user.access_days ? `${user.access_days} days` : 'Unlimited'}
                        </span>
                      </td>
                      <td>
                        {user.expiry_date ? (
                          <div>
                            <small className={new Date(user.expiry_date) < new Date() ? 'text-danger' : 'text-success'}>
                              {new Date(user.expiry_date).toLocaleDateString()}
                            </small>
                            {new Date(user.expiry_date) < new Date() && (
                              <div><small className="text-danger">Expired</small></div>
                            )}
                          </div>
                        ) : (
                          <small className="text-muted">Never</small>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${user.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-info">
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openEditModal(user)}
                            title="Edit User"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete User"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        <i className="fas fa-users fa-3x text-muted mb-3"></i>
                        <p className="text-muted">No users found matching your criteria</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-white">
                  <i className="fas fa-user-plus me-2"></i>Add New User
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddUser}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Email *</label>
                      <input 
                        type="email" 
                        className="form-control"
                        value={addForm.email}
                        onChange={e => setAddForm({...addForm, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Password *</label>
                      <div className="input-group">
                        <input 
                          type={showPassword ? "text" : "password"}
                          className="form-control"
                          value={addForm.password}
                          onChange={e => setAddForm({...addForm, password: e.target.value})}
                          required
                          minLength="6"
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input 
                        type="tel" 
                        className="form-control"
                        value={addForm.phone}
                        onChange={e => setAddForm({...addForm, phone: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Number of Days Access</label>
                      <input 
                        type="number" 
                        className="form-control"
                        value={addForm.access_days}
                        onChange={e => setAddForm({...addForm, access_days: e.target.value})}
                        placeholder="e.g., 30, 90, 365"
                        min="1"
                      />
                      <small className="text-muted">Leave empty for unlimited access</small>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Status</label>
                      <select 
                        className="form-select"
                        value={addForm.status}
                        onChange={e => setAddForm({...addForm, status: e.target.value})}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Role</label>
                      <select 
                        className="form-select"
                        value={addForm.role}
                        onChange={e => setAddForm({...addForm, role: e.target.value})}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Adding...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>Add User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-white">
                  <i className="fas fa-user-edit me-2"></i>Edit User
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <form onSubmit={handleEditUser}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input 
                        type="email" 
                        className="form-control"
                        value={editForm.email}
                        disabled
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input 
                        type="tel" 
                        className="form-control"
                        value={editForm.phone}
                        onChange={e => setEditForm({...editForm, phone: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Number of Days Access</label>
                      <input 
                        type="number" 
                        className="form-control"
                        value={editForm.access_days}
                        onChange={e => setEditForm({...editForm, access_days: e.target.value})}
                        placeholder="e.g., 30, 90, 365"
                        min="1"
                      />
                      <small className="text-muted">Leave empty for unlimited access</small>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Status</label>
                      <select 
                        className="form-select"
                        value={editForm.status}
                        onChange={e => setEditForm({...editForm, status: e.target.value})}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Role</label>
                      <select 
                        className="form-select"
                        value={editForm.role}
                        onChange={e => setEditForm({...editForm, role: e.target.value})}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>Update User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .avatar-circle {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
        }
        
        .search-container {
          position: relative;
        }
        
        .search-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
          z-index: 2;
        }
        
        .search-input {
          padding-left: 45px;
        }
        
        .futuristic-border {
          border: 1px solid transparent;
          background: linear-gradient(white, white) padding-box,
                      linear-gradient(135deg, #667eea, #764ba2) border-box;
          border-radius: 8px;
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .modal-content {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: none;
          border-radius: 15px;
        }
        
        .modal-header {
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .table th {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          font-weight: 600;
        }
        
        .table td {
          vertical-align: middle;
          border-color: rgba(0,0,0,0.05);
        }
        
        .table-hover tbody tr:hover {
          background-color: rgba(102, 126, 234, 0.1);
        }
      `}</style>
    </div>
  );
}
