const database = require('../config/database');

class AsistenciaService {
  /**
   * Registrar asistencia individual
   */
  async registrarAsistencia(asistenciaData) {
    try {
      const { id_inscripcion, fecha = new Date(), asistio } = asistenciaData;
      
      // Validar datos
      if (!id_inscripcion || asistio === undefined) {
        throw new Error('Datos de asistencia incompletos');
      }
      
      const result = await database.executeStoredProcedure('Catequesis.CrearAsistencia', {
        id_inscripcion,
        fecha,
        asistio
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('ERROR_REGISTERING_ASISTENCIA');
      }
      
      // Obtener la asistencia completa creada
      const asistenciaId = result.recordset[0].id_asistencia;
      return await this.getAsistenciaById(asistenciaId);
    } catch (error) {
      console.error('Error registrando asistencia:', error);
      
      if (error.message.includes('inscripción especificada no existe')) {
        throw new Error('INSCRIPCION_NOT_FOUND');
      }
      
      if (error.message.includes('ya existe un registro de asistencia')) {
        throw new Error('ASISTENCIA_ALREADY_EXISTS');
      }
      
      throw new Error('ERROR_REGISTERING_ASISTENCIA');
    }
  }

  /**
   * Registrar asistencia masiva para un grupo en una fecha
   */
  async registrarAsistenciaMasiva(idGrupo, fecha, asistencias, usuario) {
    try {
      // Verificar que el grupo existe y que el usuario tiene acceso
      const grupoAccess = await this.verificarAccesoGrupo(idGrupo, usuario);
      if (!grupoAccess) {
        throw new Error('GRUPO_ACCESS_DENIED');
      }
      
      // Validar formato de asistencias
      if (!Array.isArray(asistencias) || asistencias.length === 0) {
        throw new Error('INVALID_ASISTENCIAS_DATA');
      }
      
      // Obtener inscripciones del grupo
      const inscripciones = await database.executeStoredProcedure('Catequesis.ObtenerInscripcionesPorGrupo', {
        id_grupo: idGrupo
      });
      
      const inscripcionesMap = new Map();
      inscripciones.recordset.forEach(i => {
        inscripcionesMap.set(i.id_inscripcion, i);
      });
      
      let resultados = {
        exitosos: [],
        errores: [],
        actualizados: []
      };
      
      // Procesar cada asistencia
      for (const asistenciaItem of asistencias) {
        try {
          const { id_inscripcion, asistio } = asistenciaItem;
          
          // Verificar que la inscripción pertenece al grupo
          if (!inscripcionesMap.has(id_inscripcion)) {
            resultados.errores.push({
              id_inscripcion,
              error: 'Inscripción no pertenece al grupo'
            });
            continue;
          }
          
          // Verificar si ya existe asistencia para esta fecha
          const asistenciaExistente = await database.executeQuery(`
            SELECT id_asistencia, asistio 
            FROM Catequesis.Asistencia 
            WHERE id_inscripcion = @id_inscripcion AND CAST(fecha AS DATE) = CAST(@fecha AS DATE)
          `, { id_inscripcion, fecha });
          
          if (asistenciaExistente.recordset.length > 0) {
            // Actualizar asistencia existente
            const idAsistencia = asistenciaExistente.recordset[0].id_asistencia;
            await this.updateAsistencia(idAsistencia, asistio, usuario, false);
            
            resultados.actualizados.push({
              id_inscripcion,
              id_asistencia: idAsistencia,
              asistio_anterior: asistenciaExistente.recordset[0].asistio,
              asistio_nuevo: asistio
            });
          } else {
            // Crear nueva asistencia
            const nuevaAsistencia = await this.registrarAsistencia({
              id_inscripcion,
              fecha,
              asistio
            });
            
            resultados.exitosos.push({
              id_inscripcion,
              id_asistencia: nuevaAsistencia.id_asistencia,
              asistio
            });
          }
        } catch (itemError) {
          resultados.errores.push({
            id_inscripcion: asistenciaItem.id_inscripcion,
            error: itemError.message
          });
        }
      }
      
      return {
        fecha: fecha,
        grupo: idGrupo,
        resumen: {
          total_procesados: asistencias.length,
          exitosos: resultados.exitosos.length,
          actualizados: resultados.actualizados.length,
          errores: resultados.errores.length
        },
        detalles: resultados
      };
    } catch (error) {
      console.error('Error registrando asistencia masiva:', error);
      
      if (error.message === 'GRUPO_ACCESS_DENIED' || 
          error.message === 'INVALID_ASISTENCIAS_DATA') {
        throw error;
      }
      
      throw new Error('ERROR_REGISTERING_ASISTENCIA_MASIVA');
    }
  }

  /**
   * Obtener asistencia por ID
   */
  async getAsistenciaById(id) {
    try {
      const result = await database.executeStoredProcedure('Catequesis.ObtenerAsistencia', {
        id_asistencia: id
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('ASISTENCIA_NOT_FOUND');
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo asistencia por ID:', error);
      
      if (error.message === 'ASISTENCIA_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_ASISTENCIA');
    }
  }

  /**
   * Obtener asistencias por inscripción
   */
  async getAsistenciasByInscripcion(idInscripcion) {
    try {
      // Verificar que la inscripción existe
      const inscripcionExists = await database.executeQuery(
        'SELECT COUNT(*) as count FROM Catequesis.Inscripcion WHERE id_inscripcion = @id_inscripcion',
        { id_inscripcion: idInscripcion }
      );
      
      if (inscripcionExists.recordset[0].count === 0) {
        throw new Error('INSCRIPCION_NOT_FOUND');
      }
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerAsistenciasPorInscripcion', {
        id_inscripcion: idInscripcion
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo asistencias por inscripción:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_ASISTENCIAS');
    }
  }

  /**
   * Obtener asistencias por grupo y fecha
   */
  async getAsistenciasByGrupoYFecha(idGrupo, fecha) {
    try {
      // Validar formato de fecha
      if (!this.isValidDate(fecha)) {
        throw new Error('INVALID_DATE_FORMAT');
      }
      
      // Verificar que el grupo existe
      const grupoExists = await database.executeQuery(
        'SELECT COUNT(*) as count FROM Catequesis.Grupo WHERE id_grupo = @id_grupo',
        { id_grupo: idGrupo }
      );
      
      if (grupoExists.recordset[0].count === 0) {
        throw new Error('GRUPO_NOT_FOUND');
      }
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerAsistenciasPorGrupoYFecha', {
        id_grupo: idGrupo,
        fecha: fecha
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo asistencias por grupo y fecha:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND' || 
          error.message === 'INVALID_DATE_FORMAT') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_ASISTENCIAS');
    }
  }

  /**
   * Obtener resumen de asistencias de un grupo
   */
  async getResumenAsistenciasGrupo(idGrupo, filtros = {}) {
    try {
      const { fecha_inicio, fecha_fin } = filtros;
      
      // Verificar que el grupo exists
      const grupoExists = await database.executeQuery(
        'SELECT COUNT(*) as count FROM Catequesis.Grupo WHERE id_grupo = @id_grupo',
        { id_grupo: idGrupo }
      );
      
      if (grupoExists.recordset[0].count === 0) {
        throw new Error('GRUPO_NOT_FOUND');
      }
      
      // Validar rango de fechas
      if (fecha_inicio && fecha_fin) {
        if (!this.isValidDate(fecha_inicio) || !this.isValidDate(fecha_fin)) {
          throw new Error('INVALID_DATE_RANGE');
        }
        
        if (new Date(fecha_inicio) > new Date(fecha_fin)) {
          throw new Error('INVALID_DATE_RANGE');
        }
      }
      
      let query = `
        SELECT 
          i.id_inscripcion,
          c.nombres + ' ' + c.apellidos AS nombre_catequizando,
          c.documento_identidad,
          COUNT(a.id_asistencia) AS total_clases,
          COUNT(CASE WHEN a.asistio = 1 THEN 1 END) AS asistencias,
          COUNT(CASE WHEN a.asistio = 0 THEN 1 END) AS inasistencias,
          CASE 
            WHEN COUNT(a.id_asistencia) > 0 THEN 
              CAST(COUNT(CASE WHEN a.asistio = 1 THEN 1 END) AS FLOAT) * 100 / COUNT(a.id_asistencia)
            ELSE 0 
          END AS porcentaje_asistencia
        FROM Catequesis.Inscripcion i
        INNER JOIN Catequesis.Catequizando c ON i.id_catequizando = c.id_catequizando
        LEFT JOIN Catequesis.Asistencia a ON i.id_inscripcion = a.id_inscripcion
      `;
      
      let params = { id_grupo: idGrupo };
      let whereConditions = ['i.id_grupo = @id_grupo'];
      
      if (fecha_inicio && fecha_fin) {
        whereConditions.push('(a.fecha IS NULL OR (a.fecha >= @fecha_inicio AND a.fecha <= @fecha_fin))');
        params.fecha_inicio = fecha_inicio;
        params.fecha_fin = fecha_fin;
      }
      
      query += ` WHERE ${whereConditions.join(' AND ')}
                 GROUP BY i.id_inscripcion, c.nombres, c.apellidos, c.documento_identidad
                 ORDER BY porcentaje_asistencia DESC, c.apellidos, c.nombres`;
      
      const result = await database.executeQuery(query, params);
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo resumen de asistencias:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND' || 
          error.message === 'INVALID_DATE_RANGE') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_RESUMEN');
    }
  }

  /**
   * Actualizar asistencia
   */
  async updateAsistencia(id, asistio, usuario, verificarAcceso = true) {
    try {
      // Verificar que la asistencia exists
      const asistencia = await this.getAsistenciaById(id);
      
      if (verificarAcceso) {
        // Verificar permisos del usuario para esta asistencia
        const hasAccess = await this.verificarAccesoAsistencia(id, usuario);
        if (!hasAccess) {
          throw new Error('ACCESS_DENIED');
        }
      }
      
      const result = await database.executeStoredProcedure('Catequesis.ActualizarAsistencia', {
        id_asistencia: id,
        asistio
      });
      
      // Obtener la asistencia actualizada
      return await this.getAsistenciaById(id);
    } catch (error) {
      console.error('Error actualizando asistencia:', error);
      
      if (error.message === 'ASISTENCIA_NOT_FOUND' || 
          error.message === 'ACCESS_DENIED') {
        throw error;
      }
      
      throw new Error('ERROR_UPDATING_ASISTENCIA');
    }
  }

  /**
   * Eliminar asistencia
   */
  async deleteAsistencia(id, usuario) {
    try {
      // Verificar que la asistencia exists
      const asistencia = await this.getAsistenciaById(id);
      
      // Verificar permisos del usuario
      const hasAccess = await this.verificarAccesoAsistencia(id, usuario);
      if (!hasAccess) {
        throw new Error('ACCESS_DENIED');
      }
      
      const result = await database.executeStoredProcedure('Catequesis.EliminarAsistencia', {
        id_asistencia: id
      });
      
      return asistencia;
    } catch (error) {
      console.error('Error eliminando asistencia:', error);
      
      if (error.message === 'ASISTENCIA_NOT_FOUND' || 
          error.message === 'ACCESS_DENIED') {
        throw error;
      }
      
      throw new Error('ERROR_DELETING_ASISTENCIA');
    }
  }

  /**
   * Obtener estadísticas de asistencia por grupo
   */
  async getStatsAsistenciaGrupo(idGrupo, periodo = null) {
    try {
      let whereClause = '';
      let params = { id_grupo: idGrupo };
      
      if (periodo) {
        whereClause = ' AND YEAR(a.fecha) = @periodo';
        params.periodo = periodo;
      }
      
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT i.id_inscripcion) AS total_catequizandos,
          COUNT(a.id_asistencia) AS total_registros_asistencia,
          COUNT(CASE WHEN a.asistio = 1 THEN 1 END) AS total_asistencias,
          COUNT(CASE WHEN a.asistio = 0 THEN 1 END) AS total_inasistencias,
          COUNT(DISTINCT a.fecha) AS total_fechas_clase,
          CASE 
            WHEN COUNT(a.id_asistencia) > 0 THEN 
              CAST(COUNT(CASE WHEN a.asistio = 1 THEN 1 END) AS FLOAT) * 100 / COUNT(a.id_asistencia)
            ELSE 0 
          END AS porcentaje_asistencia_general
        FROM Catequesis.Inscripcion i
        LEFT JOIN Catequesis.Asistencia a ON i.id_inscripcion = a.id_inscripcion
        WHERE i.id_grupo = @id_grupo${whereClause}
      `;
      
      const result = await database.executeQuery(statsQuery, params);
      
      return result.recordset[0] || {
        total_catequizandos: 0,
        total_registros_asistencia: 0,
        total_asistencias: 0,
        total_inasistencias: 0,
        total_fechas_clase: 0,
        porcentaje_asistencia_general: 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de asistencia:', error);
      throw new Error('ERROR_FETCHING_STATS');
    }
  }

  /**
   * Obtener fechas con asistencias registradas para un grupo
   */
  async getFechasAsistenciaGrupo(idGrupo) {
    try {
      const fechasQuery = `
        SELECT DISTINCT 
          CAST(a.fecha AS DATE) AS fecha,
          COUNT(a.id_asistencia) AS total_registros,
          COUNT(CASE WHEN a.asistio = 1 THEN 1 END) AS presentes,
          COUNT(CASE WHEN a.asistio = 0 THEN 1 END) AS ausentes
        FROM Catequesis.Asistencia a
        INNER JOIN Catequesis.Inscripcion i ON a.id_inscripcion = i.id_inscripcion
        WHERE i.id_grupo = @id_grupo
        GROUP BY CAST(a.fecha AS DATE)
        ORDER BY fecha DESC
      `;
      
      const result = await database.executeQuery(fechasQuery, { id_grupo: idGrupo });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo fechas de asistencia:', error);
      throw new Error('ERROR_FETCHING_FECHAS');
    }
  }

  /**
   * Verificar acceso del usuario a un grupo
   */
  async verificarAccesoGrupo(idGrupo, usuario) {
    try {
      // Admin tiene acceso a todo
      if (usuario.tipo_perfil === 'admin') {
        return true;
      }
      
      // Verificar que el grupo existe y obtener su parroquia
      const grupo = await database.executeQuery(
        'SELECT id_parroquia FROM Catequesis.Grupo WHERE id_grupo = @id_grupo',
        { id_grupo: idGrupo }
      );
      
      if (grupo.recordset.length === 0) {
        throw new Error('GRUPO_NOT_FOUND');
      }
      
      // Verificar que el usuario pertenece a la misma parroquia
      return grupo.recordset[0].id_parroquia === usuario.id_parroquia;
    } catch (error) {
      console.error('Error verificando acceso a grupo:', error);
      return false;
    }
  }

  /**
   * Verificar acceso del usuario a una asistencia específica
   */
  async verificarAccesoAsistencia(idAsistencia, usuario) {
    try {
      // Admin tiene acceso a todo
      if (usuario.tipo_perfil === 'admin') {
        return true;
      }
      
      // Obtener información de la asistencia y su grupo
      const asistenciaInfo = await database.executeQuery(`
        SELECT g.id_parroquia
        FROM Catequesis.Asistencia a
        INNER JOIN Catequesis.Inscripcion i ON a.id_inscripcion = i.id_inscripcion
        INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo
        WHERE a.id_asistencia = @id_asistencia
      `, { id_asistencia: idAsistencia });
      
      if (asistenciaInfo.recordset.length === 0) {
        return false;
      }
      
      // Verificar que el usuario pertenece a la misma parroquia
      return asistenciaInfo.recordset[0].id_parroquia === usuario.id_parroquia;
    } catch (error) {
      console.error('Error verificando acceso a asistencia:', error);
      return false;
    }
  }

  /**
   * Validar formato de fecha
   */
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Obtener catequizandos con baja asistencia
   */
  async getCatequizandosBajaAsistencia(filtros = {}) {
    try {
      const { porcentaje_minimo = 70, id_parroquia, id_grupo } = filtros;
      
      let query = `
        SELECT 
          i.id_inscripcion,
          i.id_catequizando,
          c.nombres + ' ' + c.apellidos AS nombre_catequizando,
          c.documento_identidad,
          g.nombre AS nombre_grupo,
          p.nombre AS nombre_parroquia,
          COUNT(a.id_asistencia) AS total_clases,
          COUNT(CASE WHEN a.asistio = 1 THEN 1 END) AS asistencias,
          CASE 
            WHEN COUNT(a.id_asistencia) > 0 THEN 
              CAST(COUNT(CASE WHEN a.asistio = 1 THEN 1 END) AS FLOAT) * 100 / COUNT(a.id_asistencia)
            ELSE 0 
          END AS porcentaje_asistencia
        FROM Catequesis.Inscripcion i
        INNER JOIN Catequesis.Catequizando c ON i.id_catequizando = c.id_catequizando
        INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo
        INNER JOIN Parroquias.Parroquia p ON g.id_parroquia = p.id_parroquia
        LEFT JOIN Catequesis.Asistencia a ON i.id_inscripcion = a.id_inscripcion
        WHERE 1=1
      `;
      
      let params = { porcentaje_minimo };
      
      if (id_parroquia) {
        query += ' AND g.id_parroquia = @id_parroquia';
        params.id_parroquia = id_parroquia;
      }
      
      if (id_grupo) {
        query += ' AND i.id_grupo = @id_grupo';
        params.id_grupo = id_grupo;
      }
      
      query += `
        GROUP BY i.id_inscripcion, i.id_catequizando, c.nombres, c.apellidos, 
                 c.documento_identidad, g.nombre, p.nombre
        HAVING COUNT(a.id_asistencia) > 0 
               AND (CAST(COUNT(CASE WHEN a.asistio = 1 THEN 1 END) AS FLOAT) * 100 / COUNT(a.id_asistencia)) < @porcentaje_minimo
        ORDER BY porcentaje_asistencia ASC, c.apellidos, c.nombres
      `;
      
      const result = await database.executeQuery(query, params);
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo catequizandos con baja asistencia:', error);
      throw new Error('ERROR_FETCHING_BAJA_ASISTENCIA');
    }
  }

  /**
   * Generar reporte de asistencias
   */
  async generarReporteAsistencias(idGrupo, filtros = {}) {
    try {
      const { fecha_inicio, fecha_fin, formato = 'json' } = filtros;
      
      // Obtener información del grupo
      const grupo = await database.executeStoredProcedure('Catequesis.ObtenerGrupo', {
        id_grupo: idGrupo
      });
      
      if (!grupo.recordset || grupo.recordset.length === 0) {
        throw new Error('GRUPO_NOT_FOUND');
      }
      
      // Obtener datos del reporte
      const resumen = await this.getResumenAsistenciasGrupo(idGrupo, { fecha_inicio, fecha_fin });
      const fechas = await this.getFechasAsistenciaGrupo(idGrupo);
      
      const reporte = {
        grupo: grupo.recordset[0],
        periodo: { fecha_inicio, fecha_fin },
        resumen_catequizandos: resumen,
        fechas_clase: fechas,
        generado_en: new Date().toISOString()
      };
      
      if (formato === 'csv') {
        return this.convertirReporteACSV(reporte);
      }
      
      return reporte;
    } catch (error) {
      console.error('Error generando reporte de asistencias:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_GENERATING_REPORT');
    }
  }

  /**
   * Convertir reporte a formato CSV
   */
  convertirReporteACSV(reporte) {
    let csv = 'Nombre,Documento,Total Clases,Asistencias,Inasistencias,Porcentaje Asistencia\n';
    
    reporte.resumen_catequizandos.forEach(cat => {
      csv += `"${cat.nombre_catequizando}","${cat.documento_identidad}",${cat.total_clases},${cat.asistencias},${cat.inasistencias},${cat.porcentaje_asistencia.toFixed(2)}%\n`;
    });
    
    return csv;
  }
}

module.exports = new AsistenciaService();