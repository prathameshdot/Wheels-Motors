import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function CompanyDetails() {
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  const [form, setForm] = useState({
    user_id: "",
    company_name: "",
    admin_name: "",
    phone: "",
    email: "",
    address: "",
    website: "",
    industry: "",
    description: "",
    logo: null,
    logo_url: "",
    signature: null,
    signature_url: "",
    dynamic_fields: {}
  });

  const [dynamicFields, setDynamicFields] = useState([{ key: "", value: "" }]);

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [sortBy, sortOrder]);

  async function fetchUsers() {
    const { data } = await supabase
      .from("users")
      .select("id, email, full_name, phone")
      .eq("status", "active")
      .order("full_name");
    setUsers(data || []);
  }

  async function fetchCompanies() {
    setLoading(true);
    const { data } = await supabase
      .from("company_details")
      .select(`
        *,
        users(full_name, email, phone)
      `)
      .order(sortBy, { ascending: sortOrder === "asc" });
    setCompanies(data || []);
    setLoading(false);
  }

  // Filter and search logic
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = 
      company.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  async function uploadFile(file, folder) {
    if (!file) return null;
    
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("company-assets")
        .upload(`${folder}/${fileName}`, file);
      
      if (error) {
        console.error("Error uploading file:", error);
        return null;
      }
      
      const { data: urlData } = supabase.storage
        .from("company-assets")
        .getPublicUrl(`${folder}/${fileName}`);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error("Storage error:", error);
      return null;
    }
  }

  function resetForm() {
    setForm({
      user_id: "",
      company_name: "",
      admin_name: "",
      phone: "",
      email: "",
      address: "",
      website: "",
      industry: "",
      description: "",
      logo: null,
      logo_url: "",
      signature: null,
      signature_url: "",
      dynamic_fields: {}
    });
    setDynamicFields([{ key: "", value: "" }]);
    setEditMode(false);
    setSelectedCompany(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validation
      if (!form.company_name || !form.admin_name || !form.user_id) {
        alert('Please fill in required fields: Company Name, Admin Name, and select a User');
        setLoading(false);
        return;
      }

      // Handle logo upload
      let logoUrl = form.logo_url;
      if (form.logo && form.logo instanceof File) {
        logoUrl = await uploadFile(form.logo, 'logos');
      }

      // Handle signature upload
      let signatureUrl = form.signature_url;
      if (form.signature && form.signature instanceof File) {
        signatureUrl = await uploadFile(form.signature, 'signatures');
      }

      // Prepare dynamic fields
      const dynamicExtra = {};
      dynamicFields.forEach(f => {
        if (f.key) dynamicExtra[f.key] = f.value;
      });

      // Prepare company data
      const companyData = {
        user_id: form.user_id,
        company_name: form.company_name,
        admin_name: form.admin_name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        website: form.website,
        industry: form.industry,
        description: form.description,
        logo_url: logoUrl,
        signature_url: signatureUrl,
        dynamic_fields: dynamicExtra
      };

      let error;
      if (editMode) {
        ({ error } = await supabase
          .from("company_details")
          .update(companyData)
          .eq("id", selectedCompany.id));
      } else {
        ({ error } = await supabase
          .from("company_details")
          .insert([companyData]));
      }
      
      if (error) throw error;

      resetForm();
      setShowModal(false);
      fetchCompanies();
      alert(editMode ? "Company updated successfully!" : "Company added successfully!");
    } catch (error) {
      console.error("Error saving company:", error);
      alert("Error saving company: " + error.message);
    }
    
    setLoading(false);
  }

  function handleAddCompany() {
    resetForm();
    setShowModal(true);
  }

  function handleEditCompany(company) {
    setSelectedCompany(company);
    setForm({
      user_id: company.user_id || "",
      company_name: company.company_name || "",
      admin_name: company.admin_name || "",
      phone: company.phone || "",
      email: company.email || "",
      address: company.address || "",
      website: company.website || "",
      industry: company.industry || "",
      description: company.description || "",
      logo: null,
      logo_url: company.logo_url || "",
      signature: null,
      signature_url: company.signature_url || "",
      dynamic_fields: company.dynamic_fields || {}
    });

    // Set dynamic fields
    const fields = [];
    if (company.dynamic_fields) {
      Object.entries(company.dynamic_fields).forEach(([key, value]) => {
        fields.push({ key, value });
      });
    }
    if (fields.length === 0) fields.push({ key: "", value: "" });
    setDynamicFields(fields);
    
    setEditMode(true);
    setShowModal(true);
  }

  function handleViewCompany(company) {
    setSelectedCompany(company);
    setShowViewModal(true);
  }

  async function handleDeleteCompany(company) {
    if (!window.confirm(`Are you sure you want to delete "${company.company_name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("company_details")
        .delete()
        .eq("id", company.id);

      if (error) throw error;

      fetchCompanies();
      alert("Company deleted successfully!");
    } catch (error) {
      console.error("Error deleting company:", error);
      alert("Error deleting company: " + error.message);
    }
    setLoading(false);
  }

  const handleDynamicFieldChange = (index, field, value) => {
    const updated = [...dynamicFields];
    updated[index][field] = value;
    setDynamicFields(updated);
  };

  const handleAddDynamicField = () => {
    setDynamicFields([...dynamicFields, { key: "", value: "" }]);
  };

  const handleRemoveDynamicField = (index) => {
    if (dynamicFields.length > 1) {
      const updated = dynamicFields.filter((_, i) => i !== index);
      setDynamicFields(updated);
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          <i className="fas fa-building me-2"></i>Company Management
        </h1>
        <div>
          <button 
            className="btn btn-primary btn-lg shadow-sm"
            onClick={handleAddCompany}
          >
            <i className="fas fa-plus me-2"></i>Add Company
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select 
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created_at">Date Created</option>
                <option value="company_name">Company Name</option>
                <option value="admin_name">Admin Name</option>
                <option value="industry">Industry</option>
              </select>
            </div>
            <div className="col-md-3">
              <select 
                className="form-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <small className="text-muted">
              Showing {filteredCompanies.length} of {companies.length} companies
            </small>
          </div>
        </div>
      </div>

      {/* Company List */}
      <div className="card shadow">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Company Details</th>
                    <th>Admin</th>
                    <th>Contact</th>
                    <th>Industry</th>
                    <th>Associated User</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map(company => (
                    <tr key={company.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          {company.logo_url && (
                            <img 
                              src={company.logo_url} 
                              alt="Company Logo" 
                              className="rounded me-3"
                              style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                            />
                          )}
                          <div>
                            <h6 className="mb-0">{company.company_name}</h6>
                            {company.website && (
                              <small className="text-muted">
                                <i className="fas fa-globe me-1"></i>
                                <a href={company.website} target="_blank" rel="noopener noreferrer">
                                  {company.website}
                                </a>
                              </small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{company.admin_name}</strong>
                      </td>
                      <td>
                        <div>
                          {company.email && (
                            <div>
                              <i className="fas fa-envelope me-1"></i>
                              <small>{company.email}</small>
                            </div>
                          )}
                          {company.phone && (
                            <div>
                              <i className="fas fa-phone me-1"></i>
                              <small>{company.phone}</small>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {company.industry && (
                          <span className="badge bg-info">{company.industry}</span>
                        )}
                      </td>
                      <td>
                        <div>
                          <strong>{company.users?.full_name || 'N/A'}</strong><br />
                          <small className="text-muted">{company.users?.email}</small>
                        </div>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleViewCompany(company)}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => handleEditCompany(company)}
                            title="Edit Company"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteCompany(company)}
                            title="Delete Company"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCompanies.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <i className="fas fa-building fa-3x text-muted mb-3"></i>
                        <p className="text-muted">
                          {searchTerm ? 
                            'No companies match your search criteria.' : 
                            'No companies found. Add your first company!'
                          }
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Company Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-building me-2"></i>
                  {editMode ? 'Edit Company' : 'Add New Company'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Associated User *</label>
                      <select 
                        className="form-select" 
                        value={form.user_id}
                        onChange={e => setForm({ ...form, user_id: e.target.value })}
                        required
                      >
                        <option value="">Choose user...</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.email} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Company Name *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={form.company_name}
                        onChange={e => setForm({ ...form, company_name: e.target.value })}
                        required
                        placeholder="Enter company name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Admin Name *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={form.admin_name}
                        onChange={e => setForm({ ...form, admin_name: e.target.value })}
                        required
                        placeholder="Enter admin name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Industry</label>
                      <select 
                        className="form-select"
                        value={form.industry}
                        onChange={e => setForm({ ...form, industry: e.target.value })}
                      >
                        <option value="">Select industry...</option>
                        <option value="Technology">Technology</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Finance">Finance</option>
                        <option value="Education">Education</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Retail">Retail</option>
                        <option value="Automotive">Automotive</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Food & Beverage">Food & Beverage</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input 
                        type="email" 
                        className="form-control"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="company@example.com"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input 
                        type="tel" 
                        className="form-control"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Website</label>
                      <input 
                        type="url" 
                        className="form-control"
                        value={form.website}
                        onChange={e => setForm({ ...form, website: e.target.value })}
                        placeholder="https://company.com"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Address</label>
                      <textarea 
                        className="form-control"
                        rows="3"
                        value={form.address}
                        onChange={e => setForm({ ...form, address: e.target.value })}
                        placeholder="Enter company address"
                      ></textarea>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Description</label>
                      <textarea 
                        className="form-control"
                        rows="3"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="Brief company description"
                      ></textarea>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Company Logo</label>
                      <input 
                        type="file" 
                        className="form-control"
                        accept="image/*"
                        onChange={e => setForm({ ...form, logo: e.target.files[0] })}
                      />
                      {form.logo_url && (
                        <div className="mt-2">
                          <img 
                            src={form.logo_url} 
                            alt="Current Logo" 
                            style={{ maxWidth: '100px', maxHeight: '100px' }}
                            className="img-thumbnail"
                          />
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Admin Signature</label>
                      <input 
                        type="file" 
                        className="form-control"
                        accept="image/*"
                        onChange={e => setForm({ ...form, signature: e.target.files[0] })}
                      />
                      {form.signature_url && (
                        <div className="mt-2">
                          <img 
                            src={form.signature_url} 
                            alt="Current Signature" 
                            style={{ maxWidth: '150px', maxHeight: '75px' }}
                            className="img-thumbnail"
                          />
                        </div>
                      )}
                    </div>

                    <div className="col-12">
                      <h6>Additional Information</h6>
                      {dynamicFields.map((field, index) => (
                        <div key={index} className="row g-2 mb-2">
                          <div className="col-md-4">
                            <input 
                              type="text"
                              className="form-control"
                              placeholder="Field Name"
                              value={field.key}
                              onChange={e => handleDynamicFieldChange(index, "key", e.target.value)}
                            />
                          </div>
                          <div className="col-md-6">
                            <input 
                              type="text"
                              className="form-control"
                              placeholder="Value"
                              value={field.value}
                              onChange={e => handleDynamicFieldChange(index, "value", e.target.value)}
                            />
                          </div>
                          <div className="col-md-2">
                            <div className="btn-group">
                              <button 
                                type="button" 
                                className="btn btn-outline-primary btn-sm"
                                onClick={handleAddDynamicField}
                              >
                                <i className="fas fa-plus"></i>
                              </button>
                              {dynamicFields.length > 1 && (
                                <button 
                                  type="button" 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleRemoveDynamicField(index)}
                                >
                                  <i className="fas fa-minus"></i>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        {editMode ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        <i className={`fas ${editMode ? 'fa-save' : 'fa-plus'} me-2`}></i>
                        {editMode ? 'Update Company' : 'Add Company'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Company Modal */}
      {showViewModal && selectedCompany && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-building me-2"></i>Company Details
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-12 text-center mb-3">
                    {selectedCompany.logo_url && (
                      <img 
                        src={selectedCompany.logo_url} 
                        alt="Company Logo" 
                        style={{ maxWidth: '200px', maxHeight: '100px' }}
                        className="img-fluid"
                      />
                    )}
                    <h4 className="mt-2">{selectedCompany.company_name}</h4>
                    {selectedCompany.industry && (
                      <span className="badge bg-info fs-6">{selectedCompany.industry}</span>
                    )}
                  </div>

                  <div className="col-md-6">
                    <strong>Admin Name:</strong> {selectedCompany.admin_name}
                  </div>
                  <div className="col-md-6">
                    <strong>Email:</strong> {selectedCompany.email || 'N/A'}
                  </div>
                  <div className="col-md-6">
                    <strong>Phone:</strong> {selectedCompany.phone || 'N/A'}
                  </div>
                  <div className="col-md-6">
                    <strong>Website:</strong> 
                    {selectedCompany.website ? (
                      <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="ms-1">
                        {selectedCompany.website}
                      </a>
                    ) : 'N/A'}
                  </div>
                  
                  {selectedCompany.address && (
                    <div className="col-12">
                      <strong>Address:</strong><br />
                      {selectedCompany.address}
                    </div>
                  )}

                  {selectedCompany.description && (
                    <div className="col-12">
                      <strong>Description:</strong><br />
                      {selectedCompany.description}
                    </div>
                  )}

                  {selectedCompany.signature_url && (
                    <div className="col-12">
                      <strong>Admin Signature:</strong><br />
                      <img 
                        src={selectedCompany.signature_url} 
                        alt="Admin Signature" 
                        style={{ maxWidth: '200px', maxHeight: '100px' }}
                        className="img-thumbnail mt-2"
                      />
                    </div>
                  )}

                  {selectedCompany.dynamic_fields && Object.keys(selectedCompany.dynamic_fields).length > 0 && (
                    <div className="col-12">
                      <h6>Additional Information</h6>
                      <div className="border rounded p-3">
                        {Object.entries(selectedCompany.dynamic_fields).map(([key, value]) => (
                          <p key={key}><strong>{key}:</strong> {value}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning"
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditCompany(selectedCompany);
                  }}
                >
                  <i className="fas fa-edit me-1"></i>Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
