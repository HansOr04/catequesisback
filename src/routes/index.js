const express = require('express');
const router = express.Router();

// Importar rutas de módulos
const parroquiaRoutes = require('./parroquiaRoutes');
const nivelRoutes = require('./nivelRoutes');
const inscripcionRoutes = require('./inscripcionRoutes');
const asistenciaRoutes = require('./asistenciaRoutes');

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({ 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    modules: ['auth', 'parroquias', 'niveles', 'inscripciones', 'asistencias']
  });
});

// Rutas de módulos
router.use('/parroquias', parroquiaRoutes);
router.use('/niveles', nivelRoutes);
router.use('/inscripciones', inscripcionRoutes);
router.use('/asistencias', asistenciaRoutes);

module.exports = router;