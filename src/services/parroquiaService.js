const database = require('../config/database');

class ParroquiaService {
  /**
   * Obtener todas las parroquias
   */
  async getAllParroquias() {
    try {
      const result = await database.executeStoredProcedure('Parroquias.ObtenerTodasParroquias');
      return result.recordset;
    } catch (error) {
      console.error('Error obteniendo parroquias:', error);
      throw new Error('ERROR_FETCHING_PARROQUIAS');
    }
  }

  /**
   * Obtener parroquia por ID
   */
  async getParroquiaById(id) {
    try {
      const result = await database.executeStoredProcedure('Parroquias.ObtenerParroquia', { 
        id_parroquia: id 
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('PARROQUIA_NOT_FOUND');
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo parroquia por ID:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_PARROQUIA');
    }
  }

  // En src/services/parroquiaService.js - función createParroquia
async createParroquia(parroquiaData) {
    try {
      const { nombre, direccion, telefono } = parroquiaData;
      
      const result = await database.executeStoredProcedure('Parroquias.CrearParroquia', {
        nombre,
        direccion,
        telefono
      });
      
      console.log('Resultado del SP:', result);
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('ERROR_CREATING_PARROQUIA');
      }
      
      // Ahora el SP devuelve el registro completo
      return result.recordset[0];
    } catch (error) {
      console.error('Error creando parroquia:', error);
      
      if (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate')) {
        throw new Error('PARROQUIA_ALREADY_EXISTS');
      }
      
      throw new Error('ERROR_CREATING_PARROQUIA');
    }
  }

  /**
   * Actualizar parroquia
   */
  async updateParroquia(id, parroquiaData) {
    try {
      const { nombre, direccion, telefono } = parroquiaData;
      
      // Verificar que la parroquia existe
      await this.getParroquiaById(id);
      
      const result = await database.executeStoredProcedure('Parroquias.ActualizarParroquia', {
        id_parroquia: id,
        nombre,
        direccion,
        telefono
      });
      
      // El SP devuelve un parámetro de salida 'resultado'
      // Por simplicidad, asumimos que se actualizó correctamente
      
      // Obtener la parroquia actualizada
      return await this.getParroquiaById(id);
    } catch (error) {
      console.error('Error actualizando parroquia:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        throw error;
      }
      
      if (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate')) {
        throw new Error('PARROQUIA_ALREADY_EXISTS');
      }
      
      throw new Error('ERROR_UPDATING_PARROQUIA');
    }
  }

  /**
   * Eliminar parroquia
   */
  async deleteParroquia(id) {
    try {
      // Verificar que la parroquia existe
      const parroquia = await this.getParroquiaById(id);
      
      const result = await database.executeStoredProcedure('Parroquias.EliminarParroquia', {
        id_parroquia: id
      });
      
      // El SP devuelve un parámetro de salida 'resultado'
      // Por simplicidad, asumimos que se eliminó correctamente
      
      return parroquia; // Devolver la parroquia eliminada
    } catch (error) {
      console.error('Error eliminando parroquia:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        throw error;
      }
      
      if (error.message.includes('FOREIGN KEY constraint')) {
        throw new Error('PARROQUIA_HAS_DEPENDENCIES');
      }
      
      throw new Error('ERROR_DELETING_PARROQUIA');
    }
  }

  /**
   * Obtener estadísticas de una parroquia
   */
  async getParroquiaStats(id) {
    try {
      // Verificar que la parroquia existe
      await this.getParroquiaById(id);
      
      // Obtener estadísticas básicas
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM Catequesis.Grupo WHERE id_parroquia = @id_parroquia) as total_grupos,
          (SELECT COUNT(DISTINCT i.id_catequizando) 
           FROM Catequesis.Inscripcion i 
           WHERE i.id_parroquia = @id_parroquia) as total_catequizandos,
          (SELECT COUNT(*) FROM Seguridad.Usuario WHERE id_parroquia = @id_parroquia) as total_usuarios
      `;
      
      const result = await database.executeQuery(statsQuery, { id_parroquia: id });
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo estadísticas de parroquia:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_STATS');
    }
  }

  /**
   * Buscar parroquias por nombre
   */
  async searchParroquias(searchTerm) {
    try {
      const searchQuery = `
        SELECT id_parroquia, nombre, direccion, telefono
        FROM Parroquias.Parroquia
        WHERE nombre LIKE @searchTerm
        ORDER BY nombre
      `;
      
      const result = await database.executeQuery(searchQuery, { 
        searchTerm: `%${searchTerm}%` 
      });
      
      return result.recordset;
    } catch (error) {
      console.error('Error buscando parroquias:', error);
      throw new Error('ERROR_SEARCHING_PARROQUIAS');
    }
  }
}

module.exports = new ParroquiaService();