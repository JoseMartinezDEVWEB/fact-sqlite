import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLoading } from '../context/LoadingContext';
import { useLicense } from '../context/LicenseContext';
import LicenseStatusBadge from '../components/license/LicenseStatusBadge';

import Drawer from './Drawer';
import DashboardFull from '../components/dashboard';
import TourGuide from '../components/TourGuide';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showLoader } = useLoading();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleLogout = () => {
    showLoader(1500, 'Cerrando sesión...');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isExactDashboardRoute = location.pathname === '/dashboard';
  // Rutas que deben llenar todo el área de contenido sin padding externo
  const isFullPageRoute = location.pathname === '/dashboard/facturas/crear';

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header fijo */}
      <header id="app-header" className="bg-white shadow-sm z-10 flex-shrink-0">
        <div className="max-w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2 md:py-4">
            <div className="flex items-center">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                aria-label="Open menu"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="ml-2 text-lg font-semibold text-gray-800 lg:hidden">
                App Facturación
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <LicenseStatusBadge />
              <motion.button
                onClick={handleLogout}
                className="bg-red-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cerrar Sesión
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Área de trabajo: sidebar + contenido, llena el espacio restante */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

        <main
          id="main-content"
          className={`flex-1 lg:ml-64 w-full overflow-x-hidden ${
            isFullPageRoute ? 'overflow-y-hidden' : 'overflow-y-auto p-2 sm:p-4 md:p-6'
          }`}
        >
          {isFullPageRoute ? (
            // Modo pantalla completa: el componente llena todo el espacio
            <div className="h-full">
              <Outlet />
            </div>
          ) : (
            <div className="max-w-full mx-auto">
              {isExactDashboardRoute ? <DashboardFull /> : <Outlet />}
            </div>
          )}
        </main>
      </div>

      <TourGuide />
    </div>
  );
};

export default Dashboard;