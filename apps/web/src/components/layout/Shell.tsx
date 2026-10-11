import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { ToastContainer } from '../ui/Toast';
import { useAppStore } from '../../stores/useAppStore';

export const Shell: React.FC = () => {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Header />

        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Modals & Portals */}
      <GlobalSearchModal />
      <ToastContainer />
    </div>
  );
};
