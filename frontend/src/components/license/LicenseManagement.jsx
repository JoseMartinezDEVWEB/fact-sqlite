import React, { useState, useEffect } from 'react';
import { 
  getAllLicenses, 
  activateLicense, 
  renewLicense, 
  blockLicense,
  getLicenseHistory
} from '../../services/licenseService';
import { getAllUsers, deleteUser } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment';
import { toast } from 'react-toastify';
import { Button, Modal, Form, Table, Badge, Spinner, Alert, Card, Accordion } from 'react-bootstrap';

const LicenseManagement = () => {
  // Estado para licencias
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado para usuarios
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);
  
  // Estado para modales y acciones
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [licenseHistory, setLicenseHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Modales para activación y renovación
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Datos de formulario
  const [licenseType, setLicenseType] = useState('TRIAL');
  const [licenseDuration, setLicenseDuration] = useState(5); // Duración predeterminada: 5 días para prueba
  
  const { user } = useAuth();

  // Fetch all licenses
  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const response = await getAllLicenses();
      setLicenses(response.licenses || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar licencias: ' + (err.message || 'Error desconocido'));
      console.error('Error fetching licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setUserLoading(true);
      const response = await getAllUsers();
      setUsers(response.users || []);
      setUserError(null);
    } catch (err) {
      setUserError('Error al cargar usuarios: ' + (err.message || 'Error desconocido'));
      console.error('Error fetching users:', err);
    } finally {
      setUserLoading(false);
    }
  };

  // Load licenses and users on component mount
  useEffect(() => {
    fetchLicenses();
    fetchUsers();
  }, []);

  // Fetch license history
  const fetchLicenseHistory = async (licenseId) => {
    try {
      setHistoryLoading(true);
      const response = await getLicenseHistory(licenseId);
      setLicenseHistory(response.history || []);
      setHistoryLoading(false);
    } catch (err) {
      console.error('Error fetching license history:', err);
      toast.error('Error al obtener historial de licencia');
    }
  };

  // Handle view history click
  const handleViewHistory = (license) => {
    setSelectedLicense(license);
    setShowHistoryModal(true);
    fetchLicenseHistory(license._id);
  };

  // Handle activate license
  const handleActivate = async () => {
    if (!selectedLicense || !selectedLicense.userId) {
      alert('Por favor, seleccione un usuario');
      return;
    }

    try {
      setLoading(true);
      await activateLicense({
        userId: selectedUserId,
        isTrial,
        notes: actionNotes
      });
      setShowActivateModal(false);
      setActionNotes('');
      setSelectedUserId('');
      fetchLicenses();
    } catch (err) {
      setError('Error al activar licencia: ' + (err.message || 'Error desconocido'));
      console.error('Error activating license:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle renew license
  const handleRenew = async (userId) => {
    if (!actionNotes) {
      if (!confirm('¿Está seguro de renovar esta licencia sin agregar notas?')) {
        return;
      }
    }

    try {
      setLoading(true);
      await renewLicense(userId, { notes: actionNotes });
      setActionNotes('');
      fetchLicenses();
    } catch (err) {
      setError('Error al renovar licencia: ' + (err.message || 'Error desconocido'));
      console.error('Error renewing license:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle block license
  const handleBlock = async (userId) => {
    if (!confirm('¿Está seguro de bloquear esta licencia?')) {
      return;
    }

    try {
      setLoading(true);
      await blockLicense(userId, { notes: actionNotes });
      setActionNotes('');
      fetchLicenses();
    } catch (err) {
      setError('Error al bloquear licencia: ' + (err.message || 'Error desconocido'));
      console.error('Error blocking license:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return moment(date).format('DD/MM/YYYY HH:mm');
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate days remaining
  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 'N/A';
    const now = moment();
    const expiry = moment(expiryDate);
    const days = expiry.diff(now, 'days');
    return days >= 0 ? days : 0;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Administración de Licencias</h1>
        <button
          onClick={() => setShowActivateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Activar Nueva Licencia
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Inicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Expiración
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días Restantes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Validación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {licenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No hay licencias registradas
                  </td>
                </tr>
              ) : (
                licenses && licenses.map((license) => (
                  <tr key={license._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {license.userId?.username || 'Usuario Desconocido'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {license.userId?.email || 'Email no disponible'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(license.status)}`}>
                        {license.status === 'trial' && 'Prueba'}
                        {license.status === 'active' && 'Activa'}
                        {license.status === 'expired' && 'Expirada'}
                        {license.status === 'blocked' && 'Bloqueada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(license.startDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(license.expiryDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDaysRemaining(license.expiryDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(license.lastValidation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewHistory(license)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Historial
                        </button>
                        {license.status !== 'blocked' && (
                          <button
                            onClick={() => handleRenew(license.userId?._id)}
                            disabled={!license.userId}
                            className="text-green-600 hover:text-green-900"
                          >
                            Renovar
                          </button>
                        )}
                        {license.status !== 'blocked' && (
                          <button
                            onClick={() => handleBlock(license.userId?._id)}
                            disabled={!license.userId}
                            className="text-red-600 hover:text-red-900"
                          >
                            Bloquear
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Activate License Modal */}
      {showActivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Activar Nueva Licencia</h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                ID de Usuario
              </label>
              <input
                type="text"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="ID del usuario"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Tipo de Licencia
              </label>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={isTrial}
                    onChange={() => setIsTrial(true)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Prueba (5 días)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={!isTrial}
                    onChange={() => setIsTrial(false)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Completa (30 días)</span>
                </label>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Notas
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="3"
                placeholder="Notas sobre la activación (opcional)"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowActivateModal(false);
                  setActionNotes('');
                  setSelectedUserId('');
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleActivate}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                disabled={!selectedUserId}
              >
                Activar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* License History Modal */}
      {showHistory && selectedLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Historial de Licencia - {selectedLicense.userId?.username || 'Usuario'}
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {historyLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : licenseHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay registros en el historial</p>
            ) : (
              <div className="space-y-4">
                {licenseHistory.map((item) => (
                  <div key={item._id} className="border rounded-lg p-4">
                    <div className="flex justify-between">
                      <div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          item.action === 'created' ? 'bg-green-100 text-green-800' :
                          item.action === 'renewed' ? 'bg-blue-100 text-blue-800' :
                          item.action === 'expired' ? 'bg-yellow-100 text-yellow-800' :
                          item.action === 'blocked' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.action === 'created' && 'Creada'}
                          {item.action === 'renewed' && 'Renovada'}
                          {item.action === 'expired' && 'Expirada'}
                          {item.action === 'blocked' && 'Bloqueada'}
                          {item.action === 'validated' && 'Validada'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(item.actionDate)}
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">{item.notes}</p>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Por: {item.actionBy?.username || 'Sistema'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Input for Actions */}
      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Notas para Acciones</h3>
        <textarea
          value={actionNotes}
          onChange={(e) => setActionNotes(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          rows="3"
          placeholder="Agregar notas para la próxima acción (renovación o bloqueo)"
        ></textarea>
      </div>
    </div>
  );
};

export default LicenseManagement;
