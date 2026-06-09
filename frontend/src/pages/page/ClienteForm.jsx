import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axiosConfig';
import CrearClienteForm from '../../components/formCrearClientes/CrearClienteForm';
import CrearUsuarioForm from '../../components/formCrearUsuarios/CrearUsuarioForm';

/* ─── helpers ─────────────────────────────────────────────── */
const roleBadge = (role) => {
  const map = {
    superadmin: 'bg-purple-100 text-purple-800',
    admin:      'bg-blue-100   text-blue-800',
    encargado:  'bg-green-100  text-green-800',
    cajero:     'bg-yellow-100 text-yellow-800',
    cliente:    'bg-gray-100   text-gray-700',
  };
  return map[role] || 'bg-gray-100 text-gray-700';
};

/* ─── Modal de edición de cliente ─────────────────────────── */
const EditClienteModal = ({ cliente, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name:    cliente.name    || '',
    phone:   cliente.phone   || '',
    address: cliente.address?.street || cliente.address || '',
    email:   cliente.email   || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name) { setError('El nombre es requerido'); return; }
    setLoading(true); setError('');
    try {
      await api.put(`/clientes/${cliente._id || cliente.id}`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Editar Cliente</h3>
        {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          {[['name','Nombre','text',true],['phone','Teléfono','text',false],
            ['address','Dirección','text',false],['email','Correo','email',false]
          ].map(([name, label, type, req]) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}{req && ' *'}</label>
              <input type={type} name={name} value={form[name]} onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Modal de edición de usuario ─────────────────────────── */
const EditUsuarioModal = ({ usuario, currentUserRole, onClose, onSaved }) => {
  const [form, setForm] = useState({
    username: usuario.username || '',
    email:    usuario.email    || '',
    role:     usuario.role     || 'cajero',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const rolesPermitidos = currentUserRole === 'superadmin'
    ? ['superadmin','admin','encargado','cajero','cliente']
    : ['admin','encargado','cajero','cliente'];

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.username) { setError('El nombre de usuario es requerido'); return; }
    setLoading(true); setError('');
    try {
      await api.put(`/auth/users/${usuario._id || usuario.id}`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Editar Usuario</h3>
        {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
            <input type="text" name="username" value={form.username} onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
            <input type="email" name="email" value={form.email} onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select name="role" value={form.role} onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              {rolesPermitidos.map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Tabla de Clientes ────────────────────────────────────── */
const TablaClientes = ({ canEdit, refreshTrigger }) => {
  const [clientes, setClientes]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [page, setPage]             = useState(1);
  const PER_PAGE = 10;

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/clientes?limit=200');
      const data = res.data?.data || res.data || [];
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes, refreshTrigger]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    try {
      await api.delete(`/clientes/${id}`);
      setClientes(prev => prev.filter(c => (c._id || c.id) !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const filtered = clientes.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      {editTarget && (
        <EditClienteModal
          cliente={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchClientes(); }}
        />
      )}

      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <span className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          Clientes <span className="text-xs font-normal text-gray-500">({filtered.length})</span>
        </h2>
        <input
          type="text" placeholder="Buscar cliente..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-1.5 text-sm w-52 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500" />
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          {search ? 'No se encontraron clientes con ese criterio' : 'No hay clientes registrados'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                {['Nombre','Teléfono','Correo','Deuda pendiente',canEdit ? 'Acciones' : ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(c => {
                const id = c._id || c.id;
                return (
                  <tr key={id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                    <td className="px-4 py-3">
                      {c.cuentasPendientes > 0 ? (
                        <span className="text-red-600 font-semibold">RD$ {Number(c.cuentasPendientes).toFixed(2)}</span>
                      ) : (
                        <span className="text-green-600 text-xs">Sin deuda</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditTarget(c)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50">
                            Editar
                          </button>
                          <button onClick={() => handleDelete(id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">‹</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">›</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Tabla de Usuarios ────────────────────────────────────── */
const TablaUsuarios = ({ currentUser, canDelete, refreshTrigger }) => {
  const [usuarios, setUsuarios]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [page, setPage]             = useState(1);
  const PER_PAGE = 10;

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      const data = res.data?.data || res.data || [];
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios, refreshTrigger]);

  const handleDelete = async (id) => {
    if (id === (currentUser._id || currentUser.id)) {
      alert('No puedes eliminar tu propia cuenta');
      return;
    }
    if (!window.confirm('¿Eliminar este usuario?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      setUsuarios(prev => prev.filter(u => (u._id || u.id) !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const filtered = usuarios.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      {editTarget && (
        <EditUsuarioModal
          usuario={editTarget}
          currentUserRole={currentUser.role}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchUsuarios(); }}
        />
      )}

      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <span className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          Usuarios <span className="text-xs font-normal text-gray-500">({filtered.length})</span>
        </h2>
        <input
          type="text" placeholder="Buscar usuario..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-1.5 text-sm w-52 focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500" />
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          {search ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios registrados'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                {['Usuario','Correo','Rol','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(u => {
                const id = u._id || u.id;
                const isMe = id === (currentUser._id || currentUser.id);
                return (
                  <tr key={id} className={`hover:bg-gray-50 transition-colors ${isMe ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {u.username}
                      {isMe && <span className="ml-2 text-xs text-blue-500">(tú)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditTarget(u)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50">
                          Editar
                        </button>
                        {canDelete && !isMe && (
                          <button onClick={() => handleDelete(id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50">
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">‹</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">›</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Página principal ─────────────────────────────────────── */
export const ClienteForm = () => {
  const { user } = useAuth();
  const role     = user?.role || '';

  const isCajero     = role === 'cajero';
  const isEncargado  = role === 'encargado';
  const isAdmin      = role === 'admin';
  const isSuperAdmin = role === 'superadmin';

  // Permisos
  const canSeeUsers    = isSuperAdmin || isAdmin || isEncargado;
  const canEditClients = isSuperAdmin || isAdmin || isEncargado || isCajero;
  const canDeleteUsers = isSuperAdmin || isAdmin;

  const [formType, setFormType]       = useState('cliente');
  const [refreshClientes, setRefreshClientes] = useState(0);
  const [refreshUsuarios, setRefreshUsuarios] = useState(0);

  return (
    <div className="p-4 space-y-6">
      {/* ── Cabecera con botones ── */}
      <div className="flex items-center gap-3 flex-wrap" id="clientes-tabs">
        <button
          id="btn-crear-cliente"
          onClick={() => setFormType('cliente')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            formType === 'cliente'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          + Crear Cliente
        </button>

        {canSeeUsers && (
          <button
            id="btn-crear-usuario"
            onClick={() => setFormType('usuario')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              formType === 'usuario'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            + Crear Usuario
          </button>
        )}
      </div>

      {/* ── Formularios ── */}
      {formType === 'cliente' && <CrearClienteForm onSuccess={() => setRefreshClientes(k => k + 1)} />}
      {formType === 'usuario' && canSeeUsers && <CrearUsuarioForm onSuccess={() => setRefreshUsuarios(k => k + 1)} />}

      {/* ── Tablas ── */}
      <div className={`grid gap-6 ${canSeeUsers ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Tabla Clientes — visible para todos */}
        <TablaClientes canEdit={canEditClients} refreshTrigger={refreshClientes} />

        {/* Tabla Usuarios — solo admin, encargado, superadmin */}
        {canSeeUsers && (
          <TablaUsuarios currentUser={user} canDelete={canDeleteUsers} refreshTrigger={refreshUsuarios} />
        )}
      </div>
    </div>
  );
};

export default ClienteForm;
