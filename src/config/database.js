const sql = require('mssql');
require('dotenv').config();

const config = {
  server: 'localhost', // Cambiar a localhost
  port: 1433,
  database: 'SistemaCatequesis',
  user: 'AdminCatequesis',
  password: 'P@ssw0rd123Segura!',
  options: {
    encrypt: false, // Muy importante
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000,
    packetSize: 32768,
    useUTC: false
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000
  }
};

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      if (!this.pool) {
        console.log('🔄 Conectando a SQL Server...');
        console.log(`Server: ${config.server}:${config.port}`);
        console.log(`Database: ${config.database}`);
        console.log(`User: ${config.user}`);
        
        this.pool = await sql.connect(config);
        console.log('✅ ¡Conectado a SQL Server exitosamente!');
      }
      return this.pool;
    } catch (error) {
      console.error('❌ Error de conexión:', error.message);
      console.error('❌ Código de error:', error.code);
      throw error;
    }
  }

  async executeStoredProcedure(procedureName, parameters = {}) {
    try {
      const pool = await this.connect();
      const request = pool.request();

      Object.keys(parameters).forEach(key => {
        request.input(key, parameters[key]);
      });

      const result = await request.execute(procedureName);
      return result;
    } catch (error) {
      console.error(`❌ Error ejecutando SP ${procedureName}:`, error);
      throw error;
    }
  }

  // MÉTODO NUEVO: executeQuery para consultas SQL directas
  async executeQuery(query, parameters = {}) {
    try {
      const pool = await this.connect();
      const request = pool.request();

      // Agregar parámetros a la consulta
      Object.keys(parameters).forEach(key => {
        // Detectar el tipo de dato automáticamente
        const value = parameters[key];
        if (typeof value === 'number') {
          if (Number.isInteger(value)) {
            request.input(key, sql.Int, value);
          } else {
            request.input(key, sql.Float, value);
          }
        } else if (typeof value === 'boolean') {
          request.input(key, sql.Bit, value);
        } else if (value instanceof Date) {
          request.input(key, sql.DateTime, value);
        } else {
          request.input(key, sql.NVarChar, value);
        }
      });

      const result = await request.query(query);
      return result;
    } catch (error) {
      console.error(`❌ Error ejecutando query:`, error);
      console.error(`❌ Query: ${query}`);
      console.error(`❌ Parámetros:`, parameters);
      throw error;
    }
  }

  async close() {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        console.log('🔒 Conexión cerrada');
      }
    } catch (error) {
      console.error('❌ Error cerrando conexión:', error);
    }
  }
}

const database = new Database();
module.exports = database;