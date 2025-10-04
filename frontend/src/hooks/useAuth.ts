import { useState, useEffect } from 'react';
import { authApi, currentUser, authToken, type User } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = currentUser.get();
    const token = authToken.get();
    
    if (storedUser && token) {
      setUser(storedUser);
      // Optionally refresh user data from server
      refreshUser();
    }
    setLoading(false);
  }, []);

  const refreshUser = async () => {
    try {
      const response = await authApi.getProfile();
      if (response.data?.user) {
        setUser(response.data.user);
        currentUser.set(response.data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If token is invalid, logout
      logout();
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      if (response.data?.user) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    country: string;
  }) => {
    try {
      const response = await authApi.register(data);
      if (response.data?.user) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      authToken.remove();
      currentUser.remove();
      navigate('/signin');
    }
  };

  const isAuthenticated = !!user && !!authToken.get();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isEmployee = !!user; // All authenticated users can be employees

  return {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    isManager,
    isEmployee,
    login,
    register,
    logout,
    refreshUser,
  };
}
