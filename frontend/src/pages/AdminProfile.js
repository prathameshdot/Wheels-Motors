import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function AdminProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState({});
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: ""
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    getCurrentUser();
  }, []);

  async function getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (userData) {
          setUserDetails(userData);
          setProfileForm({
            full_name: userData.full_name || "",
            email: userData.email || user.email,
            phone: userData.phone || "",
            address: userData.address || ""
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          address: profileForm.address
        })
        .eq("id", user.id);

      if (error) throw error;

      setShowEditModal(false);
      getCurrentUser();
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile: " + error.message);
    }
    setLoading(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      setPasswordForm({
        newPassword: "",
        confirmPassword: ""
      });
      setShowPasswordModal(false);
      alert("Password changed successfully!");
    } catch (error) {
      console.error("Error changing password:", error);
      alert("Error changing password: " + error.message);
    }
    setLoading(false);
  }

  function openEditModal() {
    setProfileForm({
      full_name: userDetails.full_name || "",
      email: userDetails.email || user.email,
      phone: userDetails.phone || "",
      address: userDetails.address || ""
    });
    setShowEditModal(true);
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h2 mb-2 text-gradient">
            <i className="fas fa-user-cog me-2"></i>Admin Profile
          </h1>
          <p className="text-muted mb-0">Manage your account settings and security</p>
        </div>
      </div>

      <div className="row">
        {/* Profile Card */}
        <div className="col-lg-4 mb-4">
          <div className="card futuristic-border h-100">
            <div className="card-header text-center">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-user-circle me-2"></i>Profile Information
              </h6>
            </div>
            <div className="card-body text-center">
              <div className="profile-avatar mb-4">
                <div className="avatar-large">
                  <i className="fas fa-user-tie"></i>
                </div>
              </div>
              
              <h5 className="font-weight-bold text-dark mb-2">
                {userDetails.full_name || 'Admin User'}
              </h5>
              <p className="text-muted mb-3">{userDetails.email}</p>
              
              <div className="profile-details">
                <div className="mb-3 text-start">
                  <small className="text-muted">Phone:</small>
                  <div className="fw-bold">{userDetails.phone || 'Not provided'}</div>
                </div>
                <div className="mb-3 text-start">
                  <small className="text-muted">Role:</small>
                  <div className="fw-bold">
                    <span className="badge bg-primary">{userDetails.role || 'Admin'}</span>
                  </div>
                </div>
                <div className="mb-3 text-start">
                  <small className="text-muted">Status:</small>
                  <div className="fw-bold">
                    <span className={`badge ${userDetails.status === 'active' ? 'bg-success' : 'bg-warning'}`}>
                      {userDetails.status || 'Active'}
                    </span>
                  </div>
                </div>
                <div className="mb-3 text-start">
                  <small className="text-muted">Member Since:</small>
                  <div className="fw-bold">
                    {userDetails.created_at ? new Date(userDetails.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="d-grid gap-2 mt-4">
                <button 
                  className="btn btn-primary"
                  onClick={openEditModal}
                >
                  <i className="fas fa-edit me-2"></i>Update Profile
                </button>
                <button 
                  className="btn btn-warning"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <i className="fas fa-key me-2"></i>Change Password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="col-lg-8 mb-4">
          <div className="card futuristic-border h-100">
            <div className="card-header">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-info-circle me-2"></i>Account Details
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-4">
                  <div className="info-card">
                    <div className="info-icon">
                      <i className="fas fa-envelope text-primary"></i>
                    </div>
                    <div className="info-content">
                      <h6 className="mb-1">Email Address</h6>
                      <p className="text-muted mb-0">{userDetails.email}</p>
                      <small className="text-success">Verified</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 mb-4">
                  <div className="info-card">
                    <div className="info-icon">
                      <i className="fas fa-phone text-success"></i>
                    </div>
                    <div className="info-content">
                      <h6 className="mb-1">Phone Number</h6>
                      <p className="text-muted mb-0">{userDetails.phone || 'Not provided'}</p>
                      <small className="text-muted">Contact number</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 mb-4">
                  <div className="info-card">
                    <div className="info-icon">
                      <i className="fas fa-map-marker-alt text-info"></i>
                    </div>
                    <div className="info-content">
                      <h6 className="mb-1">Address</h6>
                      <p className="text-muted mb-0">{userDetails.address || 'Not provided'}</p>
                      <small className="text-muted">Current address</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 mb-4">
                  <div className="info-card">
                    <div className="info-icon">
                      <i className="fas fa-shield-alt text-warning"></i>
                    </div>
                    <div className="info-content">
                      <h6 className="mb-1">Security</h6>
                      <p className="text-muted mb-0">Password protected</p>
                      <small className="text-muted">Last changed recently</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Statistics */}
              <div className="border-top pt-4 mt-4">
                <h6 className="text-primary mb-3">
                  <i className="fas fa-chart-bar me-2"></i>Account Activity
                </h6>
                <div className="row text-center">
                  <div className="col-4">
                    <div className="stat-item">
                      <h4 className="text-primary mb-1">24/7</h4>
                      <small className="text-muted">Access Available</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="stat-item">
                      <h4 className="text-success mb-1">100%</h4>
                      <small className="text-muted">System Uptime</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="stat-item">
                      <h4 className="text-info mb-1">Secure</h4>
                      <small className="text-muted">Account Status</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Profile Modal */}
      {showEditModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-white">
                  <i className="fas fa-user-edit me-2"></i>Update Profile
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <form onSubmit={handleUpdateProfile}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Full Name *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={profileForm.full_name}
                        onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input 
                        type="email" 
                        className="form-control"
                        value={profileForm.email}
                        disabled
                      />
                      <small className="text-muted">Email cannot be changed</small>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone Number</label>
                      <input 
                        type="tel" 
                        className="form-control"
                        value={profileForm.phone}
                        onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Address</label>
                      <textarea 
                        className="form-control"
                        rows="3"
                        value={profileForm.address}
                        onChange={e => setProfileForm({...profileForm, address: e.target.value})}
                        placeholder="Enter your address"
                      ></textarea>
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
                        <i className="fas fa-save me-2"></i>Update Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-white">
                  <i className="fas fa-key me-2"></i>Change Password
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowPasswordModal(false)}
                ></button>
              </div>
              <form onSubmit={handleChangePassword}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    Password must be at least 6 characters long.
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">New Password *</label>
                    <input 
                      type="password" 
                      className="form-control"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      required
                      minLength="6"
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Confirm New Password *</label>
                    <input 
                      type="password" 
                      className="form-control"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      required
                      minLength="6"
                      placeholder="Confirm new password"
                    />
                  </div>
                  
                  {passwordForm.newPassword && passwordForm.confirmPassword && 
                   passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <div className="alert alert-danger">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Passwords don't match!
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-warning"
                    disabled={loading || passwordForm.newPassword !== passwordForm.confirmPassword}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Changing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-key me-2"></i>Change Password
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
        .profile-avatar {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }
        
        .avatar-large {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-color), #0056b3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 3rem;
          box-shadow: var(--shadow-lg);
        }
        
        .info-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(0, 123, 255, 0.05);
          border-radius: 10px;
          border-left: 4px solid var(--accent-color);
        }
        
        .info-icon {
          font-size: 1.5rem;
        }
        
        .info-content h6 {
          color: var(--primary-black);
          margin-bottom: 0.5rem;
        }
        
        .stat-item {
          padding: 1rem;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 8px;
          margin: 0 0.5rem;
        }
        
        .profile-details {
          text-align: left;
        }
      `}</style>
    </div>
  );
}
