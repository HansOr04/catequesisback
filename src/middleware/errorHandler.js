const response = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error capturado:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (err.name === 'RequestError' || err.name === 'ConnectionError') {
    if (err.message.includes('FOREIGN KEY constraint')) {
      return response.conflict(res, 'No se puede eliminar el registro porque está siendo utilizado');
    }
    
    if (err.message.includes('UNIQUE constraint')) {
      return response.conflict(res, 'Ya existe un registro con estos datos');
    }
    
    return response.serverError(res, 'Error en la base de datos');
  }

  return response.serverError(res, 'Error interno del servidor');
};

module.exports = errorHandler;