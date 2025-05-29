const success = (res, data = null, message = 'Operación exitosa', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  };
  
  const error = (res, message = 'Error interno del servidor', statusCode = 500, details = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      error: details,
      timestamp: new Date().toISOString()
    });
  };
  
  const created = (res, data = null, message = 'Recurso creado exitosamente') => {
    return success(res, data, message, 201);
  };
  
  const notFound = (res, message = 'Recurso no encontrado') => {
    return error(res, message, 404);
  };
  
  const badRequest = (res, message = 'Solicitud inválida', details = null) => {
    return error(res, message, 400, details);
  };
  
  const unauthorized = (res, message = 'No autorizado') => {
    return error(res, message, 401);
  };
  
  const forbidden = (res, message = 'Acceso prohibido') => {
    return error(res, message, 403);
  };
  
  const conflict = (res, message = 'Conflicto en la solicitud', details = null) => {
    return error(res, message, 409, details);
  };
  
  const serverError = (res, message = 'Error interno del servidor', details = null) => {
    return error(res, message, 500, details);
  };
  
  module.exports = {
    success,
    error,
    created,
    notFound,
    badRequest,
    unauthorized,
    forbidden,
    conflict,
    serverError
  };