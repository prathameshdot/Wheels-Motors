import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default function DashboardHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVehicles: 0,
    totalReports: 0,
    activeUsers: 0,
    vehiclesSold: 0,
    totalRevenue: 0
  });

  const [chartData, setChartData] = useState({
    vehicleByBrand: [],
    salesTrend: [],
    userGrowth: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, []);

  async function fetchStats() {
    try {
      const [usersResult, vehiclesResult, reportsResult] = await Promise.all([
        supabase.from("users").select("*", { count: "exact" }),
        supabase.from("vehicles").select("*", { count: "exact" }),
        supabase.from("reports").select("*", { count: "exact" })
      ]);

      const activeUsersResult = await supabase
        .from("users")
        .select("*", { count: "exact" })
        .eq("status", "active");

      const soldVehiclesResult = await supabase
        .from("vehicles")
        .select("*", { count: "exact" })
        .eq("status", "out");

      // Calculate total revenue from sold vehicles
      const { data: soldVehicles } = await supabase
        .from("vehicle_buyers")
        .select("sell_price");

      const totalRevenue = soldVehicles?.reduce((sum, sale) => sum + (sale.sell_price || 0), 0) || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalVehicles: vehiclesResult.count || 0,
        totalReports: reportsResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        vehiclesSold: soldVehiclesResult.count || 0,
        totalRevenue: totalRevenue
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }

  async function fetchChartData() {
    try {
      // Vehicle distribution by brand
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("brand");

      const brandCounts = {};
      vehicles?.forEach(vehicle => {
        const brand = vehicle.brand || 'Unknown';
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
      });

      // User growth trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: userGrowth } = await supabase
        .from("users")
        .select("created_at")
        .gte("created_at", sixMonthsAgo.toISOString());

      // Process user growth data by month
      const monthlyGrowth = {};
      userGrowth?.forEach(user => {
        const month = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyGrowth[month] = (monthlyGrowth[month] || 0) + 1;
      });

      setChartData({
        vehicleByBrand: Object.entries(brandCounts).map(([brand, count]) => ({ brand, count })),
        userGrowth: Object.entries(monthlyGrowth).map(([month, count]) => ({ month, count }))
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching chart data:", error);
      setLoading(false);
    }
  }

  // Chart configurations
  const vehicleBrandData = {
    labels: chartData.vehicleByBrand.map(item => item.brand),
    datasets: [
      {
        label: 'Vehicles by Brand',
        data: chartData.vehicleByBrand.map(item => item.count),
        backgroundColor: [
          'rgba(0, 123, 255, 0.8)',
          'rgba(40, 167, 69, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(220, 53, 69, 0.8)',
          'rgba(23, 162, 184, 0.8)',
          'rgba(108, 117, 125, 0.8)',
        ],
        borderColor: [
          'rgba(0, 123, 255, 1)',
          'rgba(40, 167, 69, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(220, 53, 69, 1)',
          'rgba(23, 162, 184, 1)',
          'rgba(108, 117, 125, 1)',
        ],
        borderWidth: 2
      }
    ]
  };

  const userGrowthData = {
    labels: chartData.userGrowth.map(item => item.month),
    datasets: [
      {
        label: 'New Users',
        data: chartData.userGrowth.map(item => item.count),
        borderColor: 'rgba(0, 123, 255, 1)',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(0, 123, 255, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: 'Poppins',
            size: 12
          }
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            family: 'Poppins'
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            family: 'Poppins'
          }
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            family: 'Poppins',
            size: 12
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{height: '400px'}}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header Section */}
      <div className="row mb-4">
        <div className="col">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h2 mb-2 text-gradient">Dashboard Overview</h1>
              <p className="text-muted mb-0">Welcome to your comprehensive admin dashboard</p>
            </div>
            <div className="glass-effect p-3 rounded">
              <i className="fas fa-chart-line fa-2x text-primary"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-xl-2 col-md-4 mb-4">
          <div className="card stats-card primary h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Users
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">
                    {stats.totalUsers.toLocaleString()}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-users fa-2x text-primary opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-2 col-md-4 mb-4">
          <div className="card stats-card success h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Active Users
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">
                    {stats.activeUsers.toLocaleString()}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-user-check fa-2x text-success opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-2 col-md-4 mb-4">
          <div className="card stats-card info h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Total Vehicles
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">
                    {stats.totalVehicles.toLocaleString()}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-car fa-2x text-info opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-2 col-md-4 mb-4">
          <div className="card stats-card warning h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Vehicles Sold
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">
                    {stats.vehiclesSold.toLocaleString()}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-handshake fa-2x text-warning opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-2 col-md-4 mb-4">
          <div className="card stats-card success h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Total Revenue
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">
                    ₹{stats.totalRevenue.toLocaleString()}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-rupee-sign fa-2x text-success opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-2 col-md-4 mb-4">
          <div className="card stats-card primary h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Reports
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">
                    {stats.totalReports.toLocaleString()}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-chart-area fa-2x text-primary opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="row mb-4">
        <div className="col-lg-8 mb-4">
          <div className="card h-100 futuristic-border">
            <div className="card-header">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-chart-line me-2"></i>User Growth Trend
              </h6>
            </div>
            <div className="card-body">
              <div className="chart-container" style={{height: '300px'}}>
                <Line data={userGrowthData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card h-100 futuristic-border">
            <div className="card-header">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-chart-pie me-2"></i>Vehicles by Brand
              </h6>
            </div>
            <div className="card-body">
              <div className="chart-container" style={{height: '300px'}}>
                <Pie data={vehicleBrandData} options={pieOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & System Info */}
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="card futuristic-border">
            <div className="card-header">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-bolt me-2"></i>Quick Actions
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <button 
                    className="btn btn-primary btn-lg w-100 d-flex align-items-center justify-content-center"
                    onClick={() => navigate('/dashboard/users')}
                  >
                    <i className="fas fa-user-plus me-2"></i>Add New User
                  </button>
                </div>
                <div className="col-md-6">
                  <button 
                    className="btn btn-success btn-lg w-100 d-flex align-items-center justify-content-center"
                    onClick={() => navigate('/dashboard/vehicles')}
                  >
                    <i className="fas fa-car me-2"></i>Add Vehicle
                  </button>
                </div>
                <div className="col-md-6">
                  <button 
                    className="btn btn-info btn-lg w-100 d-flex align-items-center justify-content-center"
                    onClick={() => navigate('/dashboard/reports')}
                  >
                    <i className="fas fa-chart-bar me-2"></i>Generate Report
                  </button>
                </div>
                <div className="col-md-6">
                  <button 
                    className="btn btn-warning btn-lg w-100 d-flex align-items-center justify-content-center"
                    onClick={() => navigate('/dashboard/company')}
                  >
                    <i className="fas fa-building me-2"></i>Company Setup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <div className="card futuristic-border">
            <div className="card-header">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-info-circle me-2"></i>System Information
              </h6>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6 mb-3">
                  <div className="p-3 bg-light rounded">
                    <i className="fas fa-server fa-2x text-primary mb-2"></i>
                    <h6 className="mb-1">System Status</h6>
                    <span className="badge bg-success">Online</span>
                  </div>
                </div>
                <div className="col-6 mb-3">
                  <div className="p-3 bg-light rounded">
                    <i className="fas fa-database fa-2x text-info mb-2"></i>
                    <h6 className="mb-1">Database</h6>
                    <span className="badge bg-success">Connected</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 bg-light rounded">
                    <i className="fas fa-shield-alt fa-2x text-success mb-2"></i>
                    <h6 className="mb-1">Security</h6>
                    <span className="badge bg-success">Secure</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 bg-light rounded">
                    <i className="fas fa-clock fa-2x text-warning mb-2"></i>
                    <h6 className="mb-1">Last Update</h6>
                    <small className="text-muted">Just now</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
