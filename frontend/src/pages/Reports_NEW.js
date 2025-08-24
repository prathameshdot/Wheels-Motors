import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function Reports() {
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedReport, setSelectedReport] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  const [filteredData, setFilteredData] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterDataByDate();
  }, [vehicles, dateRange, selectedUser, selectedStatus]);

  async function fetchData() {
    setLoading(true);
    
    // Fetch vehicles with relations
    const { data: vehiclesData } = await supabase
      .from("vehicles")
      .select(`
        *,
        users(full_name, email),
        vehicle_buyers(*)
      `)
      .order("created_at", { ascending: false });

    // Fetch users
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    // Fetch companies
    const { data: companiesData } = await supabase
      .from("company_details")
      .select(`
        *,
        users(full_name, email)
      `)
      .order("created_at", { ascending: false });

    setVehicles(vehiclesData || []);
    setUsers(usersData || []);
    setCompanies(companiesData || []);
    setLoading(false);
  }

  function filterDataByDate() {
    let filtered = vehicles;

    // Date filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(vehicle => {
        const vehicleDate = new Date(vehicle.created_at).toISOString().split('T')[0];
        return vehicleDate >= dateRange.start && vehicleDate <= dateRange.end;
      });
    }

    // User filter
    if (selectedUser) {
      filtered = filtered.filter(vehicle => vehicle.user_id === selectedUser);
    }

    // Status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter(vehicle => vehicle.status === selectedStatus);
    }

    setFilteredData(filtered);
  }

  function generateOverviewStats() {
    const stats = {
      totalVehicles: vehicles.length,
      availableVehicles: vehicles.filter(v => v.status === 'in').length,
      soldVehicles: vehicles.filter(v => v.status === 'sold').length,
      totalValue: vehicles.reduce((sum, v) => sum + (v.price || 0), 0),
      totalUsers: users.filter(u => u.status === 'active').length,
      totalCompanies: companies.length,
      recentSales: vehicles.filter(v => v.status === 'sold' && v.vehicle_buyers?.length > 0).slice(0, 5),
      topUsers: getUserStats().slice(0, 5),
      monthlyData: generateMonthlyData(),
      profitData: calculateProfitData()
    };

    return stats;
  }

  function getUserStats() {
    const userStats = {};
    
    vehicles.forEach(vehicle => {
      const userId = vehicle.user_id;
      const userName = vehicle.users?.full_name || vehicle.users?.email || 'Unknown';
      
      if (!userStats[userId]) {
        userStats[userId] = {
          name: userName,
          totalVehicles: 0,
          soldVehicles: 0,
          totalValue: 0,
          soldValue: 0
        };
      }
      
      userStats[userId].totalVehicles++;
      userStats[userId].totalValue += vehicle.price || 0;
      
      if (vehicle.status === 'sold') {
        userStats[userId].soldVehicles++;
        if (vehicle.vehicle_buyers && vehicle.vehicle_buyers.length > 0) {
          userStats[userId].soldValue += vehicle.vehicle_buyers[0].sell_price || 0;
        }
      }
    });

    return Object.values(userStats)
      .sort((a, b) => b.soldValue - a.soldValue);
  }

  function calculateProfitData() {
    let totalProfit = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    vehicles.forEach(vehicle => {
      if (vehicle.status === 'sold' && vehicle.vehicle_buyers && vehicle.vehicle_buyers.length > 0) {
        const sellPrice = vehicle.vehicle_buyers[0].sell_price || 0;
        const buyPrice = vehicle.price || 0;
        
        totalRevenue += sellPrice;
        totalCost += buyPrice;
        totalProfit += (sellPrice - buyPrice);
      }
    });

    return {
      totalProfit,
      totalRevenue,
      totalCost,
      profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0
    };
  }

  function generateMonthlyData() {
    const monthlyStats = {};
    
    vehicles.forEach(vehicle => {
      const month = new Date(vehicle.created_at).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = { added: 0, sold: 0, value: 0, revenue: 0 };
      }
      
      monthlyStats[month].added++;
      monthlyStats[month].value += vehicle.price || 0;
      
      if (vehicle.status === 'sold' && vehicle.vehicle_buyers && vehicle.vehicle_buyers.length > 0) {
        monthlyStats[month].sold++;
        monthlyStats[month].revenue += vehicle.vehicle_buyers[0].sell_price || 0;
      }
    });

    return Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12); // Last 12 months
  }

  function exportToPDF(reportType = 'overview') {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text('Vehicle Management Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    if (reportType === 'overview') {
      const stats = generateOverviewStats();
      
      // Overview Statistics
      doc.setFontSize(16);
      doc.text('Overview Statistics', 15, 50);
      
      const overviewData = [
        ['Total Vehicles', stats.totalVehicles.toString()],
        ['Available Vehicles', stats.availableVehicles.toString()],
        ['Sold Vehicles', stats.soldVehicles.toString()],
        ['Total Value', `₹${stats.totalValue.toLocaleString()}`],
        ['Total Users', stats.totalUsers.toString()],
        ['Total Companies', stats.totalCompanies.toString()],
        ['Total Profit', `₹${stats.profitData.totalProfit.toLocaleString()}`],
        ['Profit Margin', `${stats.profitData.profitMargin.toFixed(2)}%`]
      ];
      
      doc.autoTable({
        startY: 60,
        head: [['Metric', 'Value']],
        body: overviewData,
        theme: 'grid',
        headStyles: { fillColor: [52, 58, 64] }
      });
      
      // Recent Sales
      if (stats.recentSales.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Recent Sales', 15, 20);
        
        const salesData = stats.recentSales.map(vehicle => [
          vehicle.vehicle_no,
          `${vehicle.brand} ${vehicle.model}`,
          vehicle.vehicle_buyers[0]?.buyer_name || 'N/A',
          `₹${(vehicle.vehicle_buyers[0]?.sell_price || 0).toLocaleString()}`,
          new Date(vehicle.vehicle_buyers[0]?.sell_date || vehicle.updated_at).toLocaleDateString()
        ]);
        
        doc.autoTable({
          startY: 30,
          head: [['Vehicle No', 'Vehicle', 'Buyer', 'Sale Price', 'Sale Date']],
          body: salesData,
          theme: 'grid',
          headStyles: { fillColor: [52, 58, 64] }
        });
      }
    } else if (reportType === 'vehicles') {
      // Vehicle List
      doc.setFontSize(16);
      doc.text('Vehicle List', 15, 50);
      
      const vehicleData = filteredData.map(vehicle => [
        vehicle.vehicle_no,
        `${vehicle.brand} ${vehicle.model}`,
        vehicle.users?.full_name || 'N/A',
        `₹${(vehicle.price || 0).toLocaleString()}`,
        vehicle.status === 'in' ? 'Available' : 'Sold',
        new Date(vehicle.created_at).toLocaleDateString()
      ]);
      
      doc.autoTable({
        startY: 60,
        head: [['Vehicle No', 'Vehicle', 'Owner', 'Price', 'Status', 'Added Date']],
        body: vehicleData,
        theme: 'grid',
        headStyles: { fillColor: [52, 58, 64] }
      });
    }
    
    doc.save(`vehicle-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  function exportToExcel(reportType = 'overview') {
    const wb = XLSX.utils.book_new();
    
    if (reportType === 'overview') {
      const stats = generateOverviewStats();
      
      // Overview Sheet
      const overviewData = [
        ['Metric', 'Value'],
        ['Total Vehicles', stats.totalVehicles],
        ['Available Vehicles', stats.availableVehicles],
        ['Sold Vehicles', stats.soldVehicles],
        ['Total Value', stats.totalValue],
        ['Total Users', stats.totalUsers],
        ['Total Companies', stats.totalCompanies],
        ['Total Profit', stats.profitData.totalProfit],
        ['Profit Margin (%)', stats.profitData.profitMargin.toFixed(2)]
      ];
      
      const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, overviewWs, 'Overview');
      
      // Monthly Data Sheet
      const monthlyHeaders = ['Month', 'Added', 'Sold', 'Purchase Value', 'Revenue'];
      const monthlyData = [
        monthlyHeaders,
        ...stats.monthlyData.map(([month, data]) => [
          month,
          data.added,
          data.sold,
          data.value,
          data.revenue
        ])
      ];
      
      const monthlyWs = XLSX.utils.aoa_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(wb, monthlyWs, 'Monthly Data');
    }
    
    // Vehicles Sheet
    const vehicleHeaders = ['Vehicle No', 'Brand', 'Model', 'Owner', 'Price', 'Status', 'Added Date', 'Fuel Type'];
    const vehicleData = [
      vehicleHeaders,
      ...filteredData.map(vehicle => [
        vehicle.vehicle_no,
        vehicle.brand,
        vehicle.model,
        vehicle.users?.full_name || 'N/A',
        vehicle.price || 0,
        vehicle.status === 'in' ? 'Available' : 'Sold',
        new Date(vehicle.created_at).toLocaleDateString(),
        vehicle.fuel_type
      ])
    ];
    
    const vehicleWs = XLSX.utils.aoa_to_sheet(vehicleData);
    XLSX.utils.book_append_sheet(wb, vehicleWs, 'Vehicles');
    
    // Save the file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `vehicle-report-${reportType}-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const stats = generateOverviewStats();

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          <i className="fas fa-chart-bar me-2"></i>Reports & Analytics
        </h1>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-success"
            onClick={() => exportToExcel(selectedReport)}
          >
            <i className="fas fa-file-excel me-2"></i>Export Excel
          </button>
          <button 
            className="btn btn-danger"
            onClick={() => exportToPDF(selectedReport)}
          >
            <i className="fas fa-file-pdf me-2"></i>Export PDF
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Report Type</label>
              <select 
                className="form-select"
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
              >
                <option value="overview">Overview</option>
                <option value="vehicles">Vehicle Details</option>
                <option value="sales">Sales Report</option>
                <option value="users">User Performance</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Start Date</label>
              <input 
                type="date" 
                className="form-control"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">End Date</label>
              <input 
                type="date" 
                className="form-control"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Filter by User</label>
              <select 
                className="form-select"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Report Content */}
      {!loading && (
        <>
          {/* Overview Report */}
          {selectedReport === "overview" && (
            <>
              {/* Summary Cards */}
              <div className="row mb-4">
                <div className="col-xl-3 col-md-6 mb-4">
                  <div className="card border-left-primary shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                            Total Vehicles
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            {stats.totalVehicles}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-car fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                  <div className="card border-left-success shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                            Total Revenue
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            ₹{stats.profitData.totalRevenue.toLocaleString()}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-rupee-sign fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                  <div className="card border-left-info shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                            Total Profit
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            ₹{stats.profitData.totalProfit.toLocaleString()}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-chart-line fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                  <div className="card border-left-warning shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                            Profit Margin
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            {stats.profitData.profitMargin.toFixed(2)}%
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-percentage fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Performance Chart */}
              <div className="row mb-4">
                <div className="col-lg-6">
                  <div className="card shadow">
                    <div className="card-header">
                      <h6 className="m-0 font-weight-bold text-primary">Monthly Performance</h6>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Month</th>
                              <th>Added</th>
                              <th>Sold</th>
                              <th>Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.monthlyData.map(([month, data]) => (
                              <tr key={month}>
                                <td>{month}</td>
                                <td>{data.added}</td>
                                <td>{data.sold}</td>
                                <td>₹{data.revenue.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="card shadow">
                    <div className="card-header">
                      <h6 className="m-0 font-weight-bold text-primary">Top Performers</h6>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>User</th>
                              <th>Vehicles</th>
                              <th>Sold</th>
                              <th>Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.topUsers.map((user, index) => (
                              <tr key={index}>
                                <td>{user.name}</td>
                                <td>{user.totalVehicles}</td>
                                <td>{user.soldVehicles}</td>
                                <td>₹{user.soldValue.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Sales */}
              {stats.recentSales.length > 0 && (
                <div className="card shadow mb-4">
                  <div className="card-header">
                    <h6 className="m-0 font-weight-bold text-primary">Recent Sales</h6>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Vehicle</th>
                            <th>Buyer</th>
                            <th>Sale Price</th>
                            <th>Profit</th>
                            <th>Sale Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentSales.map(vehicle => {
                            const buyer = vehicle.vehicle_buyers[0];
                            const profit = (buyer?.sell_price || 0) - (vehicle.price || 0);
                            return (
                              <tr key={vehicle.id}>
                                <td>
                                  <strong>{vehicle.brand} {vehicle.model}</strong><br />
                                  <small className="text-muted">{vehicle.vehicle_no}</small>
                                </td>
                                <td>
                                  <strong>{buyer?.buyer_name}</strong><br />
                                  <small className="text-muted">{buyer?.buyer_phone}</small>
                                </td>
                                <td>₹{(buyer?.sell_price || 0).toLocaleString()}</td>
                                <td className={profit >= 0 ? 'text-success' : 'text-danger'}>
                                  ₹{profit.toLocaleString()}
                                </td>
                                <td>{new Date(buyer?.sell_date || vehicle.updated_at).toLocaleDateString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Vehicle Details Report */}
          {selectedReport === "vehicles" && (
            <div className="card shadow">
              <div className="card-header">
                <h6 className="m-0 font-weight-bold text-primary">
                  Vehicle Details Report ({filteredData.length} vehicles)
                </h6>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>Vehicle Details</th>
                        <th>Owner</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Added Date</th>
                        <th>Insurance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map(vehicle => (
                        <tr key={vehicle.id}>
                          <td>
                            <strong>{vehicle.brand} {vehicle.model}</strong><br />
                            <small className="text-muted">{vehicle.vehicle_no}</small><br />
                            <small className="text-muted">{vehicle.fuel_type}</small>
                          </td>
                          <td>
                            <strong>{vehicle.users?.full_name || 'N/A'}</strong><br />
                            <small className="text-muted">{vehicle.users?.email}</small>
                          </td>
                          <td>₹{(vehicle.price || 0).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${vehicle.status === 'in' ? 'bg-success' : 'bg-danger'}`}>
                              {vehicle.status === 'in' ? 'Available' : 'Sold'}
                            </span>
                          </td>
                          <td>{new Date(vehicle.created_at).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${vehicle.insurance_done ? 'bg-success' : 'bg-warning'}`}>
                              {vehicle.insurance_done ? 'Insured' : 'Not Insured'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sales Report */}
          {selectedReport === "sales" && (
            <div className="card shadow">
              <div className="card-header">
                <h6 className="m-0 font-weight-bold text-primary">Sales Report</h6>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>Vehicle</th>
                        <th>Purchase Price</th>
                        <th>Sale Price</th>
                        <th>Profit/Loss</th>
                        <th>Buyer</th>
                        <th>Sale Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.filter(v => v.status === 'sold' && v.vehicle_buyers?.length > 0).map(vehicle => {
                        const buyer = vehicle.vehicle_buyers[0];
                        const profit = (buyer?.sell_price || 0) - (vehicle.price || 0);
                        return (
                          <tr key={vehicle.id}>
                            <td>
                              <strong>{vehicle.brand} {vehicle.model}</strong><br />
                              <small className="text-muted">{vehicle.vehicle_no}</small>
                            </td>
                            <td>₹{(vehicle.price || 0).toLocaleString()}</td>
                            <td>₹{(buyer?.sell_price || 0).toLocaleString()}</td>
                            <td className={profit >= 0 ? 'text-success' : 'text-danger'}>
                              <strong>₹{profit.toLocaleString()}</strong>
                            </td>
                            <td>
                              <strong>{buyer?.buyer_name}</strong><br />
                              <small className="text-muted">{buyer?.buyer_phone}</small>
                            </td>
                            <td>{new Date(buyer?.sell_date || vehicle.updated_at).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* User Performance Report */}
          {selectedReport === "users" && (
            <div className="card shadow">
              <div className="card-header">
                <h6 className="m-0 font-weight-bold text-primary">User Performance Report</h6>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>User</th>
                        <th>Total Vehicles</th>
                        <th>Sold Vehicles</th>
                        <th>Success Rate</th>
                        <th>Total Revenue</th>
                        <th>Avg. Sale Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getUserStats().map((user, index) => (
                        <tr key={index}>
                          <td>
                            <strong>{user.name}</strong>
                          </td>
                          <td>{user.totalVehicles}</td>
                          <td>{user.soldVehicles}</td>
                          <td>
                            <span className="badge bg-info">
                              {user.totalVehicles > 0 ? ((user.soldVehicles / user.totalVehicles) * 100).toFixed(1) : 0}%
                            </span>
                          </td>
                          <td>₹{user.soldValue.toLocaleString()}</td>
                          <td>
                            ₹{user.soldVehicles > 0 ? Math.round(user.soldValue / user.soldVehicles).toLocaleString() : 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
