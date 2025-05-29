const express = require('express');
const router = express.Router();

const nivelController = require('../controllers/nivelController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { body, query, param } = require('express-validator');

// Validación de ID
const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero positivo')
];

// Validaciones específicas para niveles
const validateNivel = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.I]+$/)
    .withMessage('El nombre solo puede contener letras, espacios, guiones, puntos y números romanos'),
  
  body('descripcion')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('La descripción debe tener entre 5 y 255 caracteres'),
  
  body('orden')
    .isInt({ min: 1, max: 20 })
    .withMessage('El orden debe ser un número entero entre 1 y 20')
];

const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El término de búsqueda debe tener entre 2 y 50 caracteres')
];

const validateReorder = [
  body('ordenData')
    .isArray({ min: 1 })
    .withMessage('ordenData debe ser un array con al menos un elemento'),
  
  body('ordenData.*.id_nivel')
    .isInt({ min: 1 })
    .withMessage('Cada elemento debe tener un id_nivel válido'),
  
  body('ordenData.*.nuevo_orden')
    .isInt({ min: 1 })
    .withMessage('Cada elemento debe tener un nuevo_orden válido')
];

/**
 * @route GET /api/niveles/search
 * @desc Buscar niveles
 * @access Private
 */
router.get('/search',
  authenticateToken,
  validateSearch,
  handleValidationErrors,
  nivelController.searchNiveles
);

/**
 * @route GET /api/niveles/ordenados
 * @desc Obtener niveles ordenados por secuencia
 * @access Private
 */
router.get('/ordenados',
  authenticateToken,
  nivelController.getNivelesOrdenados
);

/**
 * @route PUT /api/niveles/reorder
 * @desc Reordenar niveles
 * @access Private (Solo Admin)
 */
router.put('/reorder',
  authenticateToken,
  authorizeRoles('admin'),
  validateReorder,
  handleValidationErrors,
  nivelController.reorderNiveles
);

/**
 * @route GET /api/niveles/progresion/:idCatequizando
 * @desc Obtener progresión de niveles para un catequizando
 * @access Private (Admin, Párroco, Secretaria, Catequista)
 */
router.get('/progresion/:idCatequizando',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria', 'catequista'),
  [
    param('idCatequizando')
      .isInt({ min: 1 })
      .withMessage('ID del catequizando debe ser un número entero positivo')
  ],
  handleValidationErrors,
  nivelController.getProgresionNiveles
);

/**
 * @route GET /api/niveles
 * @desc Obtener todos los niveles
 * @access Private
 */
router.get('/',
  authenticateToken,
  nivelController.getAllNiveles
);

/**
 * @route GET /api/niveles/:id
 * @desc Obtener nivel por ID
 * @access Private
 */
router.get('/:id',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  nivelController.getNivelById
);

/**
 * @route GET /api/niveles/:id/stats
 * @desc Obtener estadísticas de un nivel
 * @access Private
 */
router.get('/:id/stats',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  nivelController.getNivelStats
);

/**
 * @route POST /api/niveles
 * @desc Crear nuevo nivel
 * @access Private (Solo Admin)
 */
router.post('/',
  authenticateToken,
  authorizeRoles('admin'),
  validateNivel,
  handleValidationErrors,
  nivelController.createNivel
);

/**
 * @route PUT /api/niveles/:id
 * @desc Actualizar nivel
 * @access Private (Solo Admin)
 */
router.put('/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateIdParam,
  validateNivel,
  handleValidationErrors,
  nivelController.updateNivel
);

/**
 * @route DELETE /api/niveles/:id
 * @desc Eliminar nivel
 * @access Private (Solo Admin)
 */
router.delete('/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateIdParam,
  handleValidationErrors,
  nivelController.deleteNivel
);

module.exports = router;