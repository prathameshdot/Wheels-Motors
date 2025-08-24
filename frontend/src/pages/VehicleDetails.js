import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function VehicleDetails() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchTerm, statusFilter]);

  async function fetchVehicles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicles")
      .select(`
        *,
        users(full_name, email, phone),
        vehicle_buyers(
          buyer_name,
          buyer_phone,
          sell_price,
          sell_date,
          balance_amount
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching vehicles:", error);
    } else {
      setVehicles(data || []);
    }
    setLoading(false);
  }

  function filterVehicles() {
    let filtered = vehicles;

    if (statusFilter !== "all") {
      filtered = filtered.filter(vehicle => vehicle.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(vehicle =>
        vehicle.vehicle_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredVehicles(filtered);
  }

  function handleAddVehicle() {
    navigate("/vehicles");
  }

  function handleSellVehicle(vehicle) {
    navigate("/vehicles", { 
      state: { 
        tab: "sell", 
        preSelectedVehicle: vehicle.id 
      } 
    });
  }

  function showVehicleDetails(vehicle) {
    setSelectedVehicle(vehicle);
    setShowModal(true);
  }

  function getStatusBadge(status) {
    switch (status) {
      case "in":
        return <span className="badge bg-success">Available</span>;
      case "sold":
        return <span className="badge bg-danger">Sold</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          <i className="fas fa-car me-2"></i>Vehicle Details
        </h1>
        <button className="btn btn-primary" onClick={handleAddVehicle}>
          <i className="fas fa-plus me-2"></i>Add New Vehicle
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card shadow mb-4">
        <div className="card-header">
          <div className="row g-3 align-items-center">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by vehicle number, brand, model, or owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
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
            <div className="col-md-3">
              <div className="text-muted">
                Total: {filteredVehicles.length} vehicles
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="row">
        {filteredVehicles.map((vehicle) => (
          <div key={vehicle.id} className="col-lg-6 col-xl-4 mb-4">
            <div className="card shadow h-100">
              {vehicle.images && vehicle.images.length > 0 && (
                <img
                  src={vehicle.images[0]}
                  className="card-img-top"
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  style={{ height: "200px", objectFit: "cover" }}
                />
              )}
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="card-title mb-0">
                    {vehicle.brand} {vehicle.model}
                  </h5>
                  {getStatusBadge(vehicle.status)}
                </div>
                
                <p className="card-text">
                  <strong>Vehicle No:</strong> {vehicle.vehicle_no}<br />
                  <strong>Owner:</strong> {vehicle.users?.full_name || vehicle.users?.email}<br />
                  <strong>Fuel Type:</strong> {vehicle.fuel_type}<br />
                  <strong>Price:</strong> ₹{vehicle.price?.toLocaleString()}
                </p>

                {vehicle.status === "sold" && vehicle.vehicle_buyers && vehicle.vehicle_buyers.length > 0 && (
                  <div className="text-muted small">
                    <strong>Sold to:</strong> {vehicle.vehicle_buyers[0].buyer_name}<br />
                    <strong>Sale Price:</strong> ₹{vehicle.vehicle_buyers[0].sell_price?.toLocaleString()}<br />
                    <strong>Sale Date:</strong> {formatDate(vehicle.vehicle_buyers[0].sell_date)}
                  </div>
                )}

                <div className="mt-3">
                  <button
                    className="btn btn-info btn-sm me-2"
                    onClick={() => showVehicleDetails(vehicle)}
                  >
                    <i className="fas fa-eye me-1"></i>View Details
                  </button>
                  
                  {vehicle.status === "in" && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleSellVehicle(vehicle)}
                    >
                      <i className="fas fa-handshake me-1"></i>Sell
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVehicles.length === 0 && !loading && (
        <div className="text-center py-5">
          <i className="fas fa-car fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">No vehicles found</h5>
          <p className="text-muted">
            {searchTerm || statusFilter !== "all" 
              ? "Try adjusting your search or filters" 
              : "Start by adding your first vehicle"
            }
          </p>
          <button className="btn btn-primary" onClick={handleAddVehicle}>
            <i className="fas fa-plus me-2"></i>Add Vehicle
          </button>
        </div>
      )}

      {/* Vehicle Details Modal */}
      {showModal && selectedVehicle && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-car me-2"></i>
                  {selectedVehicle.brand} {selectedVehicle.model} Details
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {selectedVehicle.images && selectedVehicle.images.length > 0 && (
                    <div className="col-12 mb-3">
                      <div className="row">
                        {selectedVehicle.images.map((image, index) => (
                          <div key={index} className="col-md-4 mb-2">
                            <img
                              src={image}
                              className="img-fluid rounded"
                              alt={`Vehicle ${index + 1}`}
                              style={{ height: "150px", width: "100%", objectFit: "cover" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="col-md-6">
                    <h6 className="text-primary">Vehicle Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Vehicle Number:</strong></td>
                          <td>{selectedVehicle.vehicle_no}</td>
                        </tr>
                        <tr>
                          <td><strong>Brand:</strong></td>
                          <td>{selectedVehicle.brand}</td>
                        </tr>
                        <tr>
                          <td><strong>Model:</strong></td>
                          <td>{selectedVehicle.model}</td>
                        </tr>
                        <tr>
                          <td><strong>Fuel Type:</strong></td>
                          <td>{selectedVehicle.fuel_type}</td>
                        </tr>
                        <tr>
                          <td><strong>Price:</strong></td>
                          <td>₹{selectedVehicle.price?.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>{getStatusBadge(selectedVehicle.status)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="col-md-6">
                    <h6 className="text-primary">Owner Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Name:</strong></td>
                          <td>{selectedVehicle.users?.full_name || "N/A"}</td>
                        </tr>
                        <tr>
                          <td><strong>Email:</strong></td>
                          <td>{selectedVehicle.users?.email}</td>
                        </tr>
                        <tr>
                          <td><strong>Phone:</strong></td>
                          <td>{selectedVehicle.users?.phone || "N/A"}</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <h6 className="text-primary mt-3">Dates & Documents</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Purchase Date:</strong></td>
                          <td>{formatDate(selectedVehicle.purchase_date)}</td>
                        </tr>
                        <tr>
                          <td><strong>Insurance Expiry:</strong></td>
                          <td>{formatDate(selectedVehicle.insurance_expiry)}</td>
                        </tr>
                        <tr>
                          <td><strong>RC Available:</strong></td>
                          <td>
                            {selectedVehicle.rc_available ? 
                              <span className="badge bg-success">Yes</span> : 
                              <span className="badge bg-danger">No</span>
                            }
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Insurance Done:</strong></td>
                          <td>
                            {selectedVehicle.insurance_done ? 
                              <span className="badge bg-success">Yes</span> : 
                              <span className="badge bg-danger">No</span>
                            }
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Loan Status:</strong></td>
                          <td>
                            {selectedVehicle.loan_cleared ? 
                              <span className="badge bg-success">Cleared</span> : 
                              <span className="badge bg-warning">₹{selectedVehicle.loan_amount?.toLocaleString()} Pending</span>
                            }
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {selectedVehicle.status === "sold" && selectedVehicle.vehicle_buyers && selectedVehicle.vehicle_buyers.length > 0 && (
                    <div className="col-12 mt-3">
                      <h6 className="text-primary">Sale Information</h6>
                      <table className="table table-sm">
                        <tbody>
                          <tr>
                            <td><strong>Buyer Name:</strong></td>
                            <td>{selectedVehicle.vehicle_buyers[0].buyer_name}</td>
                          </tr>
                          <tr>
                            <td><strong>Buyer Phone:</strong></td>
                            <td>{selectedVehicle.vehicle_buyers[0].buyer_phone}</td>
                          </tr>
                          <tr>
                            <td><strong>Sale Price:</strong></td>
                            <td>₹{selectedVehicle.vehicle_buyers[0].sell_price?.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td><strong>Sale Date:</strong></td>
                            <td>{formatDate(selectedVehicle.vehicle_buyers[0].sell_date)}</td>
                          </tr>
                          {selectedVehicle.vehicle_buyers[0].balance_amount > 0 && (
                            <tr>
                              <td><strong>Balance Amount:</strong></td>
                              <td className="text-warning">₹{selectedVehicle.vehicle_buyers[0].balance_amount?.toLocaleString()}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                {selectedVehicle.status === "in" && (
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      setShowModal(false);
                      handleSellVehicle(selectedVehicle);
                    }}
                  >
                    <i className="fas fa-handshake me-2"></i>Sell Vehicle
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
