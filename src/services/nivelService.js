const database = require('../config/database');

class NivelService {
  /**
   * Obtener todos los niveles
   */
  async getAllNiveles() {
    try {
      const result = await database.executeStoredProcedure('Catequesis.ObtenerTodosNiveles');
      return result.recordset;
    } catch (error) {
      console.error('Error obteniendo niveles:', error);
      throw new Error('ERROR_FETCHING_NIVELES');
    }
  }

  /**
   * Obtener nivel por ID
   */
  async getNivelById(id) {
    try {
      const result = await database.executeStoredProcedure('Catequesis.ObtenerNivel', { 
        id_nivel: id 
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('NIVEL_NOT_FOUND');
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo nivel por ID:', error);
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_NIVEL');
    }
  }

  /**
   * Crear nuevo nivel
   */
  async createNivel(nivelData) {
    try {
      const { nombre, descripcion, orden } = nivelData;
      
      // Verificar que no exista un nivel con el mismo orden
      await this.validateOrdenUnico(orden);
      
      const result = await database.executeStoredProcedure('Catequesis.CrearNivel', {
        nombre,
        descripcion,
        orden
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('ERROR_CREATING_NIVEL');
      }
      
      // El SP devuelve el registro completo
      return result.recordset[0];
    } catch (error) {
      console.error('Error creando nivel:', error);
      
      if (error.message === 'ORDEN_ALREADY_EXISTS') {
        throw error;
      }
      
      if (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate')) {
        throw new Error('NIVEL_ALREADY_EXISTS');
      }
      
      throw new Error('ERROR_CREATING_NIVEL');
    }
  }

  /**
   * Actualizar nivel
   */
  async updateNivel(id, nivelData) {
    try {
      const { nombre, descripcion, orden } = nivelData;
      
      // Verificar que el nivel existe
      await this.getNivelById(id);
      
      // Verificar que no exista otro nivel con el mismo orden
      await this.validateOrdenUnico(orden, id);
      
      const result = await database.executeStoredProcedure('Catequesis.ActualizarNivel', {
        id_nivel: id,
        nombre,
        descripcion,
        orden
      });
      
      // Obtener el nivel actualizado
      return await this.getNivelById(id);
    } catch (error) {
      console.error('Error actualizando nivel:', error);
      
      if (error.message === 'NIVEL_NOT_FOUND' || error.message === 'ORDEN_ALREADY_EXISTS') {
        throw error;
      }
      
      if (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate')) {
        throw new Error('NIVEL_ALREADY_EXISTS');
      }
      
      throw new Error('ERROR_UPDATING_NIVEL');
    }
  }

  /**
   * Eliminar nivel
   */
  async deleteNivel(id) {
    try {
      // Verificar que el nivel existe
      const nivel = await this.getNivelById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.EliminarNivel', {
        id_nivel: id
      });
      
      return nivel; // Devolver el nivel eliminado
    } catch (error) {
      console.error('Error eliminando nivel:', error);
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        throw error;
      }
      
      if (error.message.includes('FOREIGN KEY constraint')) {
        throw new Error('NIVEL_HAS_DEPENDENCIES');
      }
      
      throw new Error('ERROR_DELETING_NIVEL');
    }
  }

  /**
   * Obtener niveles ordenados por secuencia
   */
  async getNivelesOrdenados() {
    try {
      const result = await database.executeQuery(`
        SELECT id_nivel, nombre, descripcion, orden,
               LAG(nombre) OVER (ORDER BY orden) as nivel_anterior,
               LEAD(nombre) OVER (ORDER BY orden) as nivel_siguiente
        FROM Catequesis.Nivel
        ORDER BY orden
      `);
      
      return result.recordset;
    } catch (error) {
      console.error('Error obteniendo niveles ordenados:', error);
      throw new Error('ERROR_FETCHING_NIVELES_ORDENADOS');
    }
  }

