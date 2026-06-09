import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { LoadingProvider } from './context/LoadingContext.jsx';
import { BusinessProvider } from './context/BusinessContext.jsx';
import { LicenseProvider } from './context/LicenseContext.jsx';
import { HelmetProvider } from 'react-helmet-async';
import Loader from './components/Loader.jsx';
import AppRoutes from './AppRoutes';
import LicenseWarningModal from './components/LicenseWarningModal.jsx'; // Added
import LicenseBlockingModal from './components/LicenseBlockingModal.jsx'; // Added for blocking modal
import { useLicense } from './context/LicenseContext.jsx'; // Added

// Importar el componente ProtectedRoute desde su archivo
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Importación de páginas
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized.jsx';
import DashboardHome from './pages/page/DashboardHome';
import  Productos  from './pages/page/Productos';
import  Categorias  from './pages/page/Categorias';
import  Facturas  from './pages/page/Facturas';
import CrearFactura from './pages/page/CrearFactura';
import GastoHome from './pages/page/GastoHome';
import { ClienteForm } from './pages/page/ClienteForm';
import BusinessSettings from './pages/page/BusinessSettings';

// Nuevas páginas para las características añadidas
import FacturaDetalle from './pages/page/FacturaDetalle';
import NotasCredito from './pages/page/NotasCredito';
import NotaCreditoDetalle from './pages/page/NotaCreditoDetalle';
import CrearNotaCredito from './pages/page/CrearNotaCredito';
import Cotizaciones from './pages/page/Cotizaciones';
import CotizacionDetalle from './pages/page/CotizacionDetalle';
import CrearCotizacion from './pages/page/CrearCotizacion';

// Importar los componentes de retenciones
import Retenciones from './pages/page/Retenciones';
import CrearRetencion from './pages/page/CrearRetencion';
import DetalleRetencion from './pages/page/DetalleRetencion';
import EditarRetencion from './pages/page/EditarRetencion';

// Importar los componentes de proveedores y compras a crédito
import Proveedores from './pages/page/Proveedores';
import ComprasCredito from './pages/page/ComprasCredito';
import CrearCompraCredito from './pages/page/CrearCompraCredito';
import DetalleCompraCredito from './pages/page/DetalleCompraCredito';
import RegistrarPagoCompra from './pages/page/RegistrarPagoCompra';

// Importar la página de conexión remota
import RemoteConnectionSettings from './pages/page/RemoteConnectionSettings';

// Main application component that includes routes and the global modal
const MainApp = () => {
  const { isWarningModalOpen, warningModalInfo, closeLicenseWarningModal, showBlockingModal, blockingModalInfo } = useLicense(); // Added showBlockingModal and blockingModalInfo

  // Agregar funcionalidad de refrescar con F5
  useEffect(() => {
    const handleKeyDown = (event) => {
      // F5 key
      if (event.key === 'F5' || event.keyCode === 116) {
        event.preventDefault();
        
        // Verificar si estamos en Electron
        if (window.electronAPI) {
          // En Electron, usar la API nativa para recargar
          window.electronAPI.reloadApp?.() || window.location.reload();
        } else {
          // En navegador web, usar recarga forzada
          window.location.href = window.location.href;
        }
      }
      // Ctrl+R también para refrescar
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        
        // Verificar si estamos en Electron
        if (window.electronAPI) {
          // En Electron, usar la API nativa para recargar
          window.electronAPI.reloadApp?.() || window.location.reload();
        } else {
          // En navegador web, usar recarga forzada
          window.location.href = window.location.href;
        }
      }
    };

    // Agregar event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <AppRoutes />
      <LicenseWarningModal
        open={isWarningModalOpen}
        onClose={closeLicenseWarningModal}
        title={warningModalInfo.title}
        message={warningModalInfo.message}
      />
      <LicenseBlockingModal
        open={showBlockingModal}
        title={blockingModalInfo.title}
        message={blockingModalInfo.message}
      />
    </>
  );
};

const App = () => (
  <HelmetProvider>
    <LoadingProvider>
      <AuthProvider>
        <LicenseProvider> {/* LicenseProvider now wraps MainApp */}
          <BusinessProvider>
            <MainApp /> {/* Render MainApp here */}
          </BusinessProvider>
        </LicenseProvider>
      </AuthProvider>
    </LoadingProvider>
  </HelmetProvider>
);

export default App;