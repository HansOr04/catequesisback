const express = require('express');
const router = express.Router();

const catequizandoController = require('../controllers/catequizandoController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { body, query, param } = require('express-validator');

// Validación de ID
const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero positivo')
];

// Validación de documento
const validateDocumentoParam = [
  param('documento')
    .trim()
    .isLength({ min: 6, max: 20 })
    .withMessage('El documento debe tener entre 6 y 20 caracteres')
    .matches(/^[a-zA-Z0-9\-]+$/)
    .withMessage('El documento solo puede contener letras, números y guiones')
];

// Validaciones específicas para catequizandos
const validateCatequizando = [
  body('nombres')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Los nombres deben tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('Los nombres solo pueden contener letras y espacios'),
  
  body('apellidos')
    .trim()
    .isLength({ min: 2, max: 100 })  
    .withMessage('Los apellidos deben tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('Los apellidos solo pueden contener letras y espacios'),
  
  body('fecha_nacimiento')
    .isISO8601()
    .withMessage('La fecha de nacimiento debe ser válida (YYYY-MM-DD)')
    .custom((value) => {
      const fecha = new Date(value);
      const hoy = new Date();
      const hace100Anos = new Date();
      hace100Anos.setFullYear(hoy.getFullYear() - 100);
      
      if (fecha >= hoy) {
        throw new Error('La fecha de nacimiento no puede ser futura');
      }
      
      if (fecha < hace100Anos) {
        throw new Error('La fecha de nacimiento no puede ser hace más de 100 años');
      }
      
      return true;
    }),
  
  body('documento_identidad')
    .trim()
    .isLength({ min: 6, max: 20 })
    .withMessage('El documento de identidad debe tener entre 6 y 20 caracteres')
    .matches(/^[a-zA-Z0-9\-]+$/)
    .withMessage('El documento solo puede contener letras, números y guiones'),
  
  body('caso_especial')
    .optional()
    .isBoolean()
    .withMessage('Caso especial debe ser verdadero o falso')
];

// Validación para búsqueda
const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El término de búsqueda debe tener entre 2 y 50 caracteres'),
  
  query('tipo')
    .optional()
    .isIn(['todos', 'activos', 'sin_inscripcion', 'casos_especiales'])
    .withMessage('El tipo debe ser: todos, activos, sin_inscripcion o casos_especiales')
];

// Validación para paginación
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número mayor a 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('El límite debe ser un número entre 1 y 50'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El término de búsqueda no puede exceder 50 caracteres')
];

// Validación para validar inscripción
const validateInscripcionValidation = [
  body('id_nivel')
    .isInt({ min: 1 })
    .withMessage('El ID del nivel debe ser un número entero positivo')
];

/**
 * @route GET /api/catequizandos/search
 * @desc Buscar catequizandos
 * @access Private
 */
router.get('/search',
  authenticateToken,
  validateSearch,
  handleValidationErrors,
  catequizandoController.searchCatequizandos
);

/**
 * @route GET /api/catequizandos/stats
 * @desc Obtener estadísticas de catequizandos
 * @access Private
 */
router.get('/stats',
  authenticateToken,
  catequizandoController.getCatequizandosStats
);

/**
 * @route GET /api/catequizandos/documento/:documento
 * @desc Buscar catequizando por documento de identidad
 * @access Private
 */
router.get('/documento/:documento',
  authenticateToken,
  validateDocumentoParam,
  handleValidationErrors,
  catequizandoController.getCatequizandoByDocumento
);

/**
 * @route GET /api/catequizandos
 * @desc Obtener todos los catequizandos con paginación
 * @access Private
 */
router.get('/',
  authenticateToken,
  validatePagination,
  handleValidationErrors,
  catequizandoController.getAllCatequizandos
);

/**
 * @route GET /api/catequizandos/:id
 * @desc Obtener catequizando por ID
 * @access Private
 */
router.get('/:id',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  catequizandoController.getCatequizandoById
);

/**
 * @route GET /api/catequizandos/:id/inscripciones
 * @desc Obtener historial de inscripciones de un catequizando
 * @access Private
 */
router.get('/:id/inscripciones',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  catequizandoController.getCatequizandoInscripciones
);

/**
 * @route GET /api/catequizandos/:id/certificados
 * @desc Obtener certificados de un catequizando
 * @access Private
 */
router.get('/:id/certificados',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  catequizandoController.getCatequizandoCertificados
);

/**
 * @route GET /api/catequizandos/:id/sacramentos
 * @desc Obtener sacramentos recibidos por un catequizando
 * @access Private
 */
router.get('/:id/sacramentos',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  catequizandoController.getCatequizandoSacramentos
);

/**
 * @route GET /api/catequizandos/:id/representantes
 * @desc Obtener representantes de un catequizando
 * @access Private
 */
router.get('/:id/representantes',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  catequizandoController.getCatequizandoRepresentantes
);

/**
 * @route GET /api/catequizandos/:id/padrinos
 * @desc Obtener padrinos de un catequizando
 * @access Private
 */
router.get('/:id/padrinos',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  catequizandoController.getCatequizandoPadrinos
);

/**
 * @route GET /api/catequizandos/:id/bautismo
 * @desc Obtener datos de bautismo de un catequizando
 * @access Private
 */
router.get('/:id/bautismo',
  authenticateToken,
  validateIdParam,
  handleValidationErrors,
  catequizandoController.getCatequizandoBautismo
);

/**
 * @route POST /api/catequizandos
 * @desc Crear nuevo catequizando
 * @access Private (Admin, Párroco, Secretaria)
 */
router.post('/',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria'),
  validateCatequizando,
  handleValidationErrors,
  catequizandoController.createCatequizando
);

/**
 * @route POST /api/catequizandos/:id/validar-inscripcion
 * @desc Validar elegibilidad para inscripción
 * @access Private (Admin, Párroco, Secretaria)
 */
router.post('/:id/validar-inscripcion',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria'),
  validateIdParam,
  validateInscripcionValidation,
  handleValidationErrors,
  catequizandoController.validarInscripcion
);

/**
 * @route PUT /api/catequizandos/:id
 * @desc Actualizar catequizando
 * @access Private (Admin, Párroco, Secretaria)
 */
router.put('/:id',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria'),
  validateIdParam,
  validateCatequizando,
  handleValidationErrors,
  catequizandoController.updateCatequizando
);

/**
 * @route DELETE /api/catequizandos/:id
 * @desc Eliminar catequizando
 * @access Private (Solo Admin)
 */
router.delete('/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateIdParam,
  handleValidationErrors,
  catequizandoController.deleteCatequizando
);

module.exports = router;