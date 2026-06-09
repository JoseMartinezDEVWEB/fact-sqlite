import React, { useState } from 'react';
import { clienteApi } from '../../config/apis';
import ModalNotification from '../common/ModalNotification';
import { useNotification } from '../../hooks/useNotification';

const CrearClienteForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  const validate = () => {
    const errs = {};
    if (!formData.name) errs.name = 'Nombre es requerido';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Correo inválido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) validate();
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await clienteApi.create({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        email: formData.email
      });
      showSuccess('create', 'el cliente');
      setFormData({ name: '', phone: '', address: '', email: '' });
      onSuccess?.();
    } catch (err) {
      console.error('Error al crear cliente:', err);
      showError('create', 'el cliente', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="p-4 bg-white shadow rounded">
        <h2 className="text-xl font-semibold mb-4">Crear Cliente</h2>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Nombre *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Teléfono <span className="text-gray-400 text-xs">(opcional)</span></label>
        <input
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Dirección</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Correo <span className="text-gray-400 text-xs">(opcional)</span></label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creando...' : 'Crear Cliente'}
      </button>
    </form>

    {/* Notificación Modal */}
    <ModalNotification
      isOpen={notification.isOpen}
      onClose={hideNotification}
      title={notification.title}
      message={notification.message}
      type={notification.type}
    />
  </>
  );
};

export default CrearClienteForm; 