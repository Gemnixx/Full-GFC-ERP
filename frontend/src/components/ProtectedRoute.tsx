import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedRoute = ({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback,
}: Props) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  // No permission required → allow
  if (!permission && !permissions) return <>{children}</>;

  // Single permission check
  if (permission && !hasPermission(permission)) {
    return fallback ? <>{fallback}</> : <Navigate to="/dashboard" replace />;
  }

  // Multiple permissions
  if (permissions && permissions.length > 0) {
    const results = permissions.map((p) => hasPermission(p));
    const allowed = requireAll ? results.every(Boolean) : results.some(Boolean);
    if (!allowed) return fallback ? <>{fallback}</> : <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * Inline guard for buttons, cards, sections.
 * Hides children if no permission.
 */
export const Can = ({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
}: {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const { user, hasPermission } = useAuth();
  if (!user) return <>{fallback}</>;

  if (permission && !hasPermission(permission)) return <>{fallback}</>;

  if (permissions && permissions.length > 0) {
    const results = permissions.map((p) => hasPermission(p));
    const allowed = requireAll ? results.every(Boolean) : results.some(Boolean);
    if (!allowed) return <>{fallback}</>;
  }

  return <>{children}</>;
};