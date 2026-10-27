import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import { LoadingState } from './components/LoadingState';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoverOrdersPage } from './pages/DiscoverOrdersPage';
import { CreateOrderPage } from './pages/CreateOrderPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { PersonalCartPage } from './pages/PersonalCartPage';
import { ModerationQueuePage } from './pages/ModerationQueuePage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <LoadingState rows={3} label="Verifying resident session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto p-12">
        <LoadingState rows={2} label="Loading..." />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <DiscoverOrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/new"
        element={
          <ProtectedRoute>
            <CreateOrderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:orderId"
        element={
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-items"
        element={
          <ProtectedRoute>
            <PersonalCartPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/moderation"
        element={
          <ProtectedRoute>
            <ModerationQueuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <NotFoundPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

