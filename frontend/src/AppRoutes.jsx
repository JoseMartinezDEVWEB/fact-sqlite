import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, Component } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { useLicense } from './context/LicenseContext.jsx';
import Loader from './components/Loader.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LicenseBlockScreen from './components/license/LicenseBlockScreen';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized.jsx';

// Use lazy loading for the page components to improve performance
const DashboardHome = lazy(() => import('./pages/page/DashboardHome'));
const Productos = lazy(() => import('./pages/page/Productos'));
const Categorias = lazy(() => import('./pages/page/Categorias'));
const Facturas = lazy(() => import('./pages/page/Facturas'));
const CrearFactura = lazy(() => import('./pages/page/CrearFactura'));
const GastoHome = lazy(() => import('./pages/page/GastoHome'));
const ClienteForm = lazy(() => import('./pages/page/ClienteForm').then(module => ({ default: module.ClienteForm })));
const BusinessSettings = lazy(() => import('./pages/page/BusinessSettings'));
const FacturaDetalle = lazy(() => import('./pages/page/FacturaDetalle'));
const NotasCredito = lazy(() => import('./pages/page/NotasCredito'));
const NotaCreditoDetalle = lazy(() => import('./pages/page/NotaCreditoDetalle'));
const CrearNotaCredito = lazy(() => import('./pages/page/CrearNotaCredito'));
const Cotizaciones = lazy(() => import('./pages/page/Cotizaciones'));
const CotizacionDetalle = lazy(() => import('./pages/page/CotizacionDetalle'));
const CrearCotizacion = lazy(() => import('./pages/page/CrearCotizacion'));
const Retenciones = lazy(() => import('./pages/page/Retenciones'));
const CrearRetencion = lazy(() => import('./pages/page/CrearRetencion'));
const DetalleRetencion = lazy(() => import('./pages/page/DetalleRetencion'));
const EditarRetencion = lazy(() => import('./pages/page/EditarRetencion'));
const Proveedores = lazy(() => import('./pages/page/Proveedores'));
const ComprasCredito = lazy(() => import('./pages/page/ComprasCredito'));
const CrearCompraCredito = lazy(() => import('./pages/page/CrearCompraCredito'));
const DetalleCompraCredito = lazy(() => import('./pages/page/DetalleCompraCredito'));
const RegistrarPagoCompra = lazy(() => import('./pages/page/RegistrarPagoCompra'));
const RemoteConnectionSettings = lazy(() => import('./pages/page/RemoteConnectionSettings'));

// License Management Component
const LicenseManagement = lazy(() => import('./pages/page/LicenseManagementNew'));

// Componentes de Reportes
const ReportesLayout = lazy(() => import('./pages/reportes/ReportesLayout'));
const ReportesVentas = lazy(() => import('./pages/reportes/ReportesVentas'));
const ReportesGastos = lazy(() => import('./pages/reportes/ReportesGastos'));
const ReportesDeudas = lazy(() => import('./pages/reportes/ReportesDeudas'));
const ReportesProductos = lazy(() => import('./pages/reportes/ReportesProductos'));
const ReportesBalance = lazy(() => import('./pages/reportes/ReportesBalance'));

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Algo salió mal</h2>
            <p className="text-gray-700 mb-4">
              Hubo un error al cargar esta sección. Por favor, intenta recargar la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Custom loading component for Suspense
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader message="Cargando módulo..." />
  </div>
);

