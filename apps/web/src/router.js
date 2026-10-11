import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { DashboardPage } from './pages/DashboardPage';
import { SessionsPage } from './pages/SessionsPage';
import { HealthStatusPage } from './pages/HealthStatusPage';
import { NotFoundPage } from './pages/NotFoundPage';
export const router = createBrowserRouter([
    {
        path: '/',
        element: _jsx(Shell, {}),
        children: [
            {
                index: true,
                element: _jsx(DashboardPage, {}),
            },
            {
                path: 'sessions',
                element: _jsx(SessionsPage, {}),
            },
            {
                path: 'health',
                element: _jsx(HealthStatusPage, {}),
            },
            {
                path: '*',
                element: _jsx(NotFoundPage, {}),
            },
        ],
    },
]);
