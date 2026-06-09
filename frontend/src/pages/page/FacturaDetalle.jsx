import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getInvoiceById,
  processFiscalInvoice,
  cancelInvoice,
  addPayment,
  processReturn
} from '../../services/invoiceService';
import { motion } from 'framer-motion';
import { Button } from '@mui/material';
import { FaCreditCard, FaReceipt, FaPrint, FaArrowLeft, FaUndo } from 'react-icons/fa';

const REFUND_METHOD_LABELS = {
  cash: 'Reembolso en efectivo',
  store_credit: 'Crédito en cuenta',
  replacement: 'Reemplazo de producto',
};

const FacturaDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'cash',
    paymentDetails: {}
  });
  const [cancelReason, setCancelReason] = useState('');

  // Estado del modal de devolución
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnMethod, setReturnMethod] = useState('cash');
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnError, setReturnError] = useState('');
  const [returnSuccess, setReturnSuccess] = useState('');

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const response = await getInvoiceById(id);
        setInvoice(response);
        setError(null);
      } catch (err) {
        setError(err.message || 'Error al cargar la factura');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  const handleProcessFiscal = async () => {
    try {
      setLoading(true);
      const response = await processFiscalInvoice(id);
      setInvoice(response.data);
      alert('Factura fiscal procesada correctamente');
    } catch (err) {
      setError(err.message || 'Error al procesar la factura fiscal');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Debe proporcionar un motivo para la cancelación');
      return;
    }
    try {
      setLoading(true);
      const response = await cancelInvoice(id, cancelReason);
      setInvoice(response.data);
      setShowCancelModal(false);
      alert('Factura cancelada correctamente');
    } catch (err) {
      setError(err.message || 'Error al cancelar la factura');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (paymentData.amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }
    try {
      setLoading(true);
      const response = await addPayment(id, paymentData);
      setInvoice(response.data);
      setShowPaymentModal(false);
      alert('Pago registrado correctamente');
    } catch (err) {
      setError(err.message || 'Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  // --- Devolución / Cambio ---

  const openReturnModal = () => {
    // Inicializar items del modal con cantidad 0 para cada producto
    setReturnItems(
      invoice.items.map(item => ({
        productId: item.product._id,
        productName: item.product.name || 'Producto',
        maxQty: item.quantity,
        quantity: 0,
        unitPrice: item.subtotal / item.quantity,
        selected: false,
      }))
    );
    setReturnReason('');
    setReturnMethod('cash');
    setReturnError('');
    setReturnSuccess('');
    setShowReturnModal(true);
  };

  const toggleReturnItem = (index) => {
    setReturnItems(prev =>
      prev.map((item, i) =>
        i === index
          ? { ...item, selected: !item.selected, quantity: !item.selected ? item.maxQty : 0 }
          : item
      )
    );
  };

  const setReturnQty = (index, value) => {
    const qty = Math.max(0, Math.min(Number(value), returnItems[index].maxQty));
    setReturnItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, quantity: qty } : item))
    );
  };

  const refundTotal = returnItems
    .filter(i => i.selected && i.quantity > 0)
    .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const handleProcessReturn = async () => {
    const selected = returnItems.filter(i => i.selected && i.quantity > 0);
    if (selected.length === 0) {
      setReturnError('Selecciona al menos un producto y una cantidad mayor a 0.');
      return;
    }
    if (!returnReason.trim()) {
      setReturnError('El motivo de la devolución es obligatorio.');
      return;
    }
    setReturnError('');
    setReturnLoading(true);
    try {
      const response = await processReturn(id, {
        items: selected.map(i => ({ productId: i.productId, quantity: i.quantity })),
        reason: returnReason,
        refundMethod: returnMethod,
      });
      setInvoice(response.data);
      setReturnSuccess(
        `Devolución procesada. Monto a ${REFUND_METHOD_LABELS[returnMethod].toLowerCase()}: $${response.refundAmount?.toFixed(2)}`
      );
    } catch (err) {
      setReturnError(err.message || 'Error al procesar la devolución');
    } finally {
      setReturnLoading(false);
    }
  };

  // --- Helpers ---

  const getPaymentStatus = (inv) => {
    if (inv.paymentMethod === 'credit') return inv.creditStatus || 'pending';
    return 'paid';
  };

  const getStatusTranslation = (status) => ({
    completed: 'Completada',
    cancelled: 'Cancelada',
    pending: 'Pendiente',
    draft: 'Borrador',
    refunded: 'Reembolsada',
    partially_refunded: 'Reembolso Parcial',
  }[status] || status);

  const getPaymentStatusTranslation = (status) => ({
    paid: 'Pagada',
    partial: 'Pago Parcial',
    pending: 'Pendiente',
    overdue: 'Vencida',
  }[status] || status);

  const getPaymentMethodTranslation = (method) => ({
    cash: 'Efectivo',
    credit_card: 'Tarjeta',
    bank_transfer: 'Transferencia',
    credit: 'Crédito',
    check: 'Cheque',
    other: 'Otro',
  }[method] || method);

  const handlePrint = () => window.print();

  const canReturn = invoice &&
    invoice.status !== 'cancelled' &&
    invoice.status !== 'refunded';

  if (loading) return <div className="p-4 text-center">Cargando...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!invoice) return <div className="p-4 text-center">No se encontró la factura</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="container mx-auto p-4"
    >
      {/* Barra de acciones */}
      <div id="factura-actions" className="flex flex-wrap justify-between items-center mb-6 gap-2 print:hidden">
        <h1 className="text-2xl font-bold">Factura #{invoice.receiptNumber}</h1>
        <div className="flex flex-wrap gap-2">
          {invoice.status !== 'cancelled' && (
            <>
              {invoice.paymentStatus !== 'paid' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Registrar Pago
                </button>
              )}
              {invoice.isFiscal && invoice.fiscalStatus === 'pending' && (
                <button
                  onClick={handleProcessFiscal}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Procesar Fiscal
                </button>
              )}
              <button
                onClick={() => setShowCancelModal(true)}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </>
          )}

          {/* Botón Devolución/Cambio */}
          {canReturn && (
            <button
              id="btn-devolucion"
              onClick={openReturnModal}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition-colors"
            >
              <FaUndo className="w-4 h-4" />
              Devolución / Cambio
            </button>
          )}

          <Button
            variant="outlined"
            startIcon={<FaArrowLeft />}
            onClick={() => navigate('/dashboard/facturas')}
          >
            Volver
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<FaPrint />}
            onClick={handlePrint}
          >
            Imprimir
          </Button>
          {invoice.status === 'completed' && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<FaCreditCard />}
              onClick={() => navigate(`/dashboard/crear-nota-credito/${id}`)}
            >
              Nota Crédito
            </Button>
          )}
          {invoice.status === 'completed' && (
            <Button
              variant="contained"
              color="info"
              startIcon={<FaReceipt />}
              onClick={() => navigate(`/dashboard/crear-retencion/${id}`)}
            >
              Retención
            </Button>
          )}
        </div>
      </div>

      {/* Contenido de la factura */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6 print:shadow-none print:p-0">
        <div className="hidden print:block text-center mb-4">
          <h1 className="text-xl font-bold">Factura #{invoice.receiptNumber}</h1>
          <p className="text-sm">{new Date(invoice.createdAt || invoice.dateTime).toLocaleDateString()}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:text-sm">
          <div>
            <h2 className="text-lg font-semibold mb-2 print:text-base">Información General</h2>
            <p><strong>Fecha:</strong> {new Date(invoice.createdAt || invoice.dateTime).toLocaleDateString()}</p>
            <p><strong>Estado:</strong> {getStatusTranslation(invoice.status)}</p>
            <p><strong>Estado de Pago:</strong> {getPaymentStatusTranslation(getPaymentStatus(invoice))}</p>
            <p><strong>Método de Pago:</strong> {getPaymentMethodTranslation(invoice.paymentMethod)}</p>
            {invoice.paymentDetails?.cardLastFour && (
              <p><strong>Tarjeta:</strong> **** **** **** {invoice.paymentDetails.cardLastFour}</p>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2 print:text-base">Cliente</h2>
            <p><strong>Nombre:</strong> {invoice.customer.name}</p>
            {invoice.customer.email && <p><strong>Email:</strong> {invoice.customer.email}</p>}
            {invoice.customer.phone && <p><strong>Teléfono:</strong> {invoice.customer.phone}</p>}
            {invoice.customer.address && <p><strong>Dirección:</strong> {invoice.customer.address}</p>}
            {invoice.customer.taxId && <p><strong>RUC/Cédula:</strong> {invoice.customer.taxId}</p>}
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-2 print:text-base">Productos</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white print:text-sm">
            <thead>
              <tr className="bg-gray-100 print:bg-white">
                <th className="py-2 px-4 text-left">Producto</th>
                <th className="py-2 px-4 text-right">Cantidad</th>
                <th className="py-2 px-4 text-right">Precio</th>
                <th className="py-2 px-4 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2 px-4">
                    {item.product.name || 'Producto'}
                    {item.weightInfo && (
                      <span className="text-sm text-gray-500 block">
                        {item.weightInfo.value} {item.weightInfo.unit} a ${item.weightInfo.pricePerUnit}/{item.weightInfo.unit}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-right">{item.quantity}</td>
                  <td className="py-2 px-4 text-right">${item.price.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right">${item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan="3" className="py-2 px-4 text-right font-semibold">Subtotal:</td>
                <td className="py-2 px-4 text-right">${invoice.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan="3" className="py-2 px-4 text-right font-semibold">
                  Impuestos ({(invoice.taxRate * 100 || 0).toFixed(0)}%):
                </td>
                <td className="py-2 px-4 text-right">${invoice.taxAmount.toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-50 font-bold print:bg-white">
                <td colSpan="3" className="py-2 px-4 text-right">Total:</td>
                <td className="py-2 px-4 text-right">${invoice.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Historial de devoluciones */}
        {invoice.refunds && invoice.refunds.length > 0 && (
          <div className="mt-6 print:mt-3">
            <h2 className="text-lg font-semibold mb-2 text-orange-600">Devoluciones Procesadas</h2>
            <div className="space-y-2">
              {invoice.refunds.map((refund, i) => (
                <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p><strong>Motivo:</strong> {refund.reason}</p>
                      <p><strong>Método:</strong> {REFUND_METHOD_LABELS[refund.refundMethod] || refund.refundMethod}</p>
                      {refund.returnedItems?.length > 0 && (
                        <p><strong>Productos:</strong> {refund.returnedItems.map(ri => `${ri.productName} x${ri.quantity}`).join(', ')}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-700">${refund.amount?.toFixed(2)}</p>
                      <p className="text-gray-500 text-xs">{new Date(refund.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {invoice.cashier && (
          <div className="mt-6 print:mt-3 print:text-sm">
            <h2 className="text-lg font-semibold mb-2 print:text-base">Cajero</h2>
            <p><strong>Nombre:</strong> {invoice.cashier.name || invoice.cashier.username || 'No disponible'}</p>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-6 print:mt-3 print:text-sm">
            <h2 className="text-lg font-semibold mb-2 print:text-base">Notas</h2>
            <p className="p-2 bg-gray-50 rounded print:bg-white print:p-0">{invoice.notes}</p>
          </div>
        )}

        <div className="hidden print:block text-center mt-6 text-xs">
          <p>Gracias por su compra</p>
          <p>** Este documento es un comprobante válido de pago **</p>
        </div>
      </div>

      {/* ── Modal: Registrar Pago ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Registrar Pago</h2>
            <div className="mb-4">
              <label className="block mb-1">Monto</label>
              <input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                className="w-full border p-2 rounded"
                min="0"
                max={invoice.total - (invoice.paidAmount || 0)}
                step="0.01"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Método de Pago</label>
              <select
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                className="w-full border p-2 rounded"
              >
                <option value="cash">Efectivo</option>
                <option value="credit_card">Tarjeta de Crédito</option>
                <option value="bank_transfer">Transferencia Bancaria</option>
                <option value="check">Cheque</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 bg-gray-300 rounded">Cancelar</button>
              <button onClick={handleAddPayment} className="px-4 py-2 bg-blue-500 text-white rounded">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cancelar Factura ── */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Cancelar Factura</h2>
            <div className="mb-4">
              <label className="block mb-1">Motivo de Cancelación</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border p-2 rounded"
                rows="3"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowCancelModal(false)} className="px-4 py-2 bg-gray-300 rounded">Cancelar</button>
              <button onClick={handleCancel} className="px-4 py-2 bg-red-500 text-white rounded">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Devolución / Cambio ── */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-5 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaUndo /> Devolución / Cambio de Productos
              </h2>
              <p className="text-orange-100 text-sm mt-1">Factura #{invoice.receiptNumber}</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Lista de productos */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Selecciona los productos a devolver:</h3>
                <div className="space-y-3">
                  {returnItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-xl p-3 transition-all ${item.selected ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleReturnItem(idx)}
                          className="w-4 h-4 accent-orange-500"
                          id={`return-item-${idx}`}
                        />
                        <label htmlFor={`return-item-${idx}`} className="flex-1 cursor-pointer">
                          <p className="font-medium text-gray-800">{item.productName}</p>
                          <p className="text-xs text-gray-500">
                            Precio unitario: ${item.unitPrice.toFixed(2)} · Facturado: {item.maxQty}
                          </p>
                        </label>
                        {item.selected && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Cant.:</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => setReturnQty(idx, e.target.value)}
                              className="w-16 border border-orange-300 rounded-lg p-1 text-center text-sm"
                              min="1"
                              max={item.maxQty}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Motivo de la devolución <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Ej: Producto defectuoso, cliente cambió de opinión..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
                  rows="3"
                />
              </div>

              {/* Método de reembolso */}
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Método de reembolso</label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(REFUND_METHOD_LABELS).map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-all ${returnMethod === value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <input
                        type="radio"
                        name="refundMethod"
                        value={value}
                        checked={returnMethod === value}
                        onChange={(e) => setReturnMethod(e.target.value)}
                        className="accent-orange-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Total a reembolsar */}
              {refundTotal > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total a reembolsar:</span>
                    <span className="text-2xl font-bold text-orange-600">${refundTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Mensajes */}
              {returnError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {returnError}
                </div>
              )}
              {returnSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
                  ✓ {returnSuccess}
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                  disabled={returnLoading}
                >
                  {returnSuccess ? 'Cerrar' : 'Cancelar'}
                </button>
                {!returnSuccess && (
                  <button
                    onClick={handleProcessReturn}
                    disabled={returnLoading}
                    className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {returnLoading ? (
                      <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
                    ) : (
                      <FaUndo className="w-4 h-4" />
                    )}
                    {returnLoading ? 'Procesando...' : 'Procesar Devolución'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <style>{`
        @media print {
          button, .no-print { display: none !important; }
          body { font-size: 12pt; margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          @page { margin: 1cm; }
        }
      `}</style>
    </motion.div>
  );
};

export default FacturaDetalle;
