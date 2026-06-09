import React from 'react';
import LicenseManagementSimple from '../../components/license/LicenseManagementSimple';

const LicenseManagement = () => {
  return <LicenseManagementSimple />;
};
  });
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' o 'edit'
  const [users, setUsers] = useState([]);

  // Verificar si el usuario es superadmin
  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      toast.error('No tienes permiso para acceder a esta página');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Cargar licencias y usuarios
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [licensesResponse, usersResponse] = await Promise.all([
          api.get('/licenses'),
          api.get('/auth/users')
        ]);
        
        if (licensesResponse.data.success) {
          setLicenses(licensesResponse.data.data);
        }
        
        if (usersResponse.data.success) {
          setUsers(usersResponse.data.data);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        toast.error('Error al cargar los datos de licencias');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      type: 'trial',
      duration: 5,
      notes: ''
    });
    setSelectedLicense(null);
    setShowForm(false);
  };

  const handleCreateLicense = () => {
    setFormMode('create');
    resetForm();
    setShowForm(true);
  };

  const handleEditLicense = (license) => {
    setFormMode('edit');
    setSelectedLicense(license);
    setFormData({
      userId: license.userId,
      type: license.type,
      duration: license.duration || 5,
      notes: license.notes || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.userId) {
      toast.error('Debes seleccionar un usuario');
      return;
    }
    
    try {
      setLoading(true);
      let response;
      
      if (formMode === 'create') {
        response = await api.post('/api/licenses/activate', formData);
      } else {
        response = await api.put(`/api/licenses/${selectedLicense._id}/renew`, {
          type: formData.type,
          duration: parseInt(formData.duration),
          notes: formData.notes
        });
      }
      
      if (response.data.success) {
        toast.success(formMode === 'create' ? 'Licencia creada con éxito' : 'Licencia actualizada con éxito');
        
        // Recargar licencias
        const licensesResponse = await api.get('/api/licenses');
        if (licensesResponse.data.success) {
          setLicenses(licensesResponse.data.data);
        }
        
        resetForm();
      } else {
        toast.error(response.data.message || 'Error al procesar la licencia');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Error al procesar la licencia');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockLicense = async (licenseId) => {
    if (!window.confirm('¿Estás seguro de que deseas bloquear esta licencia?')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.put(`/api/licenses/${licenseId}/block`);
      
      if (response.data.success) {
        toast.success('Licencia bloqueada con éxito');
        
        // Recargar licencias
        const licensesResponse = await api.get('/api/licenses');
        if (licensesResponse.data.success) {
          setLicenses(licensesResponse.data.data);
        }
      } else {
        toast.error(response.data.message || 'Error al bloquear la licencia');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Error al bloquear la licencia');
    } finally {
      setLoading(false);
    }
  };

  const getLicenseStatusClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'blocked':
        return 'bg-gray-100 text-gray-800';
      case 'grace':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getLicenseStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'expired':
        return 'Expirada';
      case 'blocked':
        return 'Bloqueada';
      case 'grace':
        return 'Período de gracia';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getUserName = (userId) => {
    const user = users.find(u => u._id === userId);
    return user ? user.username : 'Usuario desconocido';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="container mx-auto p-4"
    >
      <div className="bg-white rounded-lg shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Licencias</h1>
          <button
            onClick={handleCreateLicense}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Nueva Licencia
          </button>
        </div>

        {showForm && (
          <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">
              {formMode === 'create' ? 'Crear Nueva Licencia' : 'Editar Licencia'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                  <select
                    name="userId"
                    value={formData.userId}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={formMode === 'edit'}
                    required
                  >
                    <option value="">Seleccionar usuario</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.username} ({user.email}) - {user.role}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Licencia *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="trial">Prueba</option>
                    <option value="basic">Básica</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Empresarial</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (días) *</label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    min="1"
                    max="365"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="2"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Procesando...' : formMode === 'create' ? 'Crear Licencia' : 'Actualizar Licencia'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && !showForm ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Inicio
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Expiración
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {licenses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-4 px-4 text-center text-gray-500">
                      No hay licencias registradas
                    </td>
                  </tr>
                ) : (
                  licenses.map(license => (
                    <tr key={license._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{getUserName(license.userId)}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">{license.type}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLicenseStatusClass(license.status)}`}>
                          {getLicenseStatusText(license.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(license.startDate)}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(license.expiryDate)}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditLicense(license)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Renovar
                          </button>
                          {license.status !== 'blocked' && (
                            <button
                              onClick={() => handleBlockLicense(license._id)}
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

        <div className="mt-8 bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Información sobre licencias</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-700 mb-1">Tipos de licencia:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li><span className="font-medium">Prueba:</span> Acceso limitado por 5 días</li>
                <li><span className="font-medium">Básica:</span> Acceso completo por 30 días</li>
                <li><span className="font-medium">Premium:</span> Acceso completo por 90 días con soporte</li>
                <li><span className="font-medium">Empresarial:</span> Acceso completo por 365 días con soporte prioritario</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-700 mb-1">Estados de licencia:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li><span className="font-medium">Activa:</span> La licencia está vigente y el usuario tiene acceso completo</li>
                <li><span className="font-medium">Período de gracia:</span> La licencia ha expirado pero el usuario aún tiene acceso (2 días)</li>
                <li><span className="font-medium">Expirada:</span> La licencia ha expirado y el usuario no tiene acceso</li>
                <li><span className="font-medium">Bloqueada:</span> La licencia ha sido bloqueada manualmente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LicenseManagement;
