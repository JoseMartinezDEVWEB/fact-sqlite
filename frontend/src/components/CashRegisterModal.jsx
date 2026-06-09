import React, { useState, useEffect } from 'react';
import { cashRegisterApi } from '../config/apis';
import { useAuth } from '../hooks/useAuth';

const CashRegisterModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [currentShift, setCurrentShift] = useState(null);
  const [currentSales, setCurrentSales] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [declaredAmount, setDeclaredAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCurrentShift();
    }
  }, [isOpen]);

  const loadCurrentShift = async () => {
    try {
      const data = await cashRegisterApi.getCurrentShift();
      if (data.hasOpenShift) {
        setCurrentShift(data.shift);
        setCurrentSales(data.currentSales);
      } else {
        setCurrentShift(null);
        setCurrentSales(null);
      }
    } catch (err) {
      console.error('Error al cargar turno:', err);
    }
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const amount = parseFloat(initialAmount) || 0;
      await cashRegisterApi.openShift(amount);
      setSuccess('Turno abierto exitosamente');
      setInitialAmount('');
      await loadCurrentShift();
      setTimeout(() => setSuccess(''), 3000);
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
      await loadCurrentShift();
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cerrar turno');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50
  };

  const modalStyle = {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    maxWidth: '28rem',
    width: '100%',
    padding: '1rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    maxHeight: '90vh',
    overflowY: 'auto'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    boxSizing: 'border-box'
  };

  const btnOpenStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    fontWeight: 'bold',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1
  };

  const btnCloseStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    fontWeight: 'bold',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
            {currentShift ? '💵 Cerrar Turno de Caja' : '💵 Abrir Turno de Caja'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        {error && <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>}
        {success && <div style={{ padding: '0.75rem', backgroundColor: '#d1fae5', color: '#047857', borderRadius: '0.5rem', marginBottom: '1rem' }}>{success}</div>}

        {!currentShift ? (
          <form onSubmit={handleOpenShift}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Monto de Apertura</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="0.00"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />
              <small style={{ color: '#6b7280', display: 'block', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                Cantidad de efectivo que el admin entrega al comenzar
              </small>
            </div>
            <button type="submit" style={btnOpenStyle} disabled={loading}>
              ✓ {loading ? 'Abriendo...' : 'Abrir Turno'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCloseShift}>
            <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Abierto por:</strong> {currentShift.openedBy?.name || 'Usuario'}</p>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Hora:</strong> {new Date(currentShift.openedAt).toLocaleString()}</p>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Monto inicial:</strong> ${currentShift.initialAmount?.toFixed(2)}</p>
              
              {currentSales && (
                <p style={{ margin: '0', color: '#047857', fontWeight: 'bold' }}>
                  Efectivo esperado = inicial + ventas efectivo - gastos<br/>
                  = ${(currentShift.initialAmount + currentSales.cashSales - (currentShift.expenses || 0)).toFixed(2)}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Monto Declarado</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="0.00"
                value={declaredAmount}
                onChange={(e) => setDeclaredAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Notas de cierre (opcional)</label>
              <textarea
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                placeholder="Observaciones..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
              />
            </div>

            <button type="submit" style={btnCloseStyle} disabled={loading}>
              ✗ {loading ? 'Cerrando...' : 'Cerrar Turno'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CashRegisterModal;