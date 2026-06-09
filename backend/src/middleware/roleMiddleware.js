/**
 * Middleware para autorización basada en roles
 * Verifica si el usuario tiene los roles requeridos para acceder a un recurso
 */
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Verificar si el usuario está autenticado y tiene un rol asignado
      if (!req.user || !req.user.role) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para acceder a este recurso'
        });
      }

      // Verificar si el rol del usuario está en la lista de roles permitidos
      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes el rol necesario para acceder a este recurso'
        });
      }

      // Si el usuario tiene el rol adecuado, permitir el acceso
      next();
    } catch (error) {
      console.error('Error en middleware de autorización:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos',
        error: error.message
      });
    }
  };
};
