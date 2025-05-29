const express = require('express');
const router = express.Router();

const parroquiaController = require('../controllers/parroquiaController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateId, handleValidationErrors } = require('../middleware/validation');
const { body, query } = require('express-validator');

// Validaciones específicas para parroquias
const validateParroquia = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.]+$/)
    .withMessage('El nombre solo puede contener letras, espacios, guiones y puntos'),
  
  body('direccion')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('La dirección debe tener entre 5 y 255 caracteres'),
  
  body('telefono')
    .trim()
    .matches(/^[\d\-\s\+\(\)]+$/)
    .withMessage('Formato de teléfono inválido')
    .isLength({ min: 7, max: 20 })
    .withMessage('El teléfono debe tener entre 7 y 20 caracteres')
];

const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El término de búsqueda debe tener entre 2 y 50 caracteres')
];

/**
 * @route GET /api/parroquias/search
 * @desc Buscar parroquias
 * @access Private
 */
router.get('/search',
  authenticateToken,
  validateSearch,
  handleValidationErrors,
  parroquiaController.searchParroquias
);

/**
 * @route GET /api/parroquias
 * @desc Obtener todas las parroquias
 * @access Private
 */
router.get('/',
  authenticateToken,
  parroquiaController.getAllParroquias
);

/**
 * @route GET /api/parroquias/:id
 * @desc Obtener parroquia por ID
 * @access Private
 */
router.get('/:id',
  authenticateToken,
  validateId('id'),
  handleValidationErrors,
  parroquiaController.getParroquiaById
);

/**
 * @route GET /api/parroquias/:id/stats
 * @desc Obtener estadísticas de una parroquia
 * @access Private (Admin o Párroco de la parroquia)
 */
router.get('/:id/stats',
  authenticateToken,
  authorizeRoles('admin', 'parroco'),
  validateId('id'),
  handleValidationErrors,
  parroquiaController.getParroquiaStats
);

/**
 * @route POST /api/parroquias
 * @desc Crear nueva parroquia
 * @access Private (Admin y Párroco)
 */
router.post('/',
  authenticateToken,
  authorizeRoles('admin', 'parroco'),
  validateParroquia,
  handleValidationErrors,
  parroquiaController.createParroquia
);

/**
 * @route PUT /api/parroquias/:id
 * @desc Actualizar parroquia
 * @access Private (Admin o Párroco de la parroquia)
 */
router.put('/:id',
  authenticateToken,
  authorizeRoles('admin', 'parroco'),
  validateId('id'),
  validateParroquia,
  handleValidationErrors,
  parroquiaController.updateParroquia
);

/**
 * @route DELETE /api/parroquias/:id
 * @desc Eliminar parroquia
 * @access Private (Solo Admin)
 */
router.delete('/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateId('id'),
  handleValidationErrors,
  parroquiaController.deleteParroquia
);

module.exports = router;