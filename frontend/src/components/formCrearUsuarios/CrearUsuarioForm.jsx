import React, { useState, useEffect } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import ModalNotification from '../common/ModalNotification';
import { useNotification } from '../../hooks/useNotification';

const CrearUsuarioForm = ({ onSuccess }) => {
  const { user } = useAuth();
  // Verificar si el usuario actual es superadmin
  const isSuperAdmin = user?.role === 'superadmin';
  console.log('Usuario actual:', user);
  console.log('Rol del usuario:', user?.role);
  console.log('¿Es superadmin?', isSuperAdmin);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'cliente',
    licenseType: 'trial',
    licenseDuration: 5,
    subscriptionType: 'one-time',
    autoRenew: false,
    sendReminders: true,
    trialPeriod: true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  const validate = () => {
    const errs = {};
    if (!formData.username) errs.username = 'Nombre de usuario es requerido';
    if (!formData.email) errs.email = 'Correo es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Correo inválido';
    if (!formData.password) errs.password = 'Contraseña es requerida';
    else if (formData.password.length < 6) errs.password = 'Mínimo 6 caracteres';
    if (!formData.role) errs.role = 'Rol es requerido';
    if (isSuperAdmin) {
      if (!formData.licenseType) errs.licenseType = 'Tipo de licencia es requerido';
      if (!formData.licenseDuration || formData.licenseDuration <= 0) errs.licenseDuration = 'Duración válida es requerida';
      if (!formData.subscriptionType) errs.subscriptionType = 'Tipo de suscripción es requerido';
      
      // Si es suscripción recurrente, validar que la duración sea coherente con el tipo de licencia
      if (formData.subscriptionType === 'recurring') {
        const minDurations = {
          'trial': 5,
          'basic': 30,
          'premium': 90,
          'enterprise': 365
        };
        
        if (formData.licenseDuration < minDurations[formData.licenseType]) {
          errs.licenseDuration = `Para licencias ${formData.licenseType}, la duración mínima es de ${minDurations[formData.licenseType]} días`;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    
    // Para checkboxes, usar el valor 'checked' en lugar de 'value'
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => {
      const updatedData = { ...prev, [name]: newValue };
      
      // Lógica para ajustar valores relacionados
      if (name === 'licenseType') {
        // Ajustar duración según el tipo de licencia
        switch (value) {
          case 'trial':
            updatedData.licenseDuration = 5;
            break;
          case 'basic':
            updatedData.licenseDuration = 30;
            break;
          case 'premium':
            updatedData.licenseDuration = 90;
            break;
          case 'enterprise':
            updatedData.licenseDuration = 365;
            break;
        }
      }
      
      // Si cambia a suscripción de un solo uso, desactivar auto-renovación
      if (name === 'subscriptionType' && value === 'one-time') {
        updatedData.autoRenew = false;
      }
      
      // Si es licencia de prueba, activar período de prueba
      if (name === 'licenseType' && value === 'trial') {
        updatedData.trialPeriod = true;
      }
      
      return updatedData;
    });
    
    if (errors[name]) validate();
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
      };

      // Si es superadmin o el usuario actual tiene permisos para crear licencias, agregar información de licencia
      if (user?.role === 'superadmin') {
        userData.license = {
          type: formData.licenseType,
          duration: parseInt(formData.licenseDuration),
          subscription: {
            type: formData.subscriptionType,
            autoRenew: formData.autoRenew,
            sendReminders: formData.sendReminders
          },
          trialPeriod: formData.trialPeriod
        };
      }

      await api.post('/auth/users', userData);
      showSuccess('create', 'el usuario');
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'cliente',
        licenseType: 'trial',
        licenseDuration: 5,
        subscriptionType: 'one-time',
        autoRenew: false,
        sendReminders: true,
        trialPeriod: true
      });
      
      toast.success('Usuario creado exitosamente');
      onSuccess?.();
    } catch (err) {
      console.error('Error al crear usuario:', err);
      showError('create', 'el usuario', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="p-4 bg-white shadow rounded">
        <h2 className="text-xl font-semibold mb-4">Crear Usuario</h2>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Usuario</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.username && <p className="text-red-600 text-sm mt-1">{errors.username}</p>}
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Correo</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Contraseña</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Rol</label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        >
          {isSuperAdmin && <option value="superadmin">Super Admin</option>}
          <option value="admin">Admin</option>
          <option value="encargado">Encargado</option>
          <option value="cajero">Cajero</option>
          <option value="cliente">Cliente</option>
        </select>
        {errors.role && <p className="text-red-600 text-sm mt-1">{errors.role}</p>}
      </div>

      {/* Sección de licencia - Solo visible para superadmin */}
      {isSuperAdmin && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Configuración de Licencia y Suscripción</h3>
          
          {/* Tipo de licencia y duración */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Tipo de Licencia</label>
              <select
                name="licenseType"
                value={formData.licenseType}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="trial">Prueba</option>
                <option value="basic">Básica</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Empresarial</option>
              </select>
              {errors.licenseType && <p className="text-red-600 text-sm mt-1">{errors.licenseType}</p>}
            </div>
            
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Duración (días)</label>
              <input
                type="number"
                name="licenseDuration"
                value={formData.licenseDuration}
                onChange={handleChange}
                min="1"
                max="365"
                className="w-full border px-3 py-2 rounded"
              />
              {errors.licenseDuration && <p className="text-red-600 text-sm mt-1">{errors.licenseDuration}</p>}
            </div>
          </div>
          
          {/* Tipo de suscripción */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tipo de Suscripción</label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="subscriptionType"
                  value="one-time"
                  checked={formData.subscriptionType === 'one-time'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span>Único pago (sin renovación)</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="subscriptionType"
                  value="recurring"
                  checked={formData.subscriptionType === 'recurring'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span>Suscripción recurrente</span>
              </label>
            </div>
            {errors.subscriptionType && <p className="text-red-600 text-sm mt-1">{errors.subscriptionType}</p>}
          </div>
          
          {/* Opciones adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {formData.subscriptionType === 'recurring' && (
              <div className="mb-3">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="autoRenew"
                    checked={formData.autoRenew}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span>Renovación automática</span>
                </label>
              </div>
            )}
            
            <div className="mb-3">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="sendReminders"
                  checked={formData.sendReminders}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span>Enviar recordatorios de renovación</span>
              </label>
            </div>
            
            {formData.licenseType !== 'trial' && (
              <div className="mb-3">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="trialPeriod"
                    checked={formData.trialPeriod}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span>Incluir período de prueba (5 días)</span>
                </label>
              </div>
            )}
          </div>
          
          {/* Información sobre tipos de licencia */}
          <div className="mt-4 p-3 bg-white rounded border border-blue-100 text-sm text-blue-700">
            <p className="font-semibold mb-2">Información sobre licencias:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><strong>Prueba:</strong> Acceso limitado por 5 días</li>
              <li><strong>Básica:</strong> Acceso completo por 30 días</li>
              <li><strong>Premium:</strong> Acceso completo por 90 días con soporte</li>
              <li><strong>Empresarial:</strong> Acceso completo por 365 días con soporte prioritario</li>
            </ul>
            
            <p className="font-semibold mt-3 mb-2">Información sobre suscripciones:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><strong>Único pago:</strong> El usuario deberá renovar manualmente al vencimiento</li>
              <li><strong>Suscripción recurrente:</strong> Se renovará automáticamente si tiene activada la opción</li>
              <li><strong>Recordatorios:</strong> Se enviarán notificaciones 7, 3 y 1 día antes del vencimiento</li>
              <li><strong>Período de prueba:</strong> Acceso gratuito por 5 días antes de iniciar la licencia pagada</li>
            </ul>
          </div>
        </div>
      )}
      
      <button
        type="submit"
        disabled={loading}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creando...' : 'Crear Usuario'}
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

export default CrearUsuarioForm;