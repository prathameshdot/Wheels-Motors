import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Vehicles() {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(location.state?.tab || "add");
  
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
  }, []);

  async function fetchUsers() {
    const { data } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("status", "active")
      .order("full_name");
    setUsers(data || []);
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

  // Dynamic field management for Add Vehicle
  function addDynamicField() {
    setDynamicFields([...dynamicFields, { key: "", value: "" }]);
  }

  function removeDynamicField(index) {
    if (dynamicFields.length > 1) {
      setDynamicFields(dynamicFields.filter((_, i) => i !== index));
    }
  }

  function updateDynamicField(index, field, value) {
    const updated = [...dynamicFields];
    updated[index][field] = value;
    setDynamicFields(updated);
  }

  // Dynamic field management for Sell Vehicle
  function addSellDynamicField() {
    setSellDynamicFields([...sellDynamicFields, { key: "", value: "" }]);
  }

  function removeSellDynamicField(index) {
    if (sellDynamicFields.length > 1) {
      setSellDynamicFields(sellDynamicFields.filter((_, i) => i !== index));
    }
  }

  function updateSellDynamicField(index, field, value) {
    const updated = [...sellDynamicFields];
    updated[index][field] = value;
    setSellDynamicFields(updated);
  }

  async function uploadImages(files) {
    const urls = [];
    for (const file of files) {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
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

  async function handleAddVehicle(e) {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrls = [];
      if (vehicleForm.images.length > 0) {
        imageUrls = await uploadImages(vehicleForm.images);
      }

      // Process dynamic fields
      const dynamicFieldsData = {};
      dynamicFields.forEach(field => {
        if (field.key && field.value) {
          dynamicFieldsData[field.key] = field.value;
        }
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
        dynamic_fields: dynamicFieldsData
      };

      const { error } = await supabase.from("vehicles").insert([vehicleData]);
      
      if (error) throw error;

      resetVehicleForm();
      fetchAvailableVehicles();
      alert("Vehicle added successfully!");
    } catch (error) {
      console.error("Error adding vehicle:", error);
      alert("Error adding vehicle: " + error.message);
    }
    
    setLoading(false);
  }

  async function handleSellVehicle(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // Process dynamic fields for sale
      const sellDynamicFieldsData = {};
      sellDynamicFields.forEach(field => {
        if (field.key && field.value) {
          sellDynamicFieldsData[field.key] = field.value;
        }
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
          dynamic_fields: sellDynamicFieldsData
        }]);

      if (buyerError) throw buyerError;

      // Update vehicle status
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ status: "sold" })
        .eq("id", sellForm.vehicle_id);

      if (vehicleError) throw vehicleError;

      resetSellForm();
      fetchAvailableVehicles();
      alert("Vehicle sold successfully!");
    } catch (error) {
      console.error("Error selling vehicle:", error);
      alert("Error selling vehicle: " + error.message);
    }
    
    setLoading(false);
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          <i className="fas fa-car me-2"></i>Manage Vehicles
        </h1>
      </div>

      {/* Tabs */}
      <div className="card shadow mb-4">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${tab === "add" ? "active" : ""}`}
                onClick={() => setTab("add")}
              >
                <i className="fas fa-plus me-2"></i>Add Vehicle
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${tab === "sell" ? "active" : ""}`}
                onClick={() => setTab("sell")}
              >
                <i className="fas fa-handshake me-2"></i>Sell Vehicle
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          {/* Add Vehicle Tab */}
          {tab === "add" && (
            <form onSubmit={handleAddVehicle}>
              <h5 className="text-primary mb-3">
                <i className="fas fa-info-circle me-2"></i>Static Fields
              </h5>
              
              <div className="row g-3 mb-4">
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
                  <label className="form-label">Vehicle Images</label>
                  <input 
                    type="file" 
                    className="form-control"
                    multiple
                    accept="image/*"
                    onChange={e => setVehicleForm({ ...vehicleForm, images: Array.from(e.target.files) })}
                  />
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
              </div>

              {/* Dynamic Fields for Add Vehicle */}
              <h5 className="text-primary mb-3">
                <i className="fas fa-plus-circle me-2"></i>Dynamic Fields
              </h5>
              
              {dynamicFields.map((field, index) => (
                <div key={index} className="row g-3 mb-3">
                  <div className="col-md-4">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Field Name (e.g., Engine Number)"
                      value={field.key}
                      onChange={e => updateDynamicField(index, 'key', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Field Value"
                      value={field.value}
                      onChange={e => updateDynamicField(index, 'value', e.target.value)}
                    />
                  </div>
                  <div className="col-md-2">
                    <div className="d-flex gap-2">
                      {index === dynamicFields.length - 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={addDynamicField}
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      )}
                      {dynamicFields.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeDynamicField(index)}
                        >
                          <i className="fas fa-minus"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="col-12 mt-4">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Adding Vehicle...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus me-2"></i>
                      Add Vehicle
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Sell Vehicle Tab */}
          {tab === "sell" && (
            <form onSubmit={handleSellVehicle}>
              <h5 className="text-primary mb-3">
                <i className="fas fa-info-circle me-2"></i>Sale Information
              </h5>
              
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label">Select Vehicle *</label>
                  <select 
                    className="form-select"
                    value={sellForm.vehicle_id}
                    onChange={e => {
                      const selectedVehicle = vehicles.find(v => v.id === e.target.value);
                      setSellForm({ 
                        ...sellForm, 
                        vehicle_id: e.target.value,
                        sell_price: selectedVehicle ? selectedVehicle.price : ""
                      });
                    }}
                    required
                  >
                    <option value="">Choose vehicle to sell...</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_no} - {vehicle.brand} {vehicle.model} (₹{vehicle.price?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Buyer Name *</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={sellForm.buyer_name}
                    onChange={e => setSellForm({ ...sellForm, buyer_name: e.target.value })}
                    required
                    placeholder="Enter buyer's full name"
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
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-control"
                    value={sellForm.buyer_email}
                    onChange={e => setSellForm({ ...sellForm, buyer_email: e.target.value })}
                    placeholder="buyer@example.com"
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
                  <label className="form-label">Balance Amount</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={sellForm.balance_amount}
                    onChange={e => setSellForm({ ...sellForm, balance_amount: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="Pending amount (if any)"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">ID Proof Document</label>
                  <input 
                    type="file" 
                    className="form-control"
                    accept="image/*,application/pdf"
                    onChange={e => setSellForm({ ...sellForm, id_proof: e.target.files[0] })}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Buyer Address</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    value={sellForm.buyer_address}
                    onChange={e => setSellForm({ ...sellForm, buyer_address: e.target.value })}
                    placeholder="Enter complete address"
                  ></textarea>
                </div>
              </div>

              {/* Dynamic Fields for Sell Vehicle */}
              <h5 className="text-primary mb-3">
                <i className="fas fa-plus-circle me-2"></i>Additional Sale Details
              </h5>
              
              {sellDynamicFields.map((field, index) => (
                <div key={index} className="row g-3 mb-3">
                  <div className="col-md-4">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Field Name (e.g., Payment Method)"
                      value={field.key}
                      onChange={e => updateSellDynamicField(index, 'key', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Field Value"
                      value={field.value}
                      onChange={e => updateSellDynamicField(index, 'value', e.target.value)}
                    />
                  </div>
                  <div className="col-md-2">
                    <div className="d-flex gap-2">
                      {index === sellDynamicFields.length - 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={addSellDynamicField}
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      )}
                      {sellDynamicFields.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeSellDynamicField(index)}
                        >
                          <i className="fas fa-minus"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="col-12 mt-4">
                <button type="submit" className="btn btn-danger" disabled={loading || !sellForm.vehicle_id}>
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
          )}
        </div>
      </div>
    </div>
  );
}
