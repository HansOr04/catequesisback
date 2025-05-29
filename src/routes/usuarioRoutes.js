const express = require('express');
const router = express.Router();

const usuarioController = require('../controllers/usuarioController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { body, query, param } = require('express-validator');

// Validación de ID
const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero positivo')
];

// Validación de ID de parroquia
const validateIdParroquiaParam = [
  param('idParroquia')
    .isInt({ min: 1 })
    .withMessage('ID de parroquia debe ser un número entero positivo')
];

// Validaciones específicas para usuarios
const validateUsuario = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos'),
  
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('La contraseña debe tener entre 6 y 100 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una letra minúscula, una mayúscula y un número'),
  
  body('tipo_perfil')
    .isIn(['admin', 'parroco', 'secretaria', 'catequista', 'consulta'])
    .withMessage('El tipo de perfil debe ser: admin, parroco, secretaria, catequista o consulta'),
  
  body('id_parroquia')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('ID de parroquia debe ser un número entero positivo')
];

// Validaciones para cambio de contraseña
const validatePasswordChange = [
  body('password_actual')
    .optional()
    .isLength({ min: 1 })
    .withMessage('La contraseña actual es requerida'),
  
  body('password_nueva')
    .isLength({ min: 6, max: 100 })
    .withMessage('La nueva contraseña debe tener entre 6 y 100 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La nueva contraseña debe contener al menos una letra minúscula, una mayúscula y un número')
];
const validateUsuarioUpdate = [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
      .matches(/^[a-zA-Z0-9_.-]+$/)
      .withMessage('El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos'),
    
    body('tipo_perfil')
      .isIn(['admin', 'parroco', 'secretaria', 'catequista', 'consulta'])
      .withMessage('El tipo de perfil debe ser: admin, parroco, secretaria, catequista o consulta'),
    
    body('id_parroquia')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('ID de parroquia debe ser un número entero positivo')
  ];
// Validaciones para búsqueda
const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El término de búsqueda debe tener entre 2 y 50 caracteres'),
  
  query('tipo_perfil')
    .optional()
    .isIn(['admin', 'parroco', 'secretaria', 'catequista', 'consulta'])
    .withMessage('El tipo de perfil debe ser válido')
];

// Validaciones para filtros
const validateFilters = [
  query('parroquia')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de parroquia debe ser un número entero positivo')
];

// Validación para cambio de estado
const validateStatusToggle = [
  body('activo')
    .isBoolean()
    .withMessage('El estado activo debe ser verdadero o falso')
];

/**
 * @route GET /api/usuarios/search
 * @desc Buscar usuarios
 * @access Private (Admin o usuarios de la misma parroquia)
 */
router.get('/search',
  authenticateToken,
  validateSearch,
  handleValidationErrors,
  usuarioController.searchUsuarios
);

/**
 * @route GET /api/usuarios/stats
 * @desc Obtener estadísticas de usuarios
 * @access Private
 */
router.get('/stats',
  authenticateToken,
  usuarioController.getUsuariosStats
);

/**
 * @route GET /api/usuarios/parroquia/:idParroquia
 * @desc Obtener usuarios por parroquia
 * @access Private (Admin o usuarios de la misma parroquia)
 */
router.get('/parroquia/:idParroquia',
  authenticateToken,
  validateIdParroquiaParam,
  handleValidationErrors,
  usuarioController.getUsuariosByParroquia
);

/**
 * @route GET /api/usuarios
 * @desc Obtener todos los usuarios
 * @access Private
 */
router.get('/',
  authenticateToken,
  validateFilters,
  handleValidationErrors,
  usuarioController.getAllUsuarios
);

/**
 * @route GET /api/usuarios/:id
 * @desc Obtener usuario por ID
 * @access Private (Admin o usuarios de la misma parroquia)
 */
router.get('/:id',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  usuarioController.getUsuarioById
);

/**
 * @route POST /api/usuarios
 * @desc Crear nuevo usuario
 * @access Private (Solo Admin)
 */
router.post('/',
  authenticateToken,
  authorizeRoles('admin'),
  validateUsuario,
  handleValidationErrors,
  usuarioController.createUsuario
);

/**
 * @route PUT /api/usuarios/:id
 * @desc Actualizar usuario
 * @access Private (Solo Admin)
 */
router.put('/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateIdParam,
  validateUsuarioUpdate,
  handleValidationErrors,
  usuarioController.updateUsuario
);

/**
 * @route PUT /api/usuarios/:id/password
 * @desc Cambiar contraseña
 * @access Private (Admin o el mismo usuario)
 */
router.put('/:id/password',
  authenticateToken,
  validateIdParam,
  validatePasswordChange,
  handleValidationErrors,
  usuarioController.cambiarContrasena
);

/**
 * @route PUT /api/usuarios/:id/reset-password
 * @desc Resetear contraseña (generar nueva contraseña aleatoria)
 * @access Private (Solo Admin)
 */
router.put('/:id/reset-password',
  authenticateToken,
  authorizeRoles('admin'),
  validateIdParam,
  handleValidationErrors,
  usuarioController.resetPassword
);

/**
 * @route PUT /api/usuarios/:id/toggle-status
 * @desc Activar/Desactivar usuario
 * @access Private (Solo Admin)
 */
router.put('/:id/toggle-status',
  authenticateToken,
  authorizeRoles('admin'),
  validateIdParam,
  validateStatusToggle,
  handleValidationErrors,
  usuarioController.toggleUsuarioStatus
);

/**
 * @route DELETE /api/usuarios/:id
 * @desc Eliminar usuario
 * @access Private (Solo Admin)
 */
router.delete('/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateIdParam,
  handleValidationErrors,
  usuarioController.deleteUsuario
);

module.exports = router;

// Validaciones para actualizar usuario (sin contraseña obligatoria)
// Validaciones para actualizar usuario (sin contraseña obligatoria)
