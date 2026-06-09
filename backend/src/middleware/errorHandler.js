// Middleware para manejo centralizado de errores
const errorHandler = (err, req, res, next) => {
  console.error('Error en el servidor:', err);

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      status: 'error',
      message: 'Error de validación',
      errors: errors
    });
  }

  // Error de duplicado (código 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      status: 'error',
      message: `Ya existe un registro con este ${field}`,
      field: field
    });
  }

  // Error de ID inválido de MongoDB
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      message: 'ID inválido'
    });
  }

  // Error de timeout de operación
  if (err.name === 'MongooseError' && err.message.includes('timeout')) {
    return res.status(408).json({
      status: 'error',
      message: 'La operación tardó demasiado en completarse'
    });
  }

  // Error de conexión a la base de datos
  if (err.name === 'MongoNetworkError') {
    return res.status(503).json({
      status: 'error',
      message: 'Error de conexión con la base de datos'
    });
  }

  // Error de autenticación de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token inválido'
    });
  }

  // Error de expiración de JWT
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expirado'
    });
  }

  // Error genérico del servidor
  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
};

export default errorHandler;