  /**
   * Obtener estadísticas de un nivel
   */
  async getNivelStats(id) {
    try {
      // Verificar que el nivel existe
      await this.getNivelById(id);
      
      // Obtener estadísticas
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM Catequesis.Grupo WHERE id_nivel = @id_nivel) as total_grupos,
          (SELECT COUNT(DISTINCT i.id_catequizando) 
           FROM Catequesis.Inscripcion i 
           INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo
           WHERE g.id_nivel = @id_nivel) as total_catequizandos,
          (SELECT COUNT(*) FROM Catequesis.Certificado WHERE id_nivel = @id_nivel AND aprobado = 1) as total_aprobados,
          (SELECT COUNT(*) FROM Catequesis.Sacramento WHERE requisito_nivel = @id_nivel) as sacramentos_asociados
      `;
      
      const result = await database.executeQuery(statsQuery, { id_nivel: id });
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo estadísticas de nivel:', error);
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_STATS');
    }
  }

  /**
   * Reordenar niveles
   */
  async reorderNiveles(ordenData) {
    try {
      // ordenData es un array de { id_nivel, nuevo_orden }
      
      for (const item of ordenData) {
        await database.executeQuery(`
          UPDATE Catequesis.Nivel 
          SET orden = @nuevo_orden 
          WHERE id_nivel = @id_nivel
        `, {
          id_nivel: item.id_nivel,
          nuevo_orden: item.nuevo_orden
        });
      }
      
      // Devolver niveles reordenados
      return await this.getNivelesOrdenados();
    } catch (error) {
      console.error('Error reordenando niveles:', error);
      throw new Error('ERROR_REORDERING_NIVELES');
    }
  }

  /**
   * Validar que el orden sea único
   */
  async validateOrdenUnico(orden, excludeId = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM Catequesis.Nivel WHERE orden = @orden';
      let params = { orden };
      
      if (excludeId) {
        query += ' AND id_nivel != @excludeId';
        params.excludeId = excludeId;
      }
      
      const result = await database.executeQuery(query, params);
      
      if (result.recordset[0].count > 0) {
        throw new Error('ORDEN_ALREADY_EXISTS');
      }
      
      return true;
    } catch (error) {
      if (error.message === 'ORDEN_ALREADY_EXISTS') {
        throw error;
      }
      
      console.error('Error validando orden único:', error);
      throw new Error('ERROR_VALIDATING_ORDEN');
    }
  }

  /**
   * Buscar niveles por nombre
   */
  async searchNiveles(searchTerm) {
    try {
      const searchQuery = `
        SELECT id_nivel, nombre, descripcion, orden
        FROM Catequesis.Nivel
        WHERE nombre LIKE @searchTerm OR descripcion LIKE @searchTerm
        ORDER BY orden
      `;
      
      const result = await database.executeQuery(searchQuery, { 
        searchTerm: `%${searchTerm}%` 
      });
      
      return result.recordset;
    } catch (error) {
      console.error('Error buscando niveles:', error);
      throw new Error('ERROR_SEARCHING_NIVELES');
    }
  }

  /**
   * Obtener progresión de niveles para un catequizando
   */
  async getProgresionNiveles(idCatequizando) {
    try {
      const progresionQuery = `
        SELECT 
          n.id_nivel,
          n.nombre,
          n.descripcion,
          n.orden,
          CASE 
            WHEN cert.id_certificado IS NOT NULL AND cert.aprobado = 1 THEN 'COMPLETADO'
            WHEN i.id_inscripcion IS NOT NULL THEN 'EN_CURSO'
            ELSE 'PENDIENTE'
          END as estado,
          cert.fecha_emision as fecha_completado,
          i.fecha_inscripcion
        FROM Catequesis.Nivel n
        LEFT JOIN Catequesis.Grupo g ON n.id_nivel = g.id_nivel
        LEFT JOIN Catequesis.Inscripcion i ON g.id_grupo = i.id_grupo AND i.id_catequizando = @id_catequizando
        LEFT JOIN Catequesis.Certificado cert ON n.id_nivel = cert.id_nivel AND cert.id_catequizando = @id_catequizando
        ORDER BY n.orden
      `;
      
      const result = await database.executeQuery(progresionQuery, { 
        id_catequizando: idCatequizando 
      });
      
      return result.recordset;
    } catch (error) {
      console.error('Error obteniendo progresión de niveles:', error);
      throw new Error('ERROR_FETCHING_PROGRESION');
    }
  }
}

module.exports = new NivelService();