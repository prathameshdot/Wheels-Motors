# Super Admin Panel Setup Guide

## 🚀 Complete Setup Instructions

### 1. Supabase Backend Setup

**Database Connection:**
```
postgresql://postgres:KiranM@123#@db.rnzcbpfxxwvgttukrmlq.supabase.co:5432/postgres
```

**Environment Variables:**
```
REACT_APP_SUPABASE_URL=https://rnzcbpfxxwvgttukrmlq.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuemNicGZ4eHd2Z3R0dWtybWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5Njk2MjYsImV4cCI6MjA3MTU0NTYyNn0.wVsWYHyVms44PrJHRTd_xxzNyrCCk7qJrUSSLVGpdbM
```

#### Step 1: Run SQL Scripts in Supabase
Go to [Supabase Dashboard](https://app.supabase.com/) → SQL Editor and run these scripts:

1. **`backend/users.sql`** - Creates users table
2. **`backend/vehicles.sql`** - Creates vehicles table (named vehicles1 in your case)
3. **`backend/company_details.sql`** - Creates company details table
4. **`backend/reports.sql`** - Creates reports table

#### Step 2: Create Storage Buckets
In Supabase Dashboard → Storage → Create new buckets:
- `company-assets` (for logo/signature uploads)
- `vehicle-photos` (for vehicle images)

Set both buckets to **Public** access.

#### Step 3: Create Admin User
In Supabase Dashboard → Authentication → Users:
- Click "Create a new user"
- Email: `admin@yourdomain.com`
- Password: `your-secure-password`
- Mark as "Email confirmed"

### 2. React Frontend Setup

#### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

#### Step 2: Create .env file
Create `.env` in `frontend/` with your Supabase credentials (already provided above).

#### Step 3: Start Development Server
```bash
npm start
```

## 🏗️ Project Structure

```
super-admin-panel/
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── api/           # Supabase API calls
│   │   ├── components/    # Reusable components
│   │   │   ├── Sidebar.js
│   │   │   ├── Navbar.js
│   │   │   └── ProtectedRoute.js
│   │   ├── pages/         # Application screens
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── DashboardHome.js
│   │   │   ├── Users.js
│   │   │   ├── Vehicles.js
│   │   │   ├── CompanyDetails.js
│   │   │   └── Reports.js
│   │   ├── supabaseClient.js
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   └── .env
├── backend/               # SQL Scripts
│   ├── users.sql
│   ├── vehicles.sql
│   ├── company_details.sql
│   └── reports.sql
└── data/                 # Documentation
    └── README.md
```

## 🎯 Features

### 🔐 Authentication
- Secure login with Supabase Auth
- Protected routes
- Session management

### 👥 User Management
- Add new users
- View all users in table
- Block/Unblock users
- Real-time status updates

### 🚗 Vehicle Management
- **Add Vehicle Form**: Static fields (Make, Model, Year, Price, Mileage, Registration Date, Insurance status, etc.) + Dynamic fields
- **Sell Vehicle Form**: Same structure as Add with different workflow
- Photo uploads to Supabase Storage
- JSON storage for dynamic fields

### 🏢 Company Details
- Company information management
- Logo upload
- Signature upload
- Admin contact details

### 📊 Reports & Analytics
- User-wise reports
- Overall statistics
- CSV export functionality
- Real-time dashboard metrics

### 🎨 UI/UX Features
- Responsive Bootstrap design
- Font Awesome icons
- Active navigation highlighting
- Loading states
- Error handling
- Professional admin theme

## 🔧 Technical Details

### Database Tables
1. **users** - User information and status
2. **vehicles1** - Vehicle inventory with static and dynamic fields
3. **company_details** - Company information and assets
4. **reports** - Generated reports and analytics

### Key Technologies
- **Frontend**: React 18, React Router, Bootstrap 5
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: Bootstrap + Custom CSS
- **Icons**: Font Awesome 6

## 🚨 Troubleshooting

### Common Issues:

1. **"Missing script: start"** - Make sure `package.json` has all required scripts
2. **"Relation does not exist"** - Run SQL scripts in correct order
3. **Routing issues** - Check if you're using correct path structure (`/dashboard/users` not `/users`)
4. **Auth redirects** - Ensure ProtectedRoute is properly wrapping dashboard routes

### Navigation Fix
The routing has been fixed to prevent login redirects:
- Login → `/dashboard` (home)
- Sidebar links use `/dashboard/users`, `/dashboard/vehicles`, etc.
- Protected routes wrap the entire dashboard layout

## 📱 Usage

1. **Login**: Use admin credentials created in Supabase Auth
2. **Dashboard**: View overview statistics and quick actions
3. **Manage Users**: Add, view, block/unblock users
4. **Manage Vehicles**: Add/Sell vehicles with static + dynamic forms
5. **Company Details**: Update company info and upload assets
6. **Reports**: View and export business analytics
7. **Logout**: Secure session termination

---

Your Super Admin Panel is now ready! 🎉
