import { Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const ReportesLayout = () => {
  return (
    <>
      <Helmet>
        <title>Reportes | App Facturación</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
          Reportes y Estadísticas
        </h1>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default ReportesLayout;
