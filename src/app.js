const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const database = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Otras rutas de la API
app.use('/api', routes);

// Ruta de prueba de DB
app.get('/test-db', async (req, res) => {
  try {
    await database.connect();
    res.json({ 
      success: true,
      message: 'Conexión a SQL Server exitosa',
      server: process.env.DB_SERVER,
      database: process.env.DB_DATABASE
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error conectando a SQL Server',
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 Sistema de Catequesis API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      testDb: '/test-db',
      auth: '/api/auth',
      api: '/api'
    }
  });
});

// Middleware de errores
app.use(errorHandler);

app.listen(PORT, () => {
  console.log('🎉 ===============================================');
  console.log('🚀 SISTEMA DE CATEQUESIS API');
  console.log('🎉 ===============================================');
  console.log(`📍 Servidor: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/login`);
  console.log(`🗄️  Test DB: http://localhost:${PORT}/test-db`);
  console.log('🎉 ===============================================');
});

module.exports = app;