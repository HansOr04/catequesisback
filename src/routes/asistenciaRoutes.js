const express = require('express');
const router = express.Router();

const asistenciaController = require('../controllers/asistenciaController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

// Validación de ID
const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero positivo')
];

const validateIdGrupoParam = [
  param('idGrupo')
    .isInt({ min: 1 })
    .withMessage('ID del grupo debe ser un número entero positivo')
];

const validateIdInscripcionParam = [
  param('idInscripcion')
    .isInt({ min: 1 })
    .withMessage('ID de inscripción debe ser un número entero positivo')
];

// Validaciones para registrar asistencia individual
const validateAsistencia = [
  body('id_inscripcion')
    .isInt({ min: 1 })
    .withMessage('ID de inscripción debe ser un número entero positivo'),
  
  body('fecha')
    .isISO8601()
    .withMessage('La fecha debe tener formato ISO 8601 válido')
    .toDate(),
  
  body('asistio')
    .isBoolean()
    .withMessage('El campo asistio debe ser verdadero o falso')
];

// Validaciones para asistencia masiva
const validateAsistenciaMasiva = [
  body('fecha')
    .isISO8601()
    .withMessage('La fecha debe tener formato ISO 8601 válido')
    .toDate(),
  
  body('asistencias')
    .isArray({ min: 1 })
    .withMessage('Las asistencias deben ser un array con al menos un elemento'),
  
  body('asistencias.*.id_inscripcion')
    .isInt({ min: 1 })
    .withMessage('Cada asistencia debe tener un ID de inscripción válido'),
  
  body('asistencias.*.asistio')
    .isBoolean()
    .withMessage('Cada asistencia debe especificar si asistió o no')
];

// Validación de fecha en parámetros
const validateFechaParam = [
  param('fecha')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('La fecha debe tener formato YYYY-MM-DD')
];

// Validación para actualizar asistencia
const validateUpdateAsistencia = [
  body('asistio')
    .isBoolean()
    .withMessage('El campo asistio debe ser verdadero o falso')
];

// Validaciones para reportes
const validateReporteQuery = [
  query('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('La fecha de inicio debe tener formato ISO 8601 válido'),
  
  query('fecha_fin')
    .optional()
    .isISO8601()
    .withMessage('La fecha de fin debe tener formato ISO 8601 válido'),
  
  query('formato')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('El formato debe ser json o csv')
];

// Validaciones para baja asistencia
const validateBajaAsistenciaQuery = [
  query('porcentaje_minimo')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('El porcentaje mínimo debe ser un número entre 0 y 100'),
  
  query('parroquia')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID de parroquia debe ser un número entero positivo'),
  
  query('grupo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID de grupo debe ser un número entero positivo')
];

/**
 * @route POST /api/asistencias
 * @desc Registrar asistencia individual
 * @access Private (Admin, Párroco, Secretaria, Catequista)
 */
router.post('/',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria', 'catequista'),
  validateAsistencia,
  handleValidationErrors,
  asistenciaController.registrarAsistencia
);

/**
 * @route POST /api/asistencias/grupo/:idGrupo/masiva
 * @desc Registrar asistencia masiva para un grupo
 * @access Private (Admin, Párroco, Secretaria, Catequista)
 */
router.post('/grupo/:idGrupo/masiva',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria', 'catequista'),
  validateIdGrupoParam,
  validateAsistenciaMasiva,
  handleValidationErrors,
  asistenciaController.registrarAsistenciaMasiva
);

/**
 * @route GET /api/asistencias/inscripcion/:idInscripcion
 * @desc Obtener asistencias por inscripción
 * @access Private
 */
router.get('/inscripcion/:idInscripcion',
  authenticateToken,
  validateIdInscripcionParam,
  handleValidationErrors,
  asistenciaController.getAsistenciasByInscripcion
);

/**
 * @route GET /api/asistencias/grupo/:idGrupo/fecha/:fecha
 * @desc Obtener asistencias por grupo y fecha
 * @access Private
 */
router.get('/grupo/:idGrupo/fecha/:fecha',
  authenticateToken,
  validateIdGrupoParam,
  validateFechaParam,
  handleValidationErrors,
  asistenciaController.getAsistenciasByGrupoYFecha
);

/**
 * @route GET /api/asistencias/grupo/:idGrupo/resumen
 * @desc Obtener resumen de asistencias de un grupo
 * @access Private
 */
router.get('/grupo/:idGrupo/resumen',
  authenticateToken,
  validateIdGrupoParam,
  [
    query('fecha_inicio')
      .optional()
      .isISO8601()
      .withMessage('La fecha de inicio debe tener formato ISO 8601 válido'),
    
    query('fecha_fin')
      .optional()
      .isISO8601()
      .withMessage('La fecha de fin debe tener formato ISO 8601 válido')
  ],
  handleValidationErrors,
  asistenciaController.getResumenAsistenciasGrupo
);

/**
 * @route GET /api/asistencias/grupo/:idGrupo/reporte
 * @desc Generar reporte de asistencias
 * @access Private
 */
router.get('/grupo/:idGrupo/reporte',
  authenticateToken,
  validateIdGrupoParam,
  validateReporteQuery,
  handleValidationErrors,
  asistenciaController.generarReporteAsistencias
);

/**
 * @route GET /api/asistencias/grupo/:idGrupo/stats
 * @desc Obtener estadísticas de asistencia por grupo
 * @access Private
 */
router.get('/grupo/:idGrupo/stats',
  authenticateToken,
  validateIdGrupoParam,
  [
    query('periodo')
      .optional()
      .isLength({ min: 4, max: 10 })
      .withMessage('El periodo debe tener entre 4 y 10 caracteres')
  ],
  handleValidationErrors,
  asistenciaController.getStatsAsistenciaGrupo
);

/**
 * @route GET /api/asistencias/grupo/:idGrupo/fechas
 * @desc Obtener fechas con asistencias registradas para un grupo
 * @access Private
 */
router.get('/grupo/:idGrupo/fechas',
  authenticateToken,
  validateIdGrupoParam,
  handleValidationErrors,
  asistenciaController.getFechasAsistenciaGrupo
);

/**
 * @route GET /api/asistencias/baja-asistencia
 * @desc Obtener catequizandos con baja asistencia
 * @access Private
 */
router.get('/baja-asistencia',
  authenticateToken,
  validateBajaAsistenciaQuery,
  handleValidationErrors,
  asistenciaController.getCatequizandosBajaAsistencia
);

/**
 * @route PUT /api/asistencias/:id
 * @desc Actualizar asistencia
 * @access Private (Admin, Párroco, Secretaria, Catequista)
 */
router.put('/:id',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria', 'catequista'),
  validateIdParam,
  validateUpdateAsistencia,
  handleValidationErrors,
  asistenciaController.updateAsistencia
);

/**
 * @route DELETE /api/asistencias/:id
 * @desc Eliminar asistencia
 * @access Private (Admin, Párroco, Secretaria)
 */
router.delete('/:id',
  authenticateToken,
  authorizeRoles('admin', 'parroco', 'secretaria'),
  validateIdParam,
  handleValidationErrors,
  asistenciaController.deleteAsistencia
);

module.exports = router;