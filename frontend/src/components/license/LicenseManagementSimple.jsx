import React, { useState, useEffect, Fragment } from 'react';
import { getAllLicenses, renewLicense, blockLicense } from '../../services/licenseService';
import { getAllUsers, deleteUser } from '../../services/userService';
import moment from 'moment';
import toast from 'react-hot-toast';

const LicenseManagementSimple = () => {
  // Estados para datos
  const [users, setUsers] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para modales
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [renewDays, setRenewDays] = useState(30);
  const [renewType, setRenewType] = useState('BASIC');

  // Cargar datos de usuarios y licencias
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar usuarios
        const usersResponse = await getAllUsers();
        setUsers(usersResponse.users || []);
        
        // Cargar licencias
        const licensesResponse = await getAllLicenses();
        setLicenses(licensesResponse.licenses || []);
        
        console.log('Usuarios cargados:', usersResponse.users?.length || 0);
        console.log('Licencias cargadas:', licensesResponse.licenses?.length || 0);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar datos: ' + (err.message || 'Error desconocido'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Función para encontrar la licencia de un usuario
  const findLicenseForUser = (userId) => {
    return licenses.find(license => 
      license.userId && license.userId._id === userId
    );
  };

  // Funciones para modales
  const handleShowRenewModal = (user) => {
    setSelectedUser(user);
    setShowRenewModal(true);
  };

  const handleShowBlockModal = (user) => {
    setSelectedUser(user);
    setShowBlockModal(true);
  };

  const handleShowDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Funciones de acción
  const handleRenewLicense = async () => {
    if (!selectedUser) return;
    
    try {
      const renewData = {
        licenseType: renewType,
        durationDays: parseInt(renewDays, 10)
      };
      
      await renewLicense(selectedUser._id, renewData);
      toast.success('Licencia renovada correctamente');
      setShowRenewModal(false);
      
      // Recargar datos
      const licensesResponse = await getAllLicenses();
      setLicenses(licensesResponse.licenses || []);
    } catch (err) {
      console.error('Error al renovar licencia:', err);
      toast.error('Error al renovar licencia: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleBlockLicense = async () => {
    if (!selectedUser) return;
    
    try {
      const blockData = {
        reason: blockReason || 'Bloqueado por administrador'
      };
      
      await blockLicense(selectedUser._id, blockData);
      toast.success('Licencia bloqueada correctamente');
      setShowBlockModal(false);
      setBlockReason('');
      
      // Recargar datos
      const licensesResponse = await getAllLicenses();
      setLicenses(licensesResponse.licenses || []);
    } catch (err) {
      console.error('Error al bloquear licencia:', err);
      toast.error('Error al bloquear licencia: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await deleteUser(selectedUser._id);
      toast.success('Usuario eliminado correctamente');
      setShowDeleteModal(false);
      
      // Recargar datos
      const usersResponse = await getAllUsers();
      setUsers(usersResponse.users || []);
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      toast.error('Error al eliminar usuario: ' + (err.message || 'Error desconocido'));
    }
  };

  // Formatear fechas
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return moment(date).format('DD/MM/YYYY');
  };

  // Obtener estado de licencia y clase CSS
  const getLicenseStatus = (user) => {
    if (user.role === 'superadmin') {
      return { text: 'SUPERADMIN', variant: 'info' };
    }
    
    const license = findLicenseForUser(user._id);
    if (!license) {
      return { text: 'SIN LICENCIA', variant: 'danger' };
    }
    
    switch (license.status) {
      case 'active':
        return { text: 'ACTIVA', variant: 'success' };
      case 'trial':
        return { text: 'PRUEBA', variant: 'warning' };
      case 'blocked':
        return { text: 'BLOQUEADA', variant: 'danger' };
      case 'expired':
        return { text: 'EXPIRADA', variant: 'secondary' };
      default:
        return { text: license.status.toUpperCase(), variant: 'light' };
    }
  };

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Gestión de Licencias</h2>
      
      {error && (
        <Alert variant="danger">{error}</Alert>
      )}
      
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
        </div>
      ) : (
        <>
          {users.length === 0 ? (
            <Alert variant="info">No hay usuarios registrados</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado Licencia</th>
                  <th>Fecha Expiración</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const license = findLicenseForUser(user._id);
                  const licenseStatus = getLicenseStatus(user);
                  
                  return (
                    <tr key={user._id}>
                      <td>{user.username || user.name || 'Sin nombre'}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        <Badge bg={licenseStatus.variant}>
                          {licenseStatus.text}
                        </Badge>
                      </td>
                      <td>
                        {user.role === 'superadmin' 
                          ? 'Permanente' 
                          : (license ? formatDate(license.expiryDate) : 'N/A')}
                      </td>
                      <td>
                        {user.role !== 'superadmin' && (
                          <>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="me-1"
                              onClick={() => handleShowRenewModal(user)}>
                              {license ? 'Renovar' : 'Activar'}
                            </Button>
                            
                            {license && license.status !== 'blocked' && (
                              <Button 
                                variant="warning" 
                                size="sm" 
                                className="me-1"
                                onClick={() => handleShowBlockModal(user)}>
                                Bloquear
                              </Button>
                            )}
                            
                            <Button 
                              variant="danger" 
                              size="sm"
                              onClick={() => handleShowDeleteModal(user)}>
                              Eliminar
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </>
      )}
      
      {/* Modal para renovar licencia */}
      <Modal show={showRenewModal} onHide={() => setShowRenewModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {findLicenseForUser(selectedUser?._id) ? 'Renovar Licencia' : 'Activar Licencia'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Usuario</Form.Label>
              <Form.Control 
                type="text" 
                value={selectedUser?.username || selectedUser?.email || ''} 
                disabled 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Tipo de Licencia</Form.Label>
              <Form.Select 
                value={renewType} 
                onChange={(e) => setRenewType(e.target.value)}
              >
                <option value="TRIAL">Prueba (5 días)</option>
                <option value="BASIC">Básica (30 días)</option>
                <option value="PREMIUM">Premium (90 días)</option>
                <option value="ENTERPRISE">Empresarial (365 días)</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Duración (días)</Form.Label>
              <Form.Control 
                type="number" 
                value={renewDays} 
                onChange={(e) => setRenewDays(e.target.value)}
                min="1"
                max="999"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRenewModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleRenewLicense}>
            {findLicenseForUser(selectedUser?._id) ? 'Renovar' : 'Activar'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal para bloquear licencia */}
      <Modal show={showBlockModal} onHide={() => setShowBlockModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Bloquear Licencia</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Usuario</Form.Label>
              <Form.Control 
                type="text" 
                value={selectedUser?.username || selectedUser?.email || ''} 
                disabled 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Motivo del bloqueo</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3}
                value={blockReason} 
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ingrese el motivo del bloqueo"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBlockModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleBlockLicense}>
            Bloquear Licencia
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal para eliminar usuario */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar Usuario</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Está seguro que desea eliminar al usuario <strong>{selectedUser?.username || selectedUser?.email || ''}</strong>?</p>
          <p className="text-danger">Esta acción no se puede deshacer.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteUser}>
            Eliminar Usuario
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

  // Cargar datos de usuarios y licencias
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar usuarios
        const usersResponse = await getAllUsers();
        setUsers(usersResponse.users || []);
        
        // Cargar licencias
        const licensesResponse = await getAllLicenses();
        setLicenses(licensesResponse.licenses || []);
        
        console.log('Usuarios cargados:', usersResponse.users?.length || 0);
        console.log('Licencias cargadas:', licensesResponse.licenses?.length || 0);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar datos: ' + (err.message || 'Error desconocido'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Función para encontrar la licencia de un usuario
  const findLicenseForUser = (userId) => {
    return licenses.find(license => 
      license.userId && license.userId._id === userId
    );
  };

  // Funciones para modales
  const handleShowRenewModal = (user) => {
    setSelectedUser(user);
    setShowRenewModal(true);
  };

  const handleShowBlockModal = (user) => {
    setSelectedUser(user);
    setShowBlockModal(true);
  };

  const handleShowDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Funciones de acción
  const handleRenewLicense = async () => {
    if (!selectedUser) return;
    
    try {
      const renewData = {
        licenseType: renewType,
        durationDays: parseInt(renewDays, 10)
      };
      
      await renewLicense(selectedUser._id, renewData);
      toast.success('Licencia renovada correctamente');
      setShowRenewModal(false);
      
      // Recargar datos
      const licensesResponse = await getAllLicenses();
      setLicenses(licensesResponse.licenses || []);
    } catch (err) {
      console.error('Error al renovar licencia:', err);
      toast.error('Error al renovar licencia: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleBlockLicense = async () => {
    if (!selectedUser) return;
    
    try {
      const blockData = {
        reason: blockReason || 'Bloqueado por administrador'
      };
      
      await blockLicense(selectedUser._id, blockData);
      toast.success('Licencia bloqueada correctamente');
      setShowBlockModal(false);
      setBlockReason('');
      
      // Recargar datos
      const licensesResponse = await getAllLicenses();
      setLicenses(licensesResponse.licenses || []);
    } catch (err) {
      console.error('Error al bloquear licencia:', err);
      toast.error('Error al bloquear licencia: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await deleteUser(selectedUser._id);
      toast.success('Usuario eliminado correctamente');
      setShowDeleteModal(false);
      
      // Recargar datos
      const usersResponse = await getAllUsers();
      setUsers(usersResponse.users || []);
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      toast.error('Error al eliminar usuario: ' + (err.message || 'Error desconocido'));
    }
  };

  // Formatear fechas
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return moment(date).format('DD/MM/YYYY');
  };

  // Obtener estado de licencia y clase CSS
  const getLicenseStatus = (user) => {
    if (user.role === 'superadmin') {
      return { text: 'SUPERADMIN', bgColor: 'bg-blue-100 text-blue-800' };
    }
    
    const license = findLicenseForUser(user._id);
    if (!license) {
      return { text: 'SIN LICENCIA', bgColor: 'bg-red-100 text-red-800' };
    }
    
    switch (license.status) {
      case 'active':
        return { text: 'ACTIVA', bgColor: 'bg-green-100 text-green-800' };
      case 'trial':
        return { text: 'PRUEBA', bgColor: 'bg-yellow-100 text-yellow-800' };
      case 'blocked':
        return { text: 'BLOQUEADA', bgColor: 'bg-red-100 text-red-800' };
      case 'expired':
        return { text: 'EXPIRADA', bgColor: 'bg-gray-100 text-gray-800' };
      default:
        return { text: license.status.toUpperCase(), bgColor: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <h2 className="text-2xl font-bold mb-6">Gestión de Licencias</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {users.length === 0 ? (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
              No hay usuarios registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border-b text-left">Usuario</th>
                    <th className="py-2 px-4 border-b text-left">Email</th>
                    <th className="py-2 px-4 border-b text-left">Rol</th>
                    <th className="py-2 px-4 border-b text-left">Estado Licencia</th>
                    <th className="py-2 px-4 border-b text-left">Fecha Expiración</th>
                    <th className="py-2 px-4 border-b text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const license = findLicenseForUser(user._id);
                    const licenseStatus = getLicenseStatus(user);
                    
                    return (
                      <tr key={user._id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{user.username || user.name || 'Sin nombre'}</td>
                        <td className="py-2 px-4">{user.email}</td>
                        <td className="py-2 px-4">{user.role}</td>
                        <td className="py-2 px-4">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${licenseStatus.bgColor}`}>
                            {licenseStatus.text}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          {user.role === 'superadmin' 
                            ? 'Permanente' 
                            : (license ? formatDate(license.expiryDate) : 'N/A')}
                        </td>
                        <td className="py-2 px-4">
                          {user.role !== 'superadmin' && (
                            <div className="space-x-2">
                              <button 
                                className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs"
                                onClick={() => handleShowRenewModal(user)}>
                                {license ? 'Renovar' : 'Activar'}
                              </button>
                              
                              {license && license.status !== 'blocked' && (
                                <button 
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-2 rounded text-xs"
                                  onClick={() => handleShowBlockModal(user)}>
                                  Bloquear
                                </button>
                              )}
                              
                              <button 
                                className="bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded text-xs"
                                onClick={() => handleShowDeleteModal(user)}>
                                Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      
      {/* Modal para renovar licencia */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              {findLicenseForUser(selectedUser?._id) ? 'Renovar Licencia' : 'Activar Licencia'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input 
                type="text" 
                value={selectedUser?.username || selectedUser?.email || ''} 
                disabled 
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Licencia</label>
              <select 
                value={renewType} 
                onChange={(e) => setRenewType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="TRIAL">Prueba (5 días)</option>
                <option value="BASIC">Básica (30 días)</option>
                <option value="PREMIUM">Premium (90 días)</option>
                <option value="ENTERPRISE">Empresarial (365 días)</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración (días)</label>
              <input 
                type="number" 
                value={renewDays} 
                onChange={(e) => setRenewDays(e.target.value)}
                min="1"
                max="999"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowRenewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button 
                onClick={handleRenewLicense}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {findLicenseForUser(selectedUser?._id) ? 'Renovar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para bloquear licencia */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Bloquear Licencia</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input 
                type="text" 
                value={selectedUser?.username || selectedUser?.email || ''} 
                disabled 
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del bloqueo</label>
              <textarea 
                rows="3"
                value={blockReason} 
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ingrese el motivo del bloqueo"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button 
                onClick={handleBlockLicense}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Bloquear Licencia
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para eliminar usuario */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Eliminar Usuario</h3>
            <p className="mb-2">¿Está seguro que desea eliminar al usuario <strong>{selectedUser?.username || selectedUser?.email || ''}</strong>?</p>
            <p className="text-red-600 mb-6">Esta acción no se puede deshacer.</p>
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Eliminar Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenseManagementSimple;
