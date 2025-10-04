import { Navigate } from 'react-router-dom';
import { authToken } from '@/lib/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'employee';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const token = authToken.get();
  
  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  // If role checking is needed, you can add it here
  // For now, just check if authenticated
  
  return <>{children}</>;
}
