import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children, requiredRole = null }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndRole();
  }, []);

  const checkUserAndRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        await fetchUserRole(user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async (userId) => {
    try {
      // Get user email for admin check
      const { data: authUser } = await supabase.auth.getUser();
      const userEmail = authUser?.user?.email;
      
      console.log('Checking role for user:', userEmail, 'ID:', userId);

      // Check if this is the super admin email
      if (userEmail === '963sohamraut@gmail.com') {
        console.log('Super admin detected by email');
        setUserRole('superadmin');
        return;
      }

      // First check admin_details table by email for superadmin
      if (userEmail) {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_details')
          .select('role, email')
          .eq('email', userEmail)
          .single();

        if (adminData && !adminError) {
          console.log('Found admin user:', adminData);
          setUserRole('superadmin');
          return;
        }
      }

      // Then check admin_details by ID
      const { data: adminByIdData, error: adminByIdError } = await supabase
        .from('admin_details')
        .select('role')
        .eq('id', userId)
        .single();

      if (adminByIdData && !adminByIdError) {
        console.log('Found admin by ID:', adminByIdData);
        setUserRole('superadmin');
        return;
      }

      // Then check users table for regular users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userData && !userError) {
        console.log('Found user data:', userData);
        setUserRole(userData.role || 'user');
      } else {
        console.log('No user data found, defaulting to user role');
        setUserRole('user'); // Default role
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('user'); // Default to user role on error
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Access Denied</h4>
          <p>You don't have sufficient permissions to access this page.</p>
          <hr />
          <p className="mb-0">
            Required role: <strong>{requiredRole}</strong><br />
            Your role: <strong>{userRole || 'unknown'}</strong>
          </p>
        </div>
      </div>
    );
  }

  return children;
}

// Specific components for different access levels
export const SuperAdminOnly = ({ children }) => (
  <ProtectedRoute requiredRole="superadmin">
    {children}
  </ProtectedRoute>
);

export const UserOnly = ({ children }) => (
  <ProtectedRoute requiredRole="user">
    {children}
  </ProtectedRoute>
);

export const AuthenticatedOnly = ({ children }) => (
  <ProtectedRoute>
    {children}
  </ProtectedRoute>
);
