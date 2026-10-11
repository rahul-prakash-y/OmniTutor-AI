import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import type { UserRole } from '@omnitutor/shared';
import { Skeleton } from '../ui/Skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, isAuthenticated, isLoading, isInitialized, init } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isInitialized) {
      init();
    }
  }, [isInitialized, init]);

  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 animate-pulse flex items-center justify-center text-white font-bold text-lg shadow-md">
          OT
        </div>
        <div className="w-48 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4 mx-auto" />
        </div>
        <p className="text-xs text-slate-400 font-medium animate-pulse">
          Restoring secure workspace session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
          403
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
          Insufficient Permissions
        </h2>
        <p className="text-xs text-slate-500 max-w-sm">
          Your account does not have the required &apos;{requiredRole}&apos; role to access this resource.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
