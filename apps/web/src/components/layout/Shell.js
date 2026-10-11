import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAppStore } from '../../stores/useAppStore';
export const Shell = () => {
    const { sidebarOpen, setSidebarOpen } = useAppStore();
    return (_jsxs("div", { className: "min-h-screen flex flex-col bg-surface-dark text-slate-100", children: [_jsx(Navbar, {}), _jsxs("div", { className: "flex-1 flex overflow-hidden", children: [sidebarOpen && (_jsx("div", { className: "fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden", onClick: () => setSidebarOpen(false), "aria-hidden": "true" })), _jsx(Sidebar, {}), _jsx("main", { id: "main-content", className: "flex-1 overflow-y-auto px-4 py-6 lg:px-8 max-w-7xl mx-auto w-full", children: _jsx(Outlet, {}) })] })] }));
};
