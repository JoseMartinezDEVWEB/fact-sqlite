import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout } from '../services/authService';
import { loginUser, logoutUser } from '../services/loginService';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '../config/electronConfig';
import { clearSession } from '../utils/clearSession';

const AuthContext = createContext();

// ─── Helpers síncronos ───────────────────────────────────────────────────────
const readUserFromStorage = () => {
  try {
    const raw = getLocalStorage('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u) return null;
    // Normalizar: asegurar que _id siempre esté presente
    if (u.id && !u._id) u._id = u.id;
    return u._id ? u : null;
  } catch {
    return null;
  }
};

const isStoredSessionValid = () => {
  const token = getLocalStorage('token');
  if (!token) return false;
  const user = readUserFromStorage();
  return !!(user && (user._id || user.id));
};

// ─── Provider ────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  // Inicialización SÍNCRONA desde localStorage:
  // de esta forma, al hacer F5/Ctrl+R la app ya sabe si hay sesión
  // y NO hay ciclo loading → blank → render.
  const [isAuthenticated, setIsAuthenticated] = useState(() => isStoredSessionValid());
  const [user, setUser]                       = useState(() => readUserFromStorage());
  const [loading, setLoading]                 = useState(false);   // ← empieza en false
  const [error, setError]                     = useState(null);

  // Verificación ligera en background (no bloquea el render)
  const checkAuth = useCallback(async () => {
    const token = getLocalStorage('token');
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return;
    }

    const storedUser = readUserFromStorage();
    if (storedUser) {
      // Sesión válida en localStorage — mostrar app inmediatamente
      setUser(storedUser);
      setIsAuthenticated(true);
    } else {
      // No hay datos de usuario — limpiar sesión
      removeLocalStorage('token');
      removeLocalStorage('userRole');
      removeLocalStorage('user');
      setIsAuthenticated(false);
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Verificar sesión al montar (solo si hay token y aun no hay user en estado)
  useEffect(() => {
    if (!isAuthenticated || !user) {
      checkAuth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = async (credentials) => {
    setError(null);
    try {
      const data = await loginUser(credentials);
      let userInfo = data.user || null;
      if (!userInfo || !(userInfo._id || userInfo.id) || !userInfo.role) {
        throw new Error('Respuesta de login inválida: falta role o ID de usuario.');
      }
      if (userInfo.id && !userInfo._id) userInfo._id = userInfo.id;

      setLocalStorage('userRole', userInfo.role);
      setLocalStorage('userName', userInfo.username || userInfo.email || '');
      setLocalStorage('user', JSON.stringify(userInfo));

      setIsAuthenticated(true);
      setUser(userInfo);
      return data;
    } catch (err) {
      const msg = err.message || 'Error al iniciar sesión';
      setError(msg);
      setIsAuthenticated(false);
      setUser(null);
      throw err;
    }
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      logoutUser();
    } catch (e) {
      console.error('Error durante cierre de sesión:', e);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const contextValue = {
    isAuthenticated,
    loading,
    login,
    logout,
    user,
    error,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};

export default AuthContext;
