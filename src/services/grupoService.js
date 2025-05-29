const database = require('../config/database');

class GrupoService {
  /**
   * Obtener todos los grupos con filtros y paginación
   */
  async getAllGrupos(filtros = {}) {
    try {
      const { page = 1, limit = 10, id_parroquia, id_nivel, periodo } = filtros;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          g.id_grupo, 
          g.id_parroquia, 
          g.id_nivel, 
          g.nombre, 
          g.periodo,
          p.nombre AS nombre_parroquia,
          n.nombre AS nombre_nivel,
          n.orden AS orden_nivel,
          (SELECT COUNT(*) FROM Catequesis.Inscripcion i WHERE i.id_grupo = g.id_grupo) AS total_inscripciones
        FROM Catequesis.Grupo g
        INNER JOIN Parroquias.Parroquia p ON g.id_parroquia = p.id_parroquia
        INNER JOIN Catequesis.Nivel n ON g.id_nivel = n.id_nivel
        WHERE 1=1
      `;
      
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM Catequesis.Grupo g
        WHERE 1=1
      `;
      
      let params = {};
      let whereConditions = [];
      
      if (id_parroquia) {
        whereConditions.push('g.id_parroquia = @id_parroquia');
        params.id_parroquia = id_parroquia;
      }
      
      if (id_nivel) {
        whereConditions.push('g.id_nivel = @id_nivel');
        params.id_nivel = id_nivel;
      }
      
      if (periodo) {
        whereConditions.push('g.periodo = @periodo');
        params.periodo = periodo;
      }
      
      if (whereConditions.length > 0) {
        const whereClause = ' AND ' + whereConditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }
      
      query += ` ORDER BY g.periodo DESC, p.nombre, n.orden, g.nombre
                 OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
      
      params.offset = offset;
      params.limit = limit;
      
      const [grupos, total] = await Promise.all([
        database.executeQuery(query, params),
        database.executeQuery(countQuery, params)
      ]);
      
      return {
        grupos: grupos.recordset || [],
        pagination: {
          current_page: page,
          per_page: limit,
          total: total.recordset[0]?.total || 0,
          total_pages: Math.ceil((total.recordset[0]?.total || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Error obteniendo grupos:', error);
      throw new Error('ERROR_FETCHING_GRUPOS');
    }
  }

  /**
   * Obtener grupo por ID
   */
  async getGrupoById(id) {
    try {
      const result = await database.executeStoredProcedure('Catequesis.ObtenerGrupo', { 
        id_grupo: id 
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('GRUPO_NOT_FOUND');
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo grupo por ID:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_GRUPO');
    }
  }

  /**
   * Crear nuevo grupo
   */
  async createGrupo(grupoData) {
    try {
      const { id_parroquia, id_nivel, nombre, periodo } = grupoData;
      
      // Validaciones básicas
      await this.validateGrupoData({ id_parroquia, id_nivel, nombre, periodo });
      
      const result = await database.executeStoredProcedure('Catequesis.CrearGrupo', {
        id_parroquia,
        id_nivel,
        nombre: nombre.trim(),
        periodo: periodo.trim()
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('ERROR_CREATING_GRUPO');
      }
      
      // Obtener el grupo completo creado
      const grupoId = result.recordset[0].id_grupo;
      return await this.getGrupoById(grupoId);
    } catch (error) {
      console.error('Error creando grupo:', error);
      
      if (error.message.includes('mismo nombre en esta parroquia y periodo')) {
        throw new Error('GRUPO_ALREADY_EXISTS');
      }
      
      if (error.message.includes('parroquia especificada no existe')) {
        throw new Error('PARROQUIA_NOT_FOUND');
      }
      
      if (error.message.includes('nivel especificado no existe')) {
        throw new Error('NIVEL_NOT_FOUND');
      }
      
      throw new Error('ERROR_CREATING_GRUPO');
    }
  }

  /**
   * Actualizar grupo
   */
  async updateGrupo(id, grupoData) {
    try {
      const { id_parroquia, id_nivel, nombre, periodo } = grupoData;
      
      // Verificar que el grupo existe
      await this.getGrupoById(id);
      
      // Validaciones básicas
      await this.validateGrupoData({ id_parroquia, id_nivel, nombre, periodo }, id);
      
      const result = await database.executeStoredProcedure('Catequesis.ActualizarGrupo', {
        id_grupo: id,
        id_parroquia,
        id_nivel,
        nombre: nombre.trim(),
        periodo: periodo.trim()
      });
      
      // Obtener el grupo actualizado
      return await this.getGrupoById(id);
    } catch (error) {
      console.error('Error actualizando grupo:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        throw error;
      }
      
      if (error.message.includes('mismo nombre en esta parroquia y periodo')) {
        throw new Error('GRUPO_ALREADY_EXISTS');
      }
      
      if (error.message.includes('parroquia especificada no existe')) {
        throw new Error('PARROQUIA_NOT_FOUND');
      }
      
      if (error.message.includes('nivel especificado no existe')) {
        throw new Error('NIVEL_NOT_FOUND');
      }
      
      throw new Error('ERROR_UPDATING_GRUPO');
    }
  }

  /**
   * Eliminar grupo
   */
  async deleteGrupo(id) {
    try {
      // Verificar que el grupo existe
      const grupo = await this.getGrupoById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.EliminarGrupo', {
        id_grupo: id
      });
      
      return grupo;
    } catch (error) {
      console.error('Error eliminando grupo:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        throw error;
      }
      
      if (error.message.includes('registros relacionados')) {
        throw new Error('GRUPO_HAS_DEPENDENCIES');
      }
      
      throw new Error('ERROR_DELETING_GRUPO');
    }
  }

  /**
   * Obtener grupos por parroquia
   */
  async getGruposByParroquia(idParroquia, filtros = {}) {
    try {
      // Verificar que la parroquia existe
      const parroquiaExists = await database.executeQuery(
        'SELECT COUNT(*) as count FROM Parroquias.Parroquia WHERE id_parroquia = @id_parroquia',
        { id_parroquia: idParroquia }
      );
      
      if (parroquiaExists.recordset[0].count === 0) {
        throw new Error('PARROQUIA_NOT_FOUND');
      }
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerGruposPorParroquia', {
        id_parroquia: idParroquia
      });
      
      let grupos = result.recordset || [];
      
      // Aplicar filtros adicionales si se proporcionan
      if (filtros.periodo) {
        grupos = grupos.filter(g => g.periodo === filtros.periodo);
      }
      
      if (filtros.nivel) {
        grupos = grupos.filter(g => g.id_nivel === parseInt(filtros.nivel));
      }
      
      return grupos;
    } catch (error) {
      console.error('Error obteniendo grupos por parroquia:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_GRUPOS_BY_PARROQUIA');
    }
  }

  /**
   * Obtener grupos por nivel
   */
  async getGruposByNivel(idNivel, filtros = {}) {
    try {
      // Verificar que el nivel existe
      const nivelExists = await database.executeQuery(
        'SELECT COUNT(*) as count FROM Catequesis.Nivel WHERE id_nivel = @id_nivel',
        { id_nivel: idNivel }
      );
      
      if (nivelExists.recordset[0].count === 0) {
        throw new Error('NIVEL_NOT_FOUND');
      }
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerGruposPorNivel', {
        id_nivel: idNivel
      });
      
      let grupos = result.recordset || [];
      
      // Aplicar filtros adicionales
      if (filtros.periodo) {
        grupos = grupos.filter(g => g.periodo === filtros.periodo);
      }
      
      if (filtros.id_parroquia) {
        grupos = grupos.filter(g => g.id_parroquia === filtros.id_parroquia);
      }
      
      return grupos;
    } catch (error) {
      console.error('Error obteniendo grupos por nivel:', error);
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_GRUPOS_BY_NIVEL');
    }
  }

  /**
   * Obtener inscripciones de un grupo
   */
  async getGrupoInscripciones(id) {
    try {
      // Verificar que el grupo exists
      await this.getGrupoById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerInscripcionesPorGrupo', {
        id_grupo: id
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo inscripciones del grupo:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_INSCRIPCIONES');
    }
  }

  /**
   * Obtener catequistas de un grupo
   */
  async getGrupoCatequistas(id) {
    try {
      // Verificar que el grupo exists
      await this.getGrupoById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerCatequistasPorGrupo', {
        id_grupo: id
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo catequistas del grupo:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_CATEQUISTAS');
    }
  }

  /**
   * Obtener estadísticas de un grupo
   */
  async getGrupoStats(id) {
    try {
      // Verificar que el grupo exists
      await this.getGrupoById(id);
      
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM Catequesis.Inscripcion WHERE id_grupo = @id_grupo) as total_inscripciones,
          (SELECT COUNT(*) FROM Catequesis.CatequistaGrupo WHERE id_grupo = @id_grupo) as total_catequistas,
          (SELECT COUNT(DISTINCT a.id_inscripcion) 
           FROM Catequesis.Asistencia a 
           INNER JOIN Catequesis.Inscripcion i ON a.id_inscripcion = i.id_inscripcion
           WHERE i.id_grupo = @id_grupo AND a.asistio = 1) as inscripciones_con_asistencias,
          (SELECT AVG(CAST(asistio AS FLOAT)) * 100
           FROM Catequesis.Asistencia a 
           INNER JOIN Catequesis.Inscripcion i ON a.id_inscripcion = i.id_inscripcion
           WHERE i.id_grupo = @id_grupo) as porcentaje_asistencia_promedio
      `;
      
      const result = await database.executeQuery(statsQuery, { id_grupo: id });
      
      return result.recordset[0] || {
        total_inscripciones: 0,
        total_catequistas: 0,
        inscripciones_con_asistencias: 0,
        porcentaje_asistencia_promedio: 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas del grupo:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_STATS');
    }
  }

  /**
   * Buscar grupos
   */
  async searchGrupos(filtros) {
    try {
      const { search, id_parroquia, id_nivel, periodo } = filtros;
      
      let query = `
        SELECT 
          g.id_grupo, 
          g.id_parroquia, 
          g.id_nivel, 
          g.nombre, 
          g.periodo,
          p.nombre AS nombre_parroquia,
          n.nombre AS nombre_nivel,
          n.orden AS orden_nivel,
          (SELECT COUNT(*) FROM Catequesis.Inscripcion i WHERE i.id_grupo = g.id_grupo) AS total_inscripciones
        FROM Catequesis.Grupo g
        INNER JOIN Parroquias.Parroquia p ON g.id_parroquia = p.id_parroquia
        INNER JOIN Catequesis.Nivel n ON g.id_nivel = n.id_nivel
        WHERE g.nombre LIKE @search
      `;
      
      let params = { search: `%${search}%` };
      
      if (id_parroquia) {
        query += ' AND g.id_parroquia = @id_parroquia';
        params.id_parroquia = id_parroquia;
      }
      
      if (id_nivel) {
        query += ' AND g.id_nivel = @id_nivel';
        params.id_nivel = id_nivel;
      }
      
      if (periodo) {
        query += ' AND g.periodo = @periodo';
        params.periodo = periodo;
      }
      
      query += ' ORDER BY g.periodo DESC, p.nombre, n.orden, g.nombre';
      
      const result = await database.executeQuery(query, params);
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error buscando grupos:', error);
      throw new Error('ERROR_SEARCHING_GRUPOS');
    }
  }

  /**
   * Validar datos del grupo
   */
  async validateGrupoData(data, excludeId = null) {
    const { id_parroquia, id_nivel, nombre, periodo } = data;
    
    // Validar que los campos requeridos no estén vacíos
    if (!nombre || nombre.trim().length < 2) {
      throw new Error('El nombre del grupo debe tener al menos 2 caracteres');
    }
    
    if (!periodo || periodo.trim().length < 4) {
      throw new Error('El periodo debe tener al menos 4 caracteres (ejemplo: 2024)');
    }
    
    if (!id_parroquia || id_parroquia <= 0) {
      throw new Error('La parroquia es requerida');
    }
    
    if (!id_nivel || id_nivel <= 0) {
      throw new Error('El nivel es requerido');
    }
    
    // Validar formato del periodo (año o rango de años)
    const periodoPattern = /^\d{4}(-\d{4})?$/;
    if (!periodoPattern.test(periodo.trim())) {
      throw new Error('El periodo debe tener formato YYYY o YYYY-YYYY');
    }
    
    return true;
  }

  /**
   * Obtener grupos activos (del año actual)
   */
  async getGruposActivos(filtros = {}) {
    try {
      const currentYear = new Date().getFullYear().toString();
      
      let query = `
        SELECT 
          g.id_grupo, 
          g.id_parroquia, 
          g.id_nivel, 
          g.nombre, 
          g.periodo,
          p.nombre AS nombre_parroquia,
          n.nombre AS nombre_nivel,
          n.orden AS orden_nivel,
          (SELECT COUNT(*) FROM Catequesis.Inscripcion i WHERE i.id_grupo = g.id_grupo) AS total_inscripciones
        FROM Catequesis.Grupo g
        INNER JOIN Parroquias.Parroquia p ON g.id_parroquia = p.id_parroquia
        INNER JOIN Catequesis.Nivel n ON g.id_nivel = n.id_nivel
        WHERE g.periodo = @periodo
      `;
      
      let params = { periodo: currentYear };
      
      if (filtros.id_parroquia) {
        query += ' AND g.id_parroquia = @id_parroquia';
        params.id_parroquia = filtros.id_parroquia;
      }
      
      if (filtros.id_nivel) {
        query += ' AND g.id_nivel = @id_nivel';
        params.id_nivel = filtros.id_nivel;
      }
      
      query += ' ORDER BY p.nombre, n.orden, g.nombre';
      
      const result = await database.executeQuery(query, params);
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo grupos activos:', error);
      throw new Error('ERROR_FETCHING_GRUPOS_ACTIVOS');
    }
  }

  /**
   * Obtener resumen de grupos por parroquia
   */
  async getResumenGruposPorParroquia(idParroquia) {
    try {
      const resumenQuery = `
        SELECT 
          g.periodo,
          COUNT(*) as total_grupos,
          COUNT(DISTINCT g.id_nivel) as niveles_diferentes,
          SUM((SELECT COUNT(*) FROM Catequesis.Inscripcion i WHERE i.id_grupo = g.id_grupo)) as total_inscripciones
        FROM Catequesis.Grupo g
        WHERE g.id_parroquia = @id_parroquia
        GROUP BY g.periodo
        ORDER BY g.periodo DESC
      `;
      
      const result = await database.executeQuery(resumenQuery, { id_parroquia: idParroquia });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo resumen de grupos por parroquia:', error);
      throw new Error('ERROR_FETCHING_RESUMEN_GRUPOS');
    }
  }
}

module.exports = new GrupoService();