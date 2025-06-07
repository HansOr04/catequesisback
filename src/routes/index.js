const express = require('express');
const router = express.Router();

// Importar rutas de módulos
const parroquiaRoutes = require('./parroquiaRoutes');
const nivelRoutes = require('./nivelRoutes');
const catequizandoRoutes = require('./catequizandoRoutes');
const grupoRoutes = require('./grupoRoutes');
const inscripcionRoutes = require('./inscripcionRoutes');
const asistenciaRoutes = require('./asistenciaRoutes');
const usuarioRoutes = require('./usuarioRoutes');

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({ 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    modules: [
      'auth', 
      'parroquias', 
      'niveles', 
      'catequizandos',
      'grupos',
      'inscripciones', 
      'asistencias',
      'usuarios'
    ],
    endpoints: {
      test: '/api/test',
      auth: '/api/auth',
      parroquias: '/api/parroquias',
      niveles: '/api/niveles',
      catequizandos: '/api/catequizandos',
      grupos: '/api/grupos',
      inscripciones: '/api/inscripciones',
      asistencias: '/api/asistencias',
      usuarios: '/api/usuarios'
    }
  });
});

// Rutas de módulos
router.use('/parroquias', parroquiaRoutes);
router.use('/niveles', nivelRoutes);
router.use('/catequizandos', catequizandoRoutes);
router.use('/grupos', grupoRoutes);
router.use('/inscripciones', inscripcionRoutes);
router.use('/asistencias', asistenciaRoutes);
router.use('/usuarios', usuarioRoutes);

// Ruta para obtener información general de la API
router.get('/', (req, res) => {
  res.json({
    message: 'Sistema de Catequesis API',
    version: '1.0.0',
    documentation: {
      baseUrl: '/api',
      endpoints: {
        auth: {
          login: 'POST /api/auth/login',
          profile: 'GET /api/auth/profile'
        },
        parroquias: {
          getAll: 'GET /api/parroquias',
          getById: 'GET /api/parroquias/:id',
          create: 'POST /api/parroquias',
          update: 'PUT /api/parroquias/:id',
          delete: 'DELETE /api/parroquias/:id',
          search: 'GET /api/parroquias/search?q=termino',
          stats: 'GET /api/parroquias/:id/stats'
        },
        niveles: {
          getAll: 'GET /api/niveles',
          getOrdered: 'GET /api/niveles/ordenados',
          getById: 'GET /api/niveles/:id',
          create: 'POST /api/niveles',
          update: 'PUT /api/niveles/:id',
          delete: 'DELETE /api/niveles/:id',
          search: 'GET /api/niveles/search?q=termino',
          reorder: 'PUT /api/niveles/reorder',
          stats: 'GET /api/niveles/:id/stats'
        },
        catequizandos: {
          getAll: 'GET /api/catequizandos',
          getById: 'GET /api/catequizandos/:id',
          getByDocument: 'GET /api/catequizandos/documento/:documento',
          create: 'POST /api/catequizandos',
          update: 'PUT /api/catequizandos/:id',
          delete: 'DELETE /api/catequizandos/:id',
          search: 'GET /api/catequizandos/search?q=termino',
          stats: 'GET /api/catequizandos/stats',
          inscripciones: 'GET /api/catequizandos/:id/inscripciones',
          certificados: 'GET /api/catequizandos/:id/certificados',
          sacramentos: 'GET /api/catequizandos/:id/sacramentos',
          representantes: 'GET /api/catequizandos/:id/representantes',
          padrinos: 'GET /api/catequizandos/:id/padrinos',
          bautismo: 'GET /api/catequizandos/:id/bautismo',
          validarInscripcion: 'POST /api/catequizandos/:id/validar-inscripcion'
        },
        grupos: {
          getAll: 'GET /api/grupos',
          getById: 'GET /api/grupos/:id',
          getByParroquia: 'GET /api/grupos/parroquia/:idParroquia',
          getByNivel: 'GET /api/grupos/nivel/:idNivel',
          create: 'POST /api/grupos',
          update: 'PUT /api/grupos/:id',
          delete: 'DELETE /api/grupos/:id',
          search: 'GET /api/grupos/search?q=termino',
          inscripciones: 'GET /api/grupos/:id/inscripciones',
          catequistas: 'GET /api/grupos/:id/catequistas',
          stats: 'GET /api/grupos/:id/stats'
        },
        inscripciones: {
          getAll: 'GET /api/inscripciones',
          getById: 'GET /api/inscripciones/:id',
          getByCatequizando: 'GET /api/inscripciones/catequizando/:idCatequizando',
          getByGrupo: 'GET /api/inscripciones/grupo/:idGrupo',
          create: 'POST /api/inscripciones',
          inscribir: 'POST /api/inscripciones/inscribir',
          update: 'PUT /api/inscripciones/:id',
          updatePago: 'PUT /api/inscripciones/:id/pago',
          delete: 'DELETE /api/inscripciones/:id',
          search: 'GET /api/inscripciones/search?q=termino',
          stats: 'GET /api/inscripciones/stats',
          pendientesPago: 'GET /api/inscripciones/pendientes-pago'
        },
        asistencias: {
          registrarIndividual: 'POST /api/asistencias',
          registrarMasiva: 'POST /api/asistencias/grupo/:idGrupo/masiva',
          getByInscripcion: 'GET /api/asistencias/inscripcion/:idInscripcion',
          getByGrupoFecha: 'GET /api/asistencias/grupo/:idGrupo/fecha/:fecha',
          getResumen: 'GET /api/asistencias/grupo/:idGrupo/resumen',
          getReporte: 'GET /api/asistencias/grupo/:idGrupo/reporte',
          getStats: 'GET /api/asistencias/grupo/:idGrupo/stats',
          getFechas: 'GET /api/asistencias/grupo/:idGrupo/fechas',
          getBajaAsistencia: 'GET /api/asistencias/baja-asistencia',
          update: 'PUT /api/asistencias/:id',
          delete: 'DELETE /api/asistencias/:id'
        },
        usuarios: {
          getAll: 'GET /api/usuarios',
          getById: 'GET /api/usuarios/:id',
          getByParroquia: 'GET /api/usuarios/parroquia/:idParroquia',
          create: 'POST /api/usuarios',
          update: 'PUT /api/usuarios/:id',
          delete: 'DELETE /api/usuarios/:id',
          search: 'GET /api/usuarios/search?q=termino',
          stats: 'GET /api/usuarios/stats',
          changePassword: 'PUT /api/usuarios/:id/password',
          resetPassword: 'PUT /api/usuarios/:id/reset-password',
          toggleStatus: 'PUT /api/usuarios/:id/toggle-status'
        }
      }
    },
    authentication: {
      required: true,
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      loginEndpoint: 'POST /api/auth/login'
    }
  });
});

module.exports = router;