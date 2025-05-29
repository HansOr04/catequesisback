const jwt = require('jsonwebtoken');
const response = require('../utils/response');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return response.unauthorized(res, 'Token de acceso requerido');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return response.unauthorized(res, 'Token expirado');
      }
      return response.unauthorized(res, 'Token inválido');
    }
    req.user = user;
    next();
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.tipo_perfil)) {
      return response.forbidden(res, 'No tienes permisos para acceder a este recurso');
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };