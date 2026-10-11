import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { AuthShell } from './components/layout/AuthShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { DashboardPage } from './pages/DashboardPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { TutorPage } from './pages/TutorPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { AssessmentRunnerPage } from './pages/AssessmentRunnerPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { HealthStatusPage } from './pages/HealthStatusPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  // Public Authentication & Onboarding routes
  {
    element: <AuthShell />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },
      {
        path: '/verify-email',
        element: <VerifyEmailPage />,
      },
    ],
  },

  // Protected Application Shell routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Shell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'courses',
        element: <CoursesPage />,
      },
      {
        path: 'courses/:courseId',
        element: <CourseDetailPage />,
      },
      {
        path: 'tutor',
        element: <TutorPage />,
      },
      // Backwards compatibility alias for Module 1
      {
        path: 'sessions',
        element: <TutorPage />,
      },
      {
        path: 'assessments',
        element: <AssessmentsPage />,
      },
      {
        path: 'assessments/:assessmentId',
        element: <AssessmentRunnerPage />,
      },
      {
        path: 'progress',
        element: <ProgressPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'health',
        element: <HealthStatusPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