const AppRoutes = () => {
  // Con la nueva AuthContext, loading empieza en false porque el estado
  // se inicializa síncrono desde localStorage — no hay pantalla en blanco al recargar.
  const { loading } = useAuth();
  const { isValid, licenseStatus } = useLicense();

  const licenseBlocked = !isValid &&
    (licenseStatus === 'blocked' || licenseStatus === 'expired');

  return (
    <Router>
      <Loader />
      <ErrorBoundary>
        {loading ? (
          // Este estado ya es muy breve (solo si falta token en localStorage)
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Verificando sesión...</p>
            </div>
          </div>
        ) : licenseBlocked ? (
          <LicenseBlockScreen />
        ) : (
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Rutas Protegidas (Dashboard y subrutas) */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardHome />
              </Suspense>
            } />
            <Route path="productos" element={
              <Suspense fallback={<LoadingFallback />}>
                <Productos />
              </Suspense>
            } />
            <Route path="categorias" element={
              <Suspense fallback={<LoadingFallback />}>
                <Categorias />
              </Suspense>
            } />
            {/* Rutas para Facturas */}
            <Route path="facturas" element={
              <Suspense fallback={<LoadingFallback />}>
                <Facturas />
              </Suspense>
            } />
            <Route path="facturas/crear" element={
              <Suspense fallback={<LoadingFallback />}>
                <CrearFactura />
              </Suspense>
            } />
            <Route path="facturas/:id" element={
              <Suspense fallback={<LoadingFallback />}>
                <FacturaDetalle />
              </Suspense>
            } />
            {/* Rutas para Notas de Crédito */}
            <Route path="notas-credito" element={
              <Suspense fallback={<LoadingFallback />}>
                <NotasCredito />
              </Suspense>
            } />
            <Route path="notas-credito/:id" element={
              <Suspense fallback={<LoadingFallback />}>
                <NotaCreditoDetalle />
              </Suspense>
            } />
            <Route path="crear-nota-credito/:invoiceId" element={
              <Suspense fallback={<LoadingFallback />}>
                <CrearNotaCredito />
              </Suspense>
            } />
            {/* Rutas para Cotizaciones */}
            <Route path="cotizaciones" element={
              <Suspense fallback={<LoadingFallback />}>
                <Cotizaciones />
              </Suspense>
            } />
            <Route path="cotizaciones/:id" element={
              <Suspense fallback={<LoadingFallback />}>
                <CotizacionDetalle />
              </Suspense>
            } />
            <Route path="crear-cotizacion" element={
              <Suspense fallback={<LoadingFallback />}>
                <CrearCotizacion />
              </Suspense>
            } />
            <Route path="GestionGasto" element={
              <Suspense fallback={<LoadingFallback />}>
                <GastoHome />
              </Suspense>
            } />
            <Route path="clientes" element={
              <Suspense fallback={<LoadingFallback />}>
                <ClienteForm />
              </Suspense>
            } />
            {/* Rutas para retenciones */}
            <Route path="retenciones" element={
              <Suspense fallback={<LoadingFallback />}>
                <Retenciones />
              </Suspense>
            } />
            <Route path="retenciones/:id" element={
              <Suspense fallback={<LoadingFallback />}>
                <DetalleRetencion />
              </Suspense>
            } />
            <Route path="retenciones/:id/editar" element={
              <Suspense fallback={<LoadingFallback />}>
                <EditarRetencion />
              </Suspense>
            } />
            <Route path="crear-retencion/:invoiceId" element={
              <Suspense fallback={<LoadingFallback />}>
                <CrearRetencion />
              </Suspense>
            } />
            {/* Rutas para proveedores */}
            <Route path="proveedores" element={
              <Suspense fallback={<LoadingFallback />}>
                <Proveedores />
              </Suspense>
            } />
            {/* Rutas para compras a crédito */}
            <Route path="compras-credito" element={
              <Suspense fallback={<LoadingFallback />}>
                <ComprasCredito />
              </Suspense>
            } />
            <Route path="compras-credito/:id" element={
              <Suspense fallback={<LoadingFallback />}>
                <DetalleCompraCredito />
              </Suspense>
            } />
            <Route path="crear-compra-credito" element={
              <Suspense fallback={<LoadingFallback />}>
                <CrearCompraCredito />
              </Suspense>
            } />
            <Route path="compras-credito/:id/pago" element={
              <Suspense fallback={<LoadingFallback />}>
                <RegistrarPagoCompra />
              </Suspense>
            } />

            {/* Rutas para reportes */}
            <Route path="reportes" element={
              <Suspense fallback={<LoadingFallback />}>
                <ReportesLayout />
              </Suspense>
            }>
              <Route index element={<Navigate to="ventas" replace />} />
              <Route path="ventas" element={
                <Suspense fallback={<LoadingFallback />}>
                  <ReportesVentas />
                </Suspense>
              } />
              <Route path="gastos" element={
                <Suspense fallback={<LoadingFallback />}>
                  <ReportesGastos />
                </Suspense>
              } />
              <Route path="deudas" element={
                <Suspense fallback={<LoadingFallback />}>
                  <ReportesDeudas />
                </Suspense>
              } />
              <Route path="productos" element={
                <Suspense fallback={<LoadingFallback />}>
                  <ReportesProductos />
                </Suspense>
              } />
              <Route path="balance" element={
                <Suspense fallback={<LoadingFallback />}>
                  <ReportesBalance />
                </Suspense>
              } />
            </Route>
            
            {/* Ruta para configuración del negocio */}
            <Route 
              path="configuracion" 
              element={
                <ProtectedRoute roles={['superadmin', 'admin', 'encargado']}> 
                  <Suspense fallback={<LoadingFallback />}>
                    <BusinessSettings />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            {/* Ruta para administración de licencias (solo para superadmin) */}
            <Route 
              path="licencias" 
              element={
                <ProtectedRoute roles={['superadmin']}> 
                  <Suspense fallback={<LoadingFallback />}>
                    <LicenseManagement />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            {/* Ruta para configuración de conexión remota (solo para admin y superadmin) */}
            <Route 
              path="conexion-remota" 
              element={
                <ProtectedRoute roles={['superadmin', 'admin']}> 
                  <Suspense fallback={<LoadingFallback />}>
                    <RemoteConnectionSettings />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          </Route>
          {/* Redirección para rutas no encontradas */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        )}
      </ErrorBoundary>
    </Router>
  );
};

export default AppRoutes; 