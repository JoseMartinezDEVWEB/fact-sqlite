import React, { useState, useEffect } from 'react';
import { cashRegisterApi } from '../../config/apis';

const CashRegisterModal = ({ isOpen, onClose, currentShift, setCurrentShift }) => {
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [initialAmount, setInitialAmount]   = useState('');
  const [declaredAmount, setDeclaredAmount] = useState('');
  const [closingNotes, setClosingNotes]     = useState('');
  const [shiftJustOpened, setShiftJustOpened] = useState(false);

  // Cargar estado actual del turno cada vez que el modal se abre
  const loadCurrentShift = async () => {
    try {
      const data = await cashRegisterApi.getCurrentShift();
      if (setCurrentShift) {
        setCurrentShift(data.hasOpenShift ? data.shift : null);
      }
    } catch (err) {
      console.error('Error al cargar turno:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess('');
      setShiftJustOpened(false);
      loadCurrentShift();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleOpenShift = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const amount = parseFloat(initialAmount) || 0;
      await cashRegisterApi.openShift(amount);
      setSuccess('¡Turno abierto exitosamente!');
      setInitialAmount('');
      setShiftJustOpened(true);
      await loadCurrentShift();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al abrir turno');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const amount = parseFloat(declaredAmount) || 0;
      await cashRegisterApi.closeShift(amount, closingNotes);
      setSuccess('Turno cerrado exitosamente');
      setDeclaredAmount('');
      setClosingNotes('');
      if (setCurrentShift) setCurrentShift(null);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cerrar turno');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount || 0);

  if (!isOpen) return null;

  const overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
  };
  const card = {
    backgroundColor: 'white', borderRadius: 12, width: '100%',
    maxWidth: 420, maxHeight: '92vh', overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  };
  const btn = (color, disabled) => ({
    width: '100%', backgroundColor: disabled ? '#9ca3af' : color,
    color: 'white', padding: '13px 16px', borderRadius: 8,
    fontSize: 15, fontWeight: 600, border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer'
  });

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={card}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            🏧 {currentShift ? 'Cerrar Turno de Caja' : 'Abrir Turno de Caja'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '20px' }}>
          {error   && <div style={{ padding: 12, backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
          {success && <div style={{ padding: 12, backgroundColor: '#d1fae5', color: '#047857', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 600 }}>{success}</div>}

          {/* ── Sin turno abierto → formulario de apertura ── */}
          {!currentShift ? (
            <form onSubmit={handleOpenShift}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                  Monto de Apertura (Efectivo inicial)
                </label>
                <input
                  type="number" min="0" step="0.01" required
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }}
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  placeholder="Ej: 2000"
                  autoFocus
                />
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                  Efectivo disponible al comenzar el turno
                </p>
              </div>
              <button type="submit" disabled={loading} style={btn('#10b981', loading)}>
                {loading ? 'Abriendo...' : '✓ Abrir Turno'}
              </button>
            </form>
          ) : (
            /* ── Turno abierto ── */
            <>
              {/* Info del turno */}
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <span style={{ fontWeight: 700, color: '#15803d', fontSize: 14 }}>Turno activo</span>
                </div>
                <p style={{ margin: '4px 0', fontSize: 13, color: '#374151' }}>
                  <strong>Abierto por:</strong> {currentShift.openedBy?.name || 'Usuario'}
                </p>
                <p style={{ margin: '4px 0', fontSize: 13, color: '#374151' }}>
                  <strong>Hora:</strong> {new Date(currentShift.openedAt).toLocaleString('es-DO')}
                </p>
                <p style={{ margin: '4px 0', fontSize: 13, color: '#374151' }}>
                  <strong>Monto inicial:</strong> {formatCurrency(currentShift.initialAmount || currentShift.openingAmount)}
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#059669', fontWeight: 600 }}>
                  Efectivo esperado = inicial + ventas efectivo − gastos<br/>
                  = {formatCurrency((currentShift.initialAmount || currentShift.openingAmount || 0) + (currentShift.cashSales || 0) - (currentShift.expenses || 0))}
                </p>
              </div>

              {/* Si el turno se acaba de abrir, mostrar botón de continuar */}
              {shiftJustOpened && (
                <button
                  type="button"
                  onClick={onClose}
                  style={{ ...btn('#2563eb', false), marginBottom: 12 }}
                >
                  ▶ Continuar con la Venta
                </button>
              )}

              {/* Formulario de cierre */}
              <form onSubmit={handleCloseShift}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                    Monto Declarado al Cerrar
                  </label>
                  <input
                    type="number" min="0" step="0.01" required
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }}
                    value={declaredAmount}
                    onChange={(e) => setDeclaredAmount(e.target.value)}
                    placeholder="Ej: 3500"
                  />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                    Notas de cierre <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <textarea
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                    rows={2}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Observaciones..."
                  />
                </div>
                <button type="submit" disabled={loading} style={btn('#dc2626', loading)}>
                  {loading ? 'Cerrando...' : '✗ Cerrar Turno'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashRegisterModal;
