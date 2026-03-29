import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, adminUser, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (adminOnly && !adminUser) {
    return <Navigate to="/login" replace />;
  }

  // If an admin session exists, restrict app access to admin page only.
  if (!adminOnly && adminUser) {
    return <Navigate to="/admin" replace />;
  }

  if (!adminOnly && !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
