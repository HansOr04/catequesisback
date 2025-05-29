const express = require('express');
const router = express.Router();

const inscripcionController = require('../controllers/inscripcionController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { body, query, param } = require('express-validator');

// Validación de ID
const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero positivo')
];

// Validación de ID de catequizando
const validateIdCatequizandoParam = [
  param('idCatequizando')
    .isInt({ min: 1 })
    .withMessage('ID de catequizando debe ser un número entero positivo')
];

// Validación de ID de grupo
const validateIdGrupoParam = [
  param('idGrupo')
    .isInt({ min: 1 })
    .withMessage('ID de grupo debe ser un número entero positivo')
];

// Validaciones específicas para inscripciones
const validateInscripcion = [
  body('id_catequizando')
    .isInt({ min: 1 })
    .withMessage('ID de catequizando debe ser un número entero positivo'),
  
  body('id_grupo')
    .isInt({ min: 1 })
    .withMessage('ID de grupo debe ser un número entero positivo'),
  
  body('id_parroquia')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de parroquia debe ser un número entero positivo'),
  
  body('fecha_inscripcion')
    .optional()
    .isISO8601()
    .withMessage('La fecha de inscripción debe ser válida (YYYY-MM-DD)'),
  
  body('pago_realizado')
    .optional()
    .isBoolean()
    .withMessage('Pago realizado debe ser verdadero o falso')
];

// Validación para inscribir con validaciones
const validateInscribirCatequizando = [
  body('id_catequizando')
    .isInt({ min: 1 })
    .withMessage('ID de catequizando debe ser un número entero positivo'),
  
  body('id_grupo')
    .isInt({ min: 1 })
    .withMessage('ID de grupo debe ser un número entero positivo'),
  
  body('validar_requisitos')
    .optional()
    .isBoolean()
    .withMessage('Validar requisitos debe ser verdadero o falso'),
  
  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Las observaciones no pueden exceder 500 caracteres')
];

// Validación para actualizar pago
const validateUpdatePago = [
  body('pago_realizado')
    .isBoolean()
    .withMessage('Pago realizado debe ser verdadero o falso')
];

// Validación para búsqueda
const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El término de búsqueda debe tener entre 2 y 50 caracteres'),
  
  query('grupo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de grupo debe ser un número entero positivo'),
  
  query('periodo')
    .optional()
    .matches(/^\d{4}(-\d{4})?$/)
    .withMessage('El periodo debe tener formato YYYY o YYYY-YYYY'),
  
  query('pago')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('El estado de pago debe ser true o false')
];

// Validación para filtros
const validateFilters = [
  query('parroquia')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de parroquia debe ser un número entero positivo'),
  
  query('grupo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de grupo debe ser un número entero positivo'),
  
  query('catequizando')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de catequizando debe ser un número entero positivo'),
  
  query('periodo')
    .optional()
    .matches(/^\d{4}(-\d{4})?$/)
    .withMessage('El periodo debe tener formato YYYY o YYYY-YYYY'),
  
  query('pago')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('El estado de pago debe ser true o false'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número mayor a 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('El límite debe ser un número entre 1 y 50')
];

/**
 * @route GET /api/inscripciones/search
 * @desc Buscar inscripciones
 * @access Private
 */
router.get('/search',
  authenticateToken,
  validateSearch,
  handleValidationErrors,
  inscripcionController.searchInscripciones
);

/**
 * @route GET /api/inscripciones/stats
 * @desc Obtener estadísticas de inscripciones
 * @access Private
 */
router.get('/stats',
  authenticateToken,
  inscripcionController.getInscripcionesStats
);

/**
 * @route GET /api/inscripciones/pendientes-pago
 * @desc Obtener inscripciones pendientes de pago
 * @access Private (Admin, Párroco, Secretaria)
 */
router.get('/pendientes-pago',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria'),
  inscripcionController.getInscripcionesPendientesPago
);

/**
 * @route GET /api/inscripciones/catequizando/:idCatequizando
 * @desc Obtener inscripciones por catequizando
 * @access Private
 */
router.get('/catequizando/:idCatequizando',
  authenticateToken,
  validateIdCatequizandoParam,
  handleValidationErrors,
  inscripcionController.getInscripcionesByIdCatequizando
);

/**
 * @route GET /api/inscripciones/grupo/:idGrupo
 * @desc Obtener inscripciones por grupo
 * @access Private (Admin o usuarios de la misma parroquia)
 */
router.get('/grupo/:idGrupo',
  authenticateToken,
  validateIdGrupoParam,
  handleValidationErrors,
  inscripcionController.getInscripcionesByIdGrupo
);

/**
 * @route GET /api/inscripciones
 * @desc Obtener todas las inscripciones con filtros y paginación
 * @access Private
 */
router.get('/',
  authenticateToken,
  validateFilters,
  handleValidationErrors,
  inscripcionController.getAllInscripciones
);

/**
 * @route GET /api/inscripciones/:id
 * @desc Obtener inscripción por ID
 * @access Private (Admin o usuarios de la misma parroquia)
 */
router.get('/:id',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  inscripcionController.getInscripcionById
);

/**
 * @route POST /api/inscripciones
 * @desc Crear nueva inscripción
 * @access Private (Admin, Párroco, Secretaria)
 */
router.post('/',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria'),
  validateInscripcion,
  handleValidationErrors,
  inscripcionController.createInscripcion
);

/**
 * @route POST /api/inscripciones/inscribir
 * @desc Inscribir catequizando con validaciones completas
 * @access Private (Admin, Párroco, Secretaria)
 */
router.post('/inscribir',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria'),
  validateInscribirCatequizando,
  handleValidationErrors,
  inscripcionController.inscribirCatequizando
);

/**
 * @route PUT /api/inscripciones/:id
 * @desc Actualizar inscripción
 * @access Private (Admin, Párroco, Secretaria de la misma parroquia)
 */
router.put('/:id',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria'),
  validateIdParam,
  validateInscripcion,
  handleValidationErrors,
  inscripcionController.updateInscripcion
);

/**
 * @route PUT /api/inscripciones/:id/pago
 * @desc Actualizar estado de pago de inscripción
 * @access Private (Admin, Párroco, Secretaria de la misma parroquia)
 */
router.put('/:id/pago',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria'),
  validateIdParam,
  validateUpdatePago,
  handleValidationErrors,
  inscripcionController.updatePagoInscripcion
);

/**
 * @route DELETE /api/inscripciones/:id
 * @desc Eliminar inscripción
 * @access Private (Admin, Párroco de la misma parroquia)
 */
router.delete('/:id',
  authenticateToken,
  authorizeRoles('admin', 'parroco'),
  validateIdParam,
  handleValidationErrors,
  inscripcionController.deleteInscripcion
);

module.exports = router;