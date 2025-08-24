import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function CompanyDetails() {
  const [company, setCompany] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    logo: null,
    description: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanyDetails();
  }, []);

  async function fetchCompanyDetails() {
    const { data } = await supabase
      .from("company_details")
      .select("*")
      .single();
    
    if (data) {
      setCompany(data);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("company_details")
        .upsert([company]);

      if (error) throw error;
      alert("Company details updated successfully!");
    } catch (error) {
      console.error("Error updating company details:", error);
      alert("Error updating company details: " + error.message);
    }

    setLoading(false);
  }

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          <i className="fas fa-building me-2"></i>Company Details
        </h1>
      </div>

      <div className="card shadow mb-4">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={company.name}
                  onChange={e => setCompany({ ...company, name: e.target.value })}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-control"
                  value={company.email}
                  onChange={e => setCompany({ ...company, email: e.target.value })}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-control"
                  value={company.phone}
                  onChange={e => setCompany({ ...company, phone: e.target.value })}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Website</label>
                <input
                  type="url"
                  className="form-control"
                  value={company.website}
                  onChange={e => setCompany({ ...company, website: e.target.value })}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Address</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={company.address}
                  onChange={e => setCompany({ ...company, address: e.target.value })}
                ></textarea>
              </div>

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={company.description}
                  onChange={e => setCompany({ ...company, description: e.target.value })}
                ></textarea>
              </div>

              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>
                      Update Company Details
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
