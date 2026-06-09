// Middleware para establecer timeout en las operaciones
const timeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    // Crear un timeout para la operación
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          status: 'error',
          message: 'La operación tardó demasiado en completarse'
        });
      }
    }, timeoutMs);

    // Limpiar el timeout cuando la respuesta se complete
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
};

export default timeout;



