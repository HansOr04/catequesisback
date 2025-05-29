const express = require('express');
const router = express.Router();

// Importar rutas de módulos
const parroquiaRoutes = require('./parroquiaRoutes');
const nivelRoutes = require('./nivelRoutes');

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({ 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    modules: ['auth', 'parroquias', 'niveles']
  });
});

// Rutas de módulos
router.use('/parroquias', parroquiaRoutes);
router.use('/niveles', nivelRoutes);

module.exports = router;