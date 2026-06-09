import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import POSSystem from '../../components/new-fact/Factur';

const CrearFactura = () => {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCloseRequest = () => setShowConfirm(true);

  const handleConfirmClose = () => {
    setShowConfirm(false);
    navigate('/dashboard/facturas');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-white"
    >
      {/* Barra superior fija */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0 bg-white shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800">Nueva Factura</h2>
        <button
          onClick={handleCloseRequest}
          className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-full hover:bg-red-50"
          title="Cerrar Nueva Factura"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Área del POS — llena el espacio restante con scroll interno */}
      <div className="flex-1 min-h-0 overflow-auto">
        <POSSystem onClose={handleCloseRequest} />
      </div>

      {/* Modal de confirmación de cierre */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">¿Cerrar Nueva Factura?</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Si cierras ahora, <span className="font-semibold text-amber-600">todos los productos del carrito y la información ingresada se perderán</span>. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmClose}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Sí, cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CrearFactura;
