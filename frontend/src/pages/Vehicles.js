import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Vehicles() {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Vehicle Form with static and dynamic fields
  const [vehicleForm, setVehicleForm] = useState({
    user_id: "",
    vehicle_no: "",
    model: "",
    brand: "",
    price: "",
    fuel_type: "Petrol",
    purchase_date: "",
    insurance_expiry: "",
    rc_available: false,
    insurance_done: false,
    loan_cleared: true,
    loan_amount: "",
    status: "in",
    images: [],
    dynamic_fields: {}
  });

  // Sell Vehicle Form with static and dynamic fields
  const [sellForm, setSellForm] = useState({
    vehicle_id: location.state?.preSelectedVehicle || "",
    buyer_name: "",
    buyer_phone: "",
    buyer_email: "",
    buyer_address: "",
    sell_price: "",
    balance_amount: "",
    sell_date: "",
    id_proof: null,
    dynamic_fields: {}
  });

  const [vehicles, setVehicles] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([{ key: "", value: "" }]);
  const [sellDynamicFields, setSellDynamicFields] = useState([{ key: "", value: "" }]);

  useEffect(() => {
    fetchUsers();
    fetchAvailableVehicles();
    fetchVehicles();
  }, []);

  async function fetchUsers() {
    const { data } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("status", "active")
      .order("full_name");
    setUsers(data || []);
  }

  async function fetchVehicles() {
    const { data } = await supabase
      .from("vehicles")
      .select(`
        *,
        users(full_name, email),
        vehicle_buyers(*)
      `)
      .order("created_at", { ascending: false });
    setVehicles(data || []);
  }

  async function fetchAvailableVehicles() {
    const { data } = await supabase
      .from("vehicles")
      .select(`
        *,
        users(full_name, email)
      `)
      .eq("status", "in")
      .order("created_at", { ascending: false });
    setVehicles(data || []);
  }

  async function uploadImages(files) {
    const urls = [];
    for (const file of files) {
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("vehicle-photos")
        .upload(`vehicles/${fileName}`, file);
      
      if (!error) {
        const { data: urlData } = supabase.storage
          .from("vehicle-photos")
          .getPublicUrl(`vehicles/${fileName}`);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  }

  function resetVehicleForm() {
    setVehicleForm({
      user_id: "",
      vehicle_no: "",
      model: "",
      brand: "",
      price: "",
      fuel_type: "Petrol",
      purchase_date: "",
      insurance_expiry: "",
      rc_available: false,
      insurance_done: false,
      loan_cleared: true,
      loan_amount: "",
      status: "in",
      images: [],
      dynamic_fields: {}
    });
    setDynamicFields([{ key: "", value: "" }]);
    setEditMode(false);
    setSelectedVehicle(null);
  }

  function resetSellForm() {
    setSellForm({
      vehicle_id: "",
      buyer_name: "",
      buyer_phone: "",
      buyer_email: "",
      buyer_address: "",
      sell_price: "",
      balance_amount: "",
      sell_date: "",
      id_proof: null,
      dynamic_fields: {}
    });
    setSellDynamicFields([{ key: "", value: "" }]);
  }

  async function handleVehicleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrls = vehicleForm.images;
      if (Array.isArray(vehicleForm.images) && vehicleForm.images.length > 0 && vehicleForm.images[0] instanceof File) {
        imageUrls = await uploadImages(vehicleForm.images);
      }

      const dynamicExtra = {};
      dynamicFields.forEach(f => {
        if (f.key) dynamicExtra[f.key] = f.value;
      });

      const vehicleData = {
        user_id: vehicleForm.user_id,
        vehicle_no: vehicleForm.vehicle_no,
        model: vehicleForm.model,
        brand: vehicleForm.brand,
        price: parseFloat(vehicleForm.price),
        fuel_type: vehicleForm.fuel_type,
        purchase_date: vehicleForm.purchase_date,
        insurance_expiry: vehicleForm.insurance_expiry,
        rc_available: vehicleForm.rc_available,
        insurance_done: vehicleForm.insurance_done,
        loan_cleared: vehicleForm.loan_cleared,
        loan_amount: vehicleForm.loan_amount ? parseFloat(vehicleForm.loan_amount) : null,
        status: vehicleForm.status,
        images: imageUrls,
        dynamic_fields: dynamicExtra
      };

      let error;
      if (editMode) {
        ({ error } = await supabase
          .from("vehicles")
          .update(vehicleData)
          .eq("id", selectedVehicle.id));
      } else {
        ({ error } = await supabase.from("vehicles").insert([vehicleData]));
      }
      
      if (error) throw error;

      resetVehicleForm();
      setShowVehicleModal(false);
      fetchVehicles();
      alert(editMode ? "Vehicle updated successfully!" : "Vehicle added successfully!");
    } catch (error) {
      console.error("Error saving vehicle:", error);
      alert("Error saving vehicle: " + error.message);
    }
    
    setLoading(false);
  }

  async function handleSellVehicle(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const dynamicExtra = {};
      sellDynamicFields.forEach(f => {
        if (f.key) dynamicExtra[f.key] = f.value;
      });

      // Insert buyer record
      const { error: buyerError } = await supabase
        .from("vehicle_buyers")
        .insert([{
          vehicle_id: sellForm.vehicle_id,
          buyer_name: sellForm.buyer_name,
          buyer_phone: sellForm.buyer_phone,
          buyer_email: sellForm.buyer_email,
          buyer_address: sellForm.buyer_address,
          sell_price: parseFloat(sellForm.sell_price),
          balance_amount: parseFloat(sellForm.balance_amount) || 0,
          sell_date: sellForm.sell_date,
          dynamic_fields: dynamicExtra
        }]);

      if (buyerError) throw buyerError;

      // Update vehicle status
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ status: "sold" })
        .eq("id", sellForm.vehicle_id);

      if (vehicleError) throw vehicleError;

      resetSellForm();
      setShowSellModal(false);
      fetchVehicles();
      alert("Vehicle sold successfully!");
    } catch (error) {
      console.error("Error selling vehicle:", error);
      alert("Error selling vehicle: " + error.message);
    }
    
    setLoading(false);
  }

  function handleAddVehicle() {
    resetVehicleForm();
    setShowVehicleModal(true);
  }

  function handleEditVehicle(vehicle) {
    setSelectedVehicle(vehicle);
    setVehicleForm({
      ...vehicle,
      user_id: vehicle.user_id || "",
      images: vehicle.images || []
    });
    
    // Set dynamic fields
    const fields = [];
    if (vehicle.dynamic_fields) {
      Object.entries(vehicle.dynamic_fields).forEach(([key, value]) => {
        fields.push({ key, value });
      });
    }
    if (fields.length === 0) fields.push({ key: "", value: "" });
    setDynamicFields(fields);
    
    setEditMode(true);
    setShowVehicleModal(true);
  }

  function handleViewVehicle(vehicle) {
    setSelectedVehicle(vehicle);
    setShowViewModal(true);
  }

  function handleSellVehicleAction(vehicle) {
    resetSellForm();
    setSellForm(prev => ({
      ...prev,
      vehicle_id: vehicle.id,
      sell_price: vehicle.price
    }));
    setShowSellModal(true);
  }

  const handleDynamicFieldChange = (index, field, value, type = 'vehicle') => {
    if (type === 'vehicle') {
      const updated = [...dynamicFields];
      updated[index][field] = value;
      setDynamicFields(updated);
    } else {
      const updated = [...sellDynamicFields];
      updated[index][field] = value;
      setSellDynamicFields(updated);
    }
  };

  const handleAddDynamicField = (type = 'vehicle') => {
    if (type === 'vehicle') {
      setDynamicFields([...dynamicFields, { key: "", value: "" }]);
    } else {
      setSellDynamicFields([...sellDynamicFields, { key: "", value: "" }]);
    }
  };

  const handleRemoveDynamicField = (index, type = 'vehicle') => {
    if (type === 'vehicle') {
      if (dynamicFields.length > 1) {
        const updated = dynamicFields.filter((_, i) => i !== index);
        setDynamicFields(updated);
      }
    } else {
      if (sellDynamicFields.length > 1) {
        const updated = sellDynamicFields.filter((_, i) => i !== index);
        setSellDynamicFields(updated);
      }
    }
  };

  // Computed values
  const uniqueBrands = [...new Set(vehicles.map(v => v.brand).filter(Boolean))];
  
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = !searchTerm || 
      vehicle.vehicle_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    const matchesBrand = brandFilter === "all" || vehicle.brand === brandFilter;
    
    return matchesSearch && matchesStatus && matchesBrand;
  }).sort((a, b) => {
    const direction = sortOrder === "asc" ? 1 : -1;
    if (sortBy === "created_at") {
      return direction * (new Date(a.created_at) - new Date(b.created_at));
    }
    if (sortBy === "price") {
      return direction * ((a.price || 0) - (b.price || 0));
    }
    if (sortBy === "vehicle_no") {
      return direction * (a.vehicle_no || "").localeCompare(b.vehicle_no || "");
    }
    return 0;
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          <i className="fas fa-car me-2"></i>Vehicle Management
        </h1>
        <div>
          <button 
            className="btn btn-primary btn-lg shadow-sm"
            onClick={handleAddVehicle}
          >
            <i className="fas fa-plus me-2"></i>Add Vehicle
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2">
              <select 
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="in">Available</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            <div className="col-md-2">
              <select 
                className="form-select"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
              >
                <option value="">All Brands</option>
                {uniqueBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select 
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created_at">Date Added</option>
                <option value="vehicle_no">Vehicle Number</option>
                <option value="brand">Brand</option>
                <option value="price">Price</option>
              </select>
            </div>
            <div className="col-md-2">
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
              Showing {filteredVehicles.length} of {vehicles.length} vehicles
            </small>
          </div>
        </div>
      </div>

      {/* Vehicle List */}
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
                    <th>Vehicle Details</th>
                    <th>Owner</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Purchase Date</th>
                    <th>Insurance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(vehicle => (
                    <tr key={vehicle.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          {vehicle.images && vehicle.images[0] && (
                            <img 
                              src={vehicle.images[0]} 
                              alt="Vehicle" 
                              className="rounded me-3"
                              style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                            />
                          )}
                          <div>
                            <h6 className="mb-0">{vehicle.brand} {vehicle.model}</h6>
                            <small className="text-muted">{vehicle.vehicle_no}</small><br />
                            <small className="text-muted">
                              <i className="fas fa-gas-pump me-1"></i>{vehicle.fuel_type}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{vehicle.users?.full_name || 'N/A'}</strong><br />
                          <small className="text-muted">{vehicle.users?.email}</small>
                        </div>
                      </td>
                      <td>
                        <strong>₹{vehicle.price?.toLocaleString()}</strong>
                      </td>
                      <td>
                        <span className={`badge ${vehicle.status === 'in' ? 'bg-success' : 'bg-danger'}`}>
                          {vehicle.status === 'in' ? 'Available' : 'Sold'}
                        </span>
                      </td>
                      <td>
                        {vehicle.purchase_date ? 
                          new Date(vehicle.purchase_date).toLocaleDateString() : 
                          'N/A'
                        }
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <span className={`badge ${vehicle.insurance_done ? 'bg-success' : 'bg-warning'}`}>
                            <i className="fas fa-shield-alt me-1"></i>
                            {vehicle.insurance_done ? 'Insured' : 'Not Insured'}
                          </span>
                          {vehicle.insurance_expiry && (
                            <small className="text-muted">
                              Exp: {new Date(vehicle.insurance_expiry).toLocaleDateString()}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleViewVehicle(vehicle)}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          {vehicle.status === 'in' && (
                            <>
                              <button 
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => handleEditVehicle(vehicle)}
                                title="Edit Vehicle"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleSellVehicleAction(vehicle)}
                                title="Sell Vehicle"
                              >
                                <i className="fas fa-handshake"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredVehicles.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        <i className="fas fa-car fa-3x text-muted mb-3"></i>
                        <p className="text-muted">
                          {searchTerm || statusFilter !== 'all' || brandFilter ? 
                            'No vehicles match your search criteria.' : 
                            'No vehicles found. Add your first vehicle!'
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

      {/* Add/Edit Vehicle Modal */}
      {showVehicleModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-car me-2"></i>
                  {editMode ? 'Edit Vehicle' : 'Add New Vehicle'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowVehicleModal(false)}
                ></button>
              </div>
              <form onSubmit={handleVehicleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Select User *</label>
                      <select 
                        className="form-select" 
                        value={vehicleForm.user_id}
                        onChange={e => setVehicleForm({ ...vehicleForm, user_id: e.target.value })}
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
                      <label className="form-label">Vehicle Number *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={vehicleForm.vehicle_no}
                        onChange={e => setVehicleForm({ ...vehicleForm, vehicle_no: e.target.value })}
                        required
                        placeholder="e.g., MH12AB1234"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Brand *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={vehicleForm.brand}
                        onChange={e => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                        required
                        placeholder="e.g., Honda, Toyota"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Model *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={vehicleForm.model}
                        onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                        required
                        placeholder="e.g., City, Corolla"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Fuel Type</label>
                      <select 
                        className="form-select"
                        value={vehicleForm.fuel_type}
                        onChange={e => setVehicleForm({ ...vehicleForm, fuel_type: e.target.value })}
                      >
                        <option value="Petrol">Petrol</option>
                        <option value="Diesel">Diesel</option>
                        <option value="CNG">CNG</option>
                        <option value="Electric">Electric</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Price *</label>
                      <input 
                        type="number" 
                        className="form-control"
                        value={vehicleForm.price}
                        onChange={e => setVehicleForm({ ...vehicleForm, price: e.target.value })}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Purchase Date</label>
                      <input 
                        type="date" 
                        className="form-control"
                        value={vehicleForm.purchase_date}
                        onChange={e => setVehicleForm({ ...vehicleForm, purchase_date: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Insurance Expiry</label>
                      <input 
                        type="date" 
                        className="form-control"
                        value={vehicleForm.insurance_expiry}
                        onChange={e => setVehicleForm({ ...vehicleForm, insurance_expiry: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Loan Amount</label>
                      <input 
                        type="number" 
                        className="form-control"
                        value={vehicleForm.loan_amount}
                        onChange={e => setVehicleForm({ ...vehicleForm, loan_amount: e.target.value })}
                        min="0"
                        step="0.01"
                        disabled={vehicleForm.loan_cleared}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Status</label>
                      <select 
                        className="form-select"
                        value={vehicleForm.status}
                        onChange={e => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                      >
                        <option value="in">Available</option>
                        <option value="sold">Sold</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <div className="row g-2">
                        <div className="col-md-4">
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              checked={vehicleForm.rc_available}
                              onChange={e => setVehicleForm({ ...vehicleForm, rc_available: e.target.checked })}
                            />
                            <label className="form-check-label">RC Available</label>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              checked={vehicleForm.insurance_done}
                              onChange={e => setVehicleForm({ ...vehicleForm, insurance_done: e.target.checked })}
                            />
                            <label className="form-check-label">Insurance Done</label>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              checked={vehicleForm.loan_cleared}
                              onChange={e => setVehicleForm({ ...vehicleForm, loan_cleared: e.target.checked, loan_amount: e.target.checked ? "" : vehicleForm.loan_amount })}
                            />
                            <label className="form-check-label">Loan Cleared</label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Vehicle Images</label>
                      <input 
                        type="file" 
                        className="form-control"
                        multiple
                        accept="image/*"
                        onChange={e => setVehicleForm({ ...vehicleForm, images: Array.from(e.target.files) })}
                      />
                      <small className="text-muted">You can select multiple images</small>
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
                              onChange={e => handleDynamicFieldChange(index, "key", e.target.value, 'vehicle')}
                            />
                          </div>
                          <div className="col-md-6">
                            <input 
                              type="text"
                              className="form-control"
                              placeholder="Value"
                              value={field.value}
                              onChange={e => handleDynamicFieldChange(index, "value", e.target.value, 'vehicle')}
                            />
                          </div>
                          <div className="col-md-2">
                            <div className="btn-group">
                              <button 
                                type="button" 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleAddDynamicField('vehicle')}
                              >
                                <i className="fas fa-plus"></i>
                              </button>
                              {dynamicFields.length > 1 && (
                                <button 
                                  type="button" 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleRemoveDynamicField(index, 'vehicle')}
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
                    onClick={() => setShowVehicleModal(false)}
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
                        {editMode ? 'Update Vehicle' : 'Add Vehicle'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sell Vehicle Modal */}
      {showSellModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-handshake me-2"></i>Sell Vehicle
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowSellModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSellVehicle}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Buyer Name *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={sellForm.buyer_name}
                        onChange={e => setSellForm({ ...sellForm, buyer_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Phone Number *</label>
                      <input 
                        type="tel" 
                        className="form-control"
                        value={sellForm.buyer_phone}
                        onChange={e => setSellForm({ ...sellForm, buyer_phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input 
                        type="email" 
                        className="form-control"
                        value={sellForm.buyer_email}
                        onChange={e => setSellForm({ ...sellForm, buyer_email: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Sale Date *</label>
                      <input 
                        type="date" 
                        className="form-control"
                        value={sellForm.sell_date}
                        onChange={e => setSellForm({ ...sellForm, sell_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Sale Price *</label>
                      <input 
                        type="number" 
                        className="form-control"
                        value={sellForm.sell_price}
                        onChange={e => setSellForm({ ...sellForm, sell_price: e.target.value })}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Balance Amount</label>
                      <input 
                        type="number" 
                        className="form-control"
                        value={sellForm.balance_amount}
                        onChange={e => setSellForm({ ...sellForm, balance_amount: e.target.value })}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Buyer Address</label>
                      <textarea 
                        className="form-control"
                        rows="3"
                        value={sellForm.buyer_address}
                        onChange={e => setSellForm({ ...sellForm, buyer_address: e.target.value })}
                      ></textarea>
                    </div>

                    <div className="col-12">
                      <h6>Additional Buyer Details</h6>
                      {sellDynamicFields.map((field, index) => (
                        <div key={index} className="row g-2 mb-2">
                          <div className="col-md-4">
                            <input 
                              type="text"
                              className="form-control"
                              placeholder="Field Name"
                              value={field.key}
                              onChange={e => handleDynamicFieldChange(index, "key", e.target.value, 'sell')}
                            />
                          </div>
                          <div className="col-md-6">
                            <input 
                              type="text"
                              className="form-control"
                              placeholder="Value"
                              value={field.value}
                              onChange={e => handleDynamicFieldChange(index, "value", e.target.value, 'sell')}
                            />
                          </div>
                          <div className="col-md-2">
                            <div className="btn-group">
                              <button 
                                type="button" 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleAddDynamicField('sell')}
                              >
                                <i className="fas fa-plus"></i>
                              </button>
                              {sellDynamicFields.length > 1 && (
                                <button 
                                  type="button" 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleRemoveDynamicField(index, 'sell')}
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
                    onClick={() => setShowSellModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Processing Sale...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-handshake me-2"></i>
                        Complete Sale
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Vehicle Modal */}
      {showViewModal && selectedVehicle && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-car me-2"></i>Vehicle Details
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-12">
                    <h6>{selectedVehicle.brand} {selectedVehicle.model}</h6>
                    <p className="text-muted">{selectedVehicle.vehicle_no}</p>
                  </div>
                  
                  {selectedVehicle.images && selectedVehicle.images.length > 0 && (
                    <div className="col-12">
                      <h6>Images</h6>
                      <div className="row g-2">
                        {selectedVehicle.images.map((image, index) => (
                          <div key={index} className="col-md-3">
                            <img 
                              src={image} 
                              alt={`Vehicle ${index + 1}`} 
                              className="img-fluid rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="col-md-6">
                    <strong>Owner:</strong> {selectedVehicle.users?.full_name || 'N/A'}
                  </div>
                  <div className="col-md-6">
                    <strong>Price:</strong> ₹{selectedVehicle.price?.toLocaleString()}
                  </div>
                  <div className="col-md-6">
                    <strong>Fuel Type:</strong> {selectedVehicle.fuel_type}
                  </div>
                  <div className="col-md-6">
                    <strong>Status:</strong> {selectedVehicle.status === 'in' ? 'Available' : 'Sold'}
                  </div>
                  
                  {selectedVehicle.vehicle_buyers && selectedVehicle.vehicle_buyers.length > 0 && (
                    <div className="col-12">
                      <h6>Buyer Information</h6>
                      <div className="border rounded p-3">
                        <p><strong>Name:</strong> {selectedVehicle.vehicle_buyers[0].buyer_name}</p>
                        <p><strong>Phone:</strong> {selectedVehicle.vehicle_buyers[0].buyer_phone}</p>
                        <p><strong>Sale Price:</strong> ₹{selectedVehicle.vehicle_buyers[0].sell_price?.toLocaleString()}</p>
                        <p><strong>Sale Date:</strong> {new Date(selectedVehicle.vehicle_buyers[0].sell_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}

                  {selectedVehicle.dynamic_fields && Object.keys(selectedVehicle.dynamic_fields).length > 0 && (
                    <div className="col-12">
                      <h6>Additional Information</h6>
                      <div className="border rounded p-3">
                        {Object.entries(selectedVehicle.dynamic_fields).map(([key, value]) => (
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
                {selectedVehicle.status === 'in' && (
                  <div>
                    <button 
                      type="button" 
                      className="btn btn-warning me-2"
                      onClick={() => {
                        setShowViewModal(false);
                        handleEditVehicle(selectedVehicle);
                      }}
                    >
                      <i className="fas fa-edit me-1"></i>Edit
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-success"
                      onClick={() => {
                        setShowViewModal(false);
                        handleSellVehicleAction(selectedVehicle);
                      }}
                    >
                      <i className="fas fa-handshake me-1"></i>Sell
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .container-fluid {
          background-color: #f8f9fa;
          min-height: 100vh;
        }
        
        .card {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .card-header {
          background: linear-gradient(135deg, #343a40 0%, #495057 100%);
          color: white;
          border-bottom: 1px solid #dee2e6;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #343a40 0%, #495057 100%);
          border-color: #343a40;
          color: white;
        }
        
        .btn-primary:hover {
          background: linear-gradient(135deg, #495057 0%, #6c757d 100%);
          border-color: #495057;
        }
        
        .btn-secondary {
          background: #6c757d;
          border-color: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background: #5a6268;
          border-color: #545b62;
        }
        
        .btn-success {
          background: #28a745;
          border-color: #28a745;
        }
        
        .btn-danger {
          background: #dc3545;
          border-color: #dc3545;
        }
        
        .btn-outline-secondary {
          border-color: #6c757d;
          color: #6c757d;
        }
        
        .btn-outline-secondary:hover {
          background: #6c757d;
          color: white;
        }
        
        .modal-content {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
        }
        
        .modal-header {
          background: linear-gradient(135deg, #343a40 0%, #495057 100%);
          color: white;
          border-bottom: 1px solid #dee2e6;
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #343a40 0%, #495057 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .table th {
          background: linear-gradient(135deg, #343a40 0%, #495057 100%);
          color: white;
          border: none;
        }
        
        .table td {
          background: white;
          border-color: #dee2e6;
        }
        
        .table-hover tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        .form-control:focus {
          border-color: #495057;
          box-shadow: 0 0 0 0.2rem rgba(73, 80, 87, 0.25);
        }
        
        .form-select:focus {
          border-color: #495057;
          box-shadow: 0 0 0 0.2rem rgba(73, 80, 87, 0.25);
        }
        
        .nav-tabs .nav-link.active {
          background: linear-gradient(135deg, #343a40 0%, #495057 100%);
          color: white;
          border-color: #343a40;
        }
        
        .nav-tabs .nav-link {
          color: #6c757d;
          border-color: #dee2e6;
        }
        
        .nav-tabs .nav-link:hover {
          color: #343a40;
          border-color: #dee2e6;
        }
        
        .badge {
          font-size: 0.75em;
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
      `}</style>
    </div>
  );
}
