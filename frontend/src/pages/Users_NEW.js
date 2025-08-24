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
  const [showFormBuilderModal, setShowFormBuilderModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Add User Form
  const [addForm, setAddForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    address: "",
    status: "active",
    role: "user"
  });

  // Edit User Form
  const [editForm, setEditForm] = useState({
    id: "",
    email: "",
    full_name: "",
    phone: "",
    address: "",
    status: "active",
    role: "user"
  });

  // Form Builder State
  const [formBuilder, setFormBuilder] = useState({
    userId: "",
    formType: "add_vehicle", // or "sell_vehicle"
    fields: []
  });

  const [customField, setCustomField] = useState({
    label: "",
    type: "varchar",
    required: false,
    options: [] // for select/checkbox
  });

  const fieldTypes = [
    { value: "varchar", label: "Text Input" },
    { value: "number", label: "Number Input" },
    { value: "date", label: "Date Picker" },
    { value: "checkbox", label: "Checkbox" },
    { value: "select", label: "Dropdown Select" },
    { value: "textarea", label: "Text Area" },
    { value: "file", label: "File Upload" },
    { value: "email", label: "Email Input" },
    { value: "phone", label: "Phone Input" }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

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
      const { error: dbError } = await supabase
        .from("users")
        .insert([{
          id: authData.user.id,
          email: addForm.email,
          full_name: addForm.full_name,
          phone: addForm.phone,
          address: addForm.address,
          status: addForm.status,
          role: addForm.role
        }]);

      if (dbError) throw dbError;

      // Send email with credentials
      try {
        await emailjs.send(
          'service_0zzn02b',
          'template_user_credentials',
          {
            to_email: addForm.email,
            user_name: addForm.full_name,
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
        full_name: "",
        phone: "",
        address: "",
        status: "active",
        role: "user"
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
      const { error } = await supabase
        .from("users")
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          address: editForm.address,
          status: editForm.status,
          role: editForm.role
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
      full_name: user.full_name || "",
      phone: user.phone || "",
      address: user.address || "",
      status: user.status || "active",
      role: user.role || "user"
    });
    setShowEditModal(true);
  }

  function openFormBuilder(user) {
    setSelectedUser(user);
    setFormBuilder({
      userId: user.id,
      formType: "add_vehicle",
      fields: []
    });
    setShowFormBuilderModal(true);
  }

  function addCustomField() {
    if (!customField.label.trim()) {
      alert("Please enter a field label");
      return;
    }

    const newField = {
      id: Date.now(),
      label: customField.label,
      type: customField.type,
      required: customField.required,
      options: customField.options
    };

    setFormBuilder(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));

    setCustomField({
      label: "",
      type: "varchar",
      required: false,
      options: []
    });
  }

  function removeField(fieldId) {
    setFormBuilder(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
  }

  async function saveCustomForm() {
    if (formBuilder.fields.length === 0) {
      alert("Please add at least one field");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_custom_forms")
        .upsert([{
          user_id: formBuilder.userId,
          form_type: formBuilder.formType,
          fields: formBuilder.fields
        }]);

      if (error) throw error;

      setShowFormBuilderModal(false);
      alert(`Custom ${formBuilder.formType.replace('_', ' ')} form saved successfully!`);
    } catch (error) {
      console.error("Error saving custom form:", error);
      alert("Error saving custom form: " + error.message);
    }
    setLoading(false);
  }

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <p className="text-muted mb-0">Create, manage, and customize user forms</p>
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
            <div className="col-md-6">
              <div className="search-container">
                <i className="fas fa-search search-icon"></i>
                <input
                  type="text"
                  className="form-control search-input"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
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
            <div className="col-md-3">
              <div className="d-flex gap-2">
                <button className="btn btn-outline-primary flex-fill">
                  <i className="fas fa-filter me-1"></i>Filter
                </button>
                <button className="btn btn-outline-secondary flex-fill">
                  <i className="fas fa-download me-1"></i>Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card futuristic-border">
        <div className="card-header">
          <h6 className="m-0 font-weight-bold text-primary">
            <i className="fas fa-table me-2"></i>Users List ({filteredUsers.length})
          </h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>User Details</th>
                    <th>Contact Info</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Created</th>
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
                            <div className="fw-bold">{user.full_name || 'No Name'}</div>
                            <small className="text-muted">{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div><i className="fas fa-phone me-1"></i>{user.phone || 'N/A'}</div>
                          <small className="text-muted">
                            <i className="fas fa-map-marker-alt me-1"></i>
                            {user.address ? user.address.substring(0, 30) + '...' : 'No Address'}
                          </small>
                        </div>
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
                        <small>{new Date(user.created_at).toLocaleDateString()}</small>
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
                            className="btn btn-sm btn-outline-success"
                            onClick={() => openFormBuilder(user)}
                            title="Create Custom Form"
                          >
                            <i className="fas fa-cogs"></i>
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
                      <td colSpan="6" className="text-center py-4">
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
                      <label className="form-label">Full Name *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={addForm.full_name}
                        onChange={e => setAddForm({...addForm, full_name: e.target.value})}
                        required
                      />
                    </div>
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
                      <input 
                        type="password" 
                        className="form-control"
                        value={addForm.password}
                        onChange={e => setAddForm({...addForm, password: e.target.value})}
                        required
                        minLength="6"
                      />
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
                    <div className="col-12">
                      <label className="form-label">Address</label>
                      <textarea 
                        className="form-control"
                        rows="3"
                        value={addForm.address}
                        onChange={e => setAddForm({...addForm, address: e.target.value})}
                      ></textarea>
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

      {/* Form Builder Modal */}
      {showFormBuilderModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-white">
                  <i className="fas fa-cogs me-2"></i>Form Builder - {selectedUser?.full_name}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowFormBuilderModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-4">
                    <h6>Add New Field</h6>
                    <div className="mb-3">
                      <label className="form-label">Form Type</label>
                      <select 
                        className="form-select"
                        value={formBuilder.formType}
                        onChange={e => setFormBuilder({...formBuilder, formType: e.target.value})}
                      >
                        <option value="add_vehicle">Add Vehicle Form</option>
                        <option value="sell_vehicle">Sell Vehicle Form</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Field Label</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={customField.label}
                        onChange={e => setCustomField({...customField, label: e.target.value})}
                        placeholder="e.g., Vehicle Color"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Field Type</label>
                      <select 
                        className="form-select"
                        value={customField.type}
                        onChange={e => setCustomField({...customField, type: e.target.value})}
                      >
                        {fieldTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          checked={customField.required}
                          onChange={e => setCustomField({...customField, required: e.target.checked})}
                        />
                        <label className="form-check-label">Required Field</label>
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary w-100"
                      onClick={addCustomField}
                    >
                      <i className="fas fa-plus me-2"></i>Add Field
                    </button>
                  </div>
                  
                  <div className="col-md-8">
                    <h6>Form Preview ({formBuilder.formType.replace('_', ' ')})</h6>
                    <div className="border rounded p-3 bg-light" style={{minHeight: '400px'}}>
                      {formBuilder.fields.length === 0 ? (
                        <div className="text-center text-muted py-5">
                          <i className="fas fa-plus-circle fa-3x mb-3"></i>
                          <p>Add fields to see form preview</p>
                        </div>
                      ) : (
                        <div className="row g-3">
                          {formBuilder.fields.map(field => (
                            <div key={field.id} className="col-md-6">
                              <div className="field-preview position-relative">
                                <label className="form-label">
                                  {field.label}
                                  {field.required && <span className="text-danger">*</span>}
                                </label>
                                
                                {field.type === 'varchar' && (
                                  <input type="text" className="form-control" placeholder={field.label} disabled />
                                )}
                                {field.type === 'number' && (
                                  <input type="number" className="form-control" placeholder={field.label} disabled />
                                )}
                                {field.type === 'date' && (
                                  <input type="date" className="form-control" disabled />
                                )}
                                {field.type === 'textarea' && (
                                  <textarea className="form-control" rows="3" placeholder={field.label} disabled></textarea>
                                )}
                                {field.type === 'checkbox' && (
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" disabled />
                                    <label className="form-check-label">{field.label}</label>
                                  </div>
                                )}
                                {field.type === 'select' && (
                                  <select className="form-select" disabled>
                                    <option>Choose {field.label}</option>
                                  </select>
                                )}
                                {field.type === 'file' && (
                                  <input type="file" className="form-control" disabled />
                                )}
                                
                                <button 
                                  className="btn btn-sm btn-danger position-absolute top-0 end-0"
                                  onClick={() => removeField(field.id)}
                                  style={{marginTop: '-5px', marginRight: '-5px'}}
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowFormBuilderModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={saveCustomForm}
                  disabled={loading || formBuilder.fields.length === 0}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>Save Custom Form
                    </>
                  )}
                </button>
              </div>
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
                      <label className="form-label">Full Name *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={editForm.full_name}
                        onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                        required
                      />
                    </div>
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
                    <div className="col-12">
                      <label className="form-label">Address</label>
                      <textarea 
                        className="form-control"
                        rows="3"
                        value={editForm.address}
                        onChange={e => setEditForm({...editForm, address: e.target.value})}
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
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-color), #0056b3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.1rem;
        }
        
        .field-preview {
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 15px;
          background: white;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
}
