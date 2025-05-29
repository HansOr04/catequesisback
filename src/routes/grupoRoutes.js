const express = require('express');
const router = express.Router();

const grupoController = require('../controllers/grupoController');
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

// Validación de ID de nivel
const validateIdNivelParam = [
  param('idNivel')
    .isInt({ min: 1 })
    .withMessage('ID de nivel debe ser un número entero positivo')
];

// Validaciones específicas para grupos
const validateGrupo = [
  body('id_parroquia')
    .isInt({ min: 1 })
    .withMessage('ID de parroquia debe ser un número entero positivo'),
  
  body('id_nivel')
    .isInt({ min: 1 })
    .withMessage('ID de nivel debe ser un número entero positivo'),
  
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.]+$/)
    .withMessage('El nombre solo puede contener letras, números, espacios, guiones y puntos'),
  
  body('periodo')
    .trim()
    .matches(/^\d{4}(-\d{4})?$/)
    .withMessage('El periodo debe tener formato YYYY o YYYY-YYYY (ejemplo: 2024 o 2024-2025)')
];

// Validación para búsqueda
const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El término de búsqueda debe tener entre 2 y 50 caracteres'),
  
  query('parroquia')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de parroquia debe ser un número entero positivo'),
  
  query('nivel')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de nivel debe ser un número entero positivo'),
  
  query('periodo')
    .optional()
    .matches(/^\d{4}(-\d{4})?$/)
    .withMessage('El periodo debe tener formato YYYY o YYYY-YYYY')
];

// Validación para filtros
const validateFilters = [
  query('parroquia')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de parroquia debe ser un número entero positivo'),
  
  query('nivel')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de nivel debe ser un número entero positivo'),
  
  query('periodo')
    .optional()
    .matches(/^\d{4}(-\d{4})?$/)
    .withMessage('El periodo debe tener formato YYYY o YYYY-YYYY'),
  
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
 * @route GET /api/grupos/search
 * @desc Buscar grupos
 * @access Private
 */
router.get('/search',
  authenticateToken,
  validateSearch,
  handleValidationErrors,
  grupoController.searchGrupos
);

/**
 * @route GET /api/grupos/parroquia/:idParroquia
 * @desc Obtener grupos por parroquia
 * @access Private (Admin o usuarios de la misma parroquia)
 */
router.get('/parroquia/:idParroquia',
  authenticateToken,
  validateIdParroquiaParam,
  handleValidationErrors,
  grupoController.getGruposByParroquia
);

/**
 * @route GET /api/grupos/nivel/:idNivel
 * @desc Obtener grupos por nivel
 * @access Private
 */
router.get('/nivel/:idNivel',
  authenticateToken,
  validateIdNivelParam,
  handleValidationErrors,
  grupoController.getGruposByNivel
);

/**
 * @route GET /api/grupos
 * @desc Obtener todos los grupos con filtros y paginación
 * @access Private
 */
router.get('/',
  authenticateToken,
  validateFilters,
  handleValidationErrors,
  grupoController.getAllGrupos
);

/**
 * @route GET /api/grupos/:id
 * @desc Obtener grupo por ID
 * @access Private (Admin o usuarios de la misma parroquia)
 */
router.get('/:id',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  grupoController.getGrupoById
);

/**
 * @route GET /api/grupos/:id/inscripciones
 * @desc Obtener inscripciones de un grupo
 * @access Private (Admin o usuarios de la misma parroquia)
 */
router.get('/:id/inscripciones',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  grupoController.getGrupoInscripciones
);

/**
 * @route GET /api/grupos/:id/catequistas
 * @desc Obtener catequistas de un grupo
 * @access Private (Admin o usuarios de la misma parroquia)
 */
router.get('/:id/catequistas',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  grupoController.getGrupoCatequistas
);

/**
 * @route GET /api/grupos/:id/stats
 * @desc Obtener estadísticas de un grupo
 * @access Private (Admin o usuarios de la misma parroquia)
 */
router.get('/:id/stats',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  grupoController.getGrupoStats
);

/**
 * @route POST /api/grupos
 * @desc Crear nuevo grupo
 * @access Private (Admin, Párroco, Secretaria)
 */
router.post('/',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria'),
  validateGrupo,
  handleValidationErrors,
  grupoController.createGrupo
);

/**
 * @route PUT /api/grupos/:id
 * @desc Actualizar grupo
 * @access Private (Admin, Párroco, Secretaria de la misma parroquia)
 */
router.put('/:id',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria'),
  validateIdParam,
  validateGrupo,
  handleValidationErrors,
  grupoController.updateGrupo
);

/**
 * @route DELETE /api/grupos/:id
 * @desc Eliminar grupo
 * @access Private (Admin, Párroco de la misma parroquia)
 */
router.delete('/:id',
  authenticateToken,
  authorizeRoles('admin', 'parroco'),
  validateIdParam,
  handleValidationErrors,
  grupoController.deleteGrupo
);

module.exports = router;