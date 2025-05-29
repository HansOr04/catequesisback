const { validationResult, body, param, query } = require('express-validator');
const response = require('../utils/response');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    return response.badRequest(res, 'Errores de validación', errorMessages);
  }
  next();
};

// AGREGAR ESTA FUNCIÓN
const validateId = (fieldName = 'id') => [
  param(fieldName)
    .isInt({ min: 1 })
    .withMessage(`${fieldName} debe ser un número entero positivo`)
];

const validateLogin = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username debe tener entre 3 y 50 caracteres'),
  body('password').isLength({ min: 6 }).withMessage('Password debe tener al menos 6 caracteres')
];

// ACTUALIZAR EL MODULE.EXPORTS
module.exports = { 
  handleValidationErrors, 
  validateLogin,
  validateId  // AGREGAR ESTA LÍNEA
};