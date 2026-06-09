/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import ClientesDeudaModal from './ClientesDeudaModal';

const API_URL = 'http://localhost:4000/api';

const TotalClientes = () => {
  const [showDeudaModal, setShowDeudaModal] = useState(false);
  const [statsData, setStatsData] = useState({
    totalClientes: 0,
    cuentasPendientes: 0,
    cuentasVendidas: 0,
    totalPendientesCount: 0,
    loading: true,
    error: null
  });

  const fetchStats = async () => {
    try {
      setStatsData(prev => ({ ...prev, loading: true, error: null }));
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clientes/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatsData({
        totalClientes:       data.total         ?? 0,
        cuentasPendientes:   data.totalDebt     ?? 0,
        cuentasVendidas:     data.cuentasVendidas ?? 0,
        totalPendientesCount:data.withDebt      ?? 0,
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('[TotalClientes] Error fetching stats:', err);
      setStatsData(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCloseModal = () => {
    setShowDeudaModal(false);
    fetchStats();
  };

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  const counterAnimation = {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.5, type: 'spring' } }
  };

  return (
    <>
      <motion.div
        initial="initial"
        animate="animate"
        variants={fadeUp}
        className="bg-white rounded-lg shadow-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-800">TOTAL CLIENTES</h2>
          </div>
          <button
            onClick={() => setShowDeudaModal(true)}
            className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors"
          >
            Más detalles
          </button>
        </div>

        {statsData.error && (
          <div className="mb-3 text-xs text-red-500 bg-red-50 p-2 rounded">
            Error: {statsData.error}
            <button onClick={fetchStats} className="ml-2 underline">Reintentar</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div variants={counterAnimation} className="text-center">
            {statsData.loading ? (
              <div className="animate-pulse bg-gray-200 h-12 w-24 rounded mx-auto" />
            ) : (
              <motion.span className="text-5xl font-bold text-gray-700">
                {statsData.totalClientes}
              </motion.span>
            )}
            <p className="text-gray-500 mt-2">Total Clientes</p>
          </motion.div>

          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cuentas pendientes</span>
              {statsData.loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-32 rounded" />
              ) : (
                <div className="flex flex-col items-end">
                  <span className="font-semibold text-gray-800">
                    RD$ {statsData.cuentasPendientes.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {statsData.totalPendientesCount} cliente{statsData.totalPendientesCount !== 1 ? 's' : ''} con deuda
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cuentas vendidas</span>
              {statsData.loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-32 rounded" />
              ) : (
                <span className="font-semibold text-gray-800">
                  RD$ {statsData.cuentasVendidas.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <ClientesDeudaModal
        isOpen={showDeudaModal}
        onClose={handleCloseModal}
        onDataChange={fetchStats}
      />
    </>
  );
};

export default TotalClientes;
