const database = require('../config/database');

class InscripcionService {
  /**
   * Obtener todas las inscripciones con filtros y paginación
   */
  async getAllInscripciones(filtros = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        id_parroquia, 
        id_grupo, 
        id_catequizando, 
        periodo, 
        pago_realizado 
      } = filtros;
      
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          i.id_inscripcion,
          i.id_catequizando,
          i.id_grupo,
          i.id_parroquia,
          i.fecha_inscripcion,
          i.pago_realizado,
          c.nombres + ' ' + c.apellidos AS nombre_catequizando,
          c.documento_identidad,
          g.nombre AS nombre_grupo,
          g.periodo,
          p.nombre AS nombre_parroquia,
          n.nombre AS nivel
        FROM Catequesis.Inscripcion i
        INNER JOIN Catequesis.Catequizando c ON i.id_catequizando = c.id_catequizando
        INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo
        INNER JOIN Parroquias.Parroquia p ON i.id_parroquia = p.id_parroquia
        INNER JOIN Catequesis.Nivel n ON g.id_nivel = n.id_nivel
        WHERE 1=1
      `;
      
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM Catequesis.Inscripcion i
        INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo
        WHERE 1=1
      `;
      
      let params = {};
      let whereConditions = [];
      
      if (id_parroquia) {
        whereConditions.push('i.id_parroquia = @id_parroquia');
        params.id_parroquia = id_parroquia;
      }
      
      if (id_grupo) {
        whereConditions.push('i.id_grupo = @id_grupo');
        params.id_grupo = id_grupo;
      }
      
      if (id_catequizando) {
        whereConditions.push('i.id_catequizando = @id_catequizando');
        params.id_catequizando = id_catequizando;
      }
      
      if (periodo) {
        whereConditions.push('g.periodo = @periodo');
        params.periodo = periodo;
      }
      
      if (pago_realizado !== undefined) {
        whereConditions.push('i.pago_realizado = @pago_realizado');
        params.pago_realizado = pago_realizado;
      }
      
      if (whereConditions.length > 0) {
        const whereClause = ' AND ' + whereConditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }
      
      query += ` ORDER BY i.fecha_inscripcion DESC, c.apellidos, c.nombres
                 OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
      
      params.offset = offset;
      params.limit = limit;
      
      const [inscripciones, total] = await Promise.all([
        database.executeQuery(query, params),
        database.executeQuery(countQuery, params)
      ]);
      
      return {
        inscripciones: inscripciones.recordset || [],
        pagination: {
          current_page: page,
          per_page: limit,
          total: total.recordset[0]?.total || 0,
          total_pages: Math.ceil((total.recordset[0]?.total || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Error obteniendo inscripciones:', error);
      throw new Error('ERROR_FETCHING_INSCRIPCIONES');
    }
  }

  /**
   * Obtener inscripción por ID
   */
  async getInscripcionById(id) {
    try {
      const result = await database.executeStoredProcedure('Catequesis.ObtenerInscripcion', { 
        id_inscripcion: id 
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('INSCRIPCION_NOT_FOUND');
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo inscripción por ID:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_INSCRIPCION');
    }
  }

  /**
   * Crear nueva inscripción
   */
  async createInscripcion(inscripcionData) {
    try {
      const { 
        id_catequizando, 
        id_grupo, 
        id_parroquia, 
        fecha_inscripcion = new Date(), 
        pago_realizado = false 
      } = inscripcionData;
      
      // Validaciones de negocio
      await this.validateInscripcionData({ id_catequizando, id_grupo, id_parroquia });
      
      const result = await database.executeStoredProcedure('Catequesis.CrearInscripcion', {
        id_catequizando,
        id_grupo,
        id_parroquia,
        fecha_inscripcion,
        pago_realizado
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('ERROR_CREATING_INSCRIPCION');
      }
      
      // Obtener la inscripción completa creada
      const inscripcionId = result.recordset[0].id_inscripcion;
      return await this.getInscripcionById(inscripcionId);
    } catch (error) {
      console.error('Error creando inscripción:', error);
      
      if (error.message.includes('ya está inscrito en este grupo')) {
        throw new Error('INSCRIPCION_ALREADY_EXISTS');
      }
      
      if (error.message.includes('catequizando especificado no existe')) {
        throw new Error('CATEQUIZANDO_NOT_FOUND');
      }
      
      if (error.message.includes('grupo especificado no existe')) {
        throw new Error('GRUPO_NOT_FOUND');
      }
      
      if (error.message.includes('parroquia especificada no existe')) {
        throw new Error('PARROQUIA_NOT_FOUND');
      }
      
      throw new Error('ERROR_CREATING_INSCRIPCION');
    }
  }

  /**
   * Actualizar inscripción
   */
  async updateInscripcion(id, inscripcionData) {
    try {
      const { id_catequizando, id_grupo, id_parroquia, fecha_inscripcion, pago_realizado } = inscripcionData;
      
      // Verificar que la inscripción existe
      await this.getInscripcionById(id);
      
      // Validaciones de negocio
      await this.validateInscripcionData({ id_catequizando, id_grupo, id_parroquia }, id);
      
      const result = await database.executeStoredProcedure('Catequesis.ActualizarInscripcion', {
        id_inscripcion: id,
        id_catequizando,
        id_grupo,
        id_parroquia,
        fecha_inscripcion,
        pago_realizado
      });
      
      // Obtener la inscripción actualizada
      return await this.getInscripcionById(id);
    } catch (error) {
      console.error('Error actualizando inscripción:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND') {
        throw error;
      }
      
      if (error.message.includes('ya está inscrito en este grupo')) {
        throw new Error('INSCRIPCION_ALREADY_EXISTS');
      }
      
      if (error.message.includes('catequizando especificado no existe')) {
        throw new Error('CATEQUIZANDO_NOT_FOUND');
      }
      
      if (error.message.includes('grupo especificado no existe')) {
        throw new Error('GRUPO_NOT_FOUND');
      }
      
      if (error.message.includes('parroquia especificada no existe')) {
        throw new Error('PARROQUIA_NOT_FOUND');
      }
      
      throw new Error('ERROR_UPDATING_INSCRIPCION');
    }
  }

  /**
   * Eliminar inscripción
   */
  async deleteInscripcion(id) {
    try {
      // Verificar que la inscripción existe
      const inscripcion = await this.getInscripcionById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.EliminarInscripcion', {
        id_inscripcion: id
      });
      
      return inscripcion;
    } catch (error) {
      console.error('Error eliminando inscripción:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND') {
        throw error;
      }
      
      if (error.message.includes('registros relacionados')) {
        throw new Error('INSCRIPCION_HAS_DEPENDENCIES');
      }
      
      throw new Error('ERROR_DELETING_INSCRIPCION');
    }
  }

  /**
   * Actualizar estado de pago
   */
  async updatePagoInscripcion(id, pagoRealizado) {
    try {
      // Verificar que la inscripción existe
      await this.getInscripcionById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.ActualizarPagoInscripcion', {
        id_inscripcion: id,
        pago_realizado: pagoRealizado
      });
      
      // Obtener la inscripción actualizada
      return await this.getInscripcionById(id);
    } catch (error) {
      console.error('Error actualizando pago de inscripción:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_UPDATING_PAGO');
    }
  }

  /**
   * Obtener inscripciones por catequizando
   */
  async getInscripcionesByCatequizando(idCatequizando) {
    try {
      // Verificar que el catequizando existe
      const catequizandoExists = await database.executeQuery(
        'SELECT COUNT(*) as count FROM Catequesis.Catequizando WHERE id_catequizando = @id_catequizando',
        { id_catequizando: idCatequizando }
      );
      
      if (catequizandoExists.recordset[0].count === 0) {
        throw new Error('CATEQUIZANDO_NOT_FOUND');
      }
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerInscripcionesPorCatequizando', {
        id_catequizando: idCatequizando
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo inscripciones por catequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_INSCRIPCIONES_BY_CATEQUIZANDO');
    }
  }

  /**
   * Obtener inscripciones por grupo
   */
  async getInscripcionesByGrupo(idGrupo) {
    try {
      // Verificar que el grupo existe
      const grupoExists = await database.executeQuery(
        'SELECT COUNT(*) as count FROM Catequesis.Grupo WHERE id_grupo = @id_grupo',
        { id_grupo: idGrupo }
      );
      
      if (grupoExists.recordset[0].count === 0) {
        throw new Error('GRUPO_NOT_FOUND');
      }
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerInscripcionesPorGrupo', {
        id_grupo: idGrupo
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo inscripciones por grupo:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_INSCRIPCIONES_BY_GRUPO');
    }
  }

  /**
   * Obtener estadísticas de inscripciones
   */
  async getInscripcionesStats(filtros = {}) {
    try {
      let whereClause = '';
      let params = {};
      
      if (filtros.id_parroquia) {
        whereClause = ' WHERE i.id_parroquia = @id_parroquia';
        params.id_parroquia = filtros.id_parroquia;
      }
      
      const statsQuery = `
        SELECT 
          COUNT(*) AS total_inscripciones,
          COUNT(CASE WHEN i.pago_realizado = 1 THEN 1 END) AS inscripciones_pagadas,
          COUNT(CASE WHEN i.pago_realizado = 0 THEN 1 END) AS inscripciones_pendientes,
          COUNT(DISTINCT i.id_catequizando) AS catequizandos_unicos,
          COUNT(DISTINCT i.id_grupo) AS grupos_con_inscripciones,
          COUNT(DISTINCT g.periodo) AS periodos_activos
        FROM Catequesis.Inscripcion i
        INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo${whereClause}
      `;
      
      const result = await database.executeQuery(statsQuery, params);
      
      return result.recordset[0] || {
        total_inscripciones: 0,
        inscripciones_pagadas: 0,
        inscripciones_pendientes: 0,
        catequizandos_unicos: 0,
        grupos_con_inscripciones: 0,
        periodos_activos: 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de inscripciones:', error);
      throw new Error('ERROR_FETCHING_STATS');
    }
  }

  /**
   * Buscar inscripciones
   */
  async searchInscripciones(filtros) {
    try {
      const { search, id_parroquia, id_grupo, periodo, pago_realizado } = filtros;
      
      let query = `
        SELECT 
          i.id_inscripcion,
          i.id_catequizando,
          i.id_grupo,
          i.id_parroquia,
          i.fecha_inscripcion,
          i.pago_realizado,
          c.nombres + ' ' + c.apellidos AS nombre_catequizando,
          c.documento_identidad,
          g.nombre AS nombre_grupo,
          g.periodo,
          p.nombre AS nombre_parroquia,
          n.nombre AS nivel
        FROM Catequesis.Inscripcion i
        INNER JOIN Catequesis.Catequizando c ON i.id_catequizando = c.id_catequizando
        INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo
        INNER JOIN Parroquias.Parroquia p ON i.id_parroquia = p.id_parroquia
        INNER JOIN Catequesis.Nivel n ON g.id_nivel = n.id_nivel
        WHERE (c.nombres LIKE @search OR c.apellidos LIKE @search OR c.documento_identidad LIKE @search OR g.nombre LIKE @search)
      `;
      
      let params = { search: `%${search}%` };
      
      if (id_parroquia) {
        query += ' AND i.id_parroquia = @id_parroquia';
        params.id_parroquia = id_parroquia;
      }
      
      if (id_grupo) {
        query += ' AND i.id_grupo = @id_grupo';
        params.id_grupo = id_grupo;
      }
      
      if (periodo) {
        query += ' AND g.periodo = @periodo';
        params.periodo = periodo;
      }
      
      if (pago_realizado !== undefined) {
        query += ' AND i.pago_realizado = @pago_realizado';
        params.pago_realizado = pago_realizado;
      }
      
      query += ' ORDER BY i.fecha_inscripcion DESC, c.apellidos, c.nombres';
      
      const result = await database.executeQuery(query, params);
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error buscando inscripciones:', error);
      throw new Error('ERROR_SEARCHING_INSCRIPCIONES');
    }
  }

  /**
   * Obtener inscripciones pendientes de pago
   */
  async getInscripcionesPendientesPago(filtros = {}) {
    try {
      const { id_parroquia, id_grupo } = filtros;
      
      let query = `
        SELECT 
          i.id_inscripcion,
          i.id_catequizando,
          i.id_grupo,
          i.id_parroquia,
          i.fecha_inscripcion,
          c.nombres + ' ' + c.apellidos AS nombre_catequizando,
          c.documento_identidad,
          g.nombre AS nombre_grupo,
          g.periodo,
          p.nombre AS nombre_parroquia,
          DATEDIFF(DAY, i.fecha_inscripcion, GETDATE()) AS dias_pendiente
        FROM Catequesis.Inscripcion i
        INNER JOIN Catequesis.Catequizando c ON i.id_catequizando = c.id_catequizando
        INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo
        INNER JOIN Parroquias.Parroquia p ON i.id_parroquia = p.id_parroquia
        WHERE i.pago_realizado = 0
      `;
      
      let params = {};
      
      if (id_parroquia) {
        query += ' AND i.id_parroquia = @id_parroquia';
        params.id_parroquia = id_parroquia;
      }
      
      if (id_grupo) {
        query += ' AND i.id_grupo = @id_grupo';
        params.id_grupo = id_grupo;
      }
      
      query += ' ORDER BY i.fecha_inscripcion ASC';
      
      const result = await database.executeQuery(query, params);
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo inscripciones pendientes de pago:', error);
      throw new Error('ERROR_FETCHING_PENDIENTES_PAGO');
    }
  }

  /**
   * Inscribir catequizando con validaciones completas
   */
  async inscribirCatequizandoConValidaciones(inscripcionData, validarRequisitos = true) {
    try {
      const { id_catequizando, id_grupo } = inscripcionData;
      
      // Obtener información del catequizando y grupo
      const catequizando = await database.executeStoredProcedure('Catequesis.ObtenerCatequizando', {
        id_catequizando
      });
      
      const grupo = await database.executeStoredProcedure('Catequesis.ObtenerGrupo', {
        id_grupo
      });
      
      if (!catequizando.recordset || catequizando.recordset.length === 0) {
        throw new Error('CATEQUIZANDO_NOT_FOUND');
      }
      
      if (!grupo.recordset || grupo.recordset.length === 0) {
        throw new Error('GRUPO_NOT_FOUND');
      }
      
      const datosCatequizando = catequizando.recordset[0];
      const datosGrupo = grupo.recordset[0];
      
      let warnings = [];
      let errors = [];
      
      if (validarRequisitos) {
        // Validar edad apropiada
        const edad = this.calcularEdad(datosCatequizando.fecha_nacimiento);
        if (edad < 6 && !datosCatequizando.caso_especial) {
          errors.push('El catequizando debe tener al menos 6 años o ser marcado como caso especial');
        }
        
        // Verificar que no esté ya inscrito en el mismo grupo
        const inscripcionExistente = await database.executeQuery(`
          SELECT COUNT(*) as count 
          FROM Catequesis.Inscripcion 
          WHERE id_catequizando = @id_catequizando AND id_grupo = @id_grupo
        `, { id_catequizando, id_grupo });
        
        if (inscripcionExistente.recordset[0].count > 0) {
          throw new Error('INSCRIPCION_ALREADY_EXISTS');
        }
        
        // Verificar niveles previos (warning, no error)
        if (datosGrupo.orden_nivel > 1) {
          const nivelesCompletados = await database.executeQuery(`
            SELECT COUNT(*) as count
            FROM Catequesis.Certificado cert
            INNER JOIN Catequesis.Nivel n ON cert.id_nivel = n.id_nivel
            WHERE cert.id_catequizando = @id_catequizando
            AND cert.aprobado = 1
            AND n.orden < @orden_nivel
          `, { 
            id_catequizando, 
            orden_nivel: datosGrupo.orden_nivel 
          });
          
          const nivelesRequeridos = datosGrupo.orden_nivel - 1;
          if (nivelesCompletados.recordset[0].count < nivelesRequeridos) {
            warnings.push(`Le faltan ${nivelesRequeridos - nivelesCompletados.recordset[0].count} niveles previos por completar`);
          }
        }
        
        // Si hay errores críticos, no permitir inscripción
        if (errors.length > 0) {
          const error = new Error('REQUISITOS_NO_CUMPLIDOS');
          error.details = { errors, warnings };
          throw error;
        }
      }
      
      // Asegurar que la parroquia coincida con el grupo
      inscripcionData.id_parroquia = datosGrupo.id_parroquia;
      
      // Crear la inscripción
      const nuevaInscripcion = await this.createInscripcion(inscripcionData);
      
      return {
        inscripcion: nuevaInscripcion,
        warnings: warnings,
        catequizando: datosCatequizando,
        grupo: datosGrupo
      };
    } catch (error) {
      console.error('Error inscribiendo catequizando con validaciones:', error);
      
      if (error.message === 'REQUISITOS_NO_CUMPLIDOS' || 
          error.message === 'CATEQUIZANDO_NOT_FOUND' ||
          error.message === 'GRUPO_NOT_FOUND' ||
          error.message === 'INSCRIPCION_ALREADY_EXISTS') {
        throw error;
      }
      
      throw new Error('ERROR_INSCRIBIR_CATEQUIZANDO');
    }
  }

  /**
   * Validar datos de inscripción
   */
  async validateInscripcionData(data, excludeId = null) {
    const { id_catequizando, id_grupo, id_parroquia } = data;
    
    // Validar que los campos requeridos no estén vacíos
    if (!id_catequizando || id_catequizando <= 0) {
      throw new Error('El catequizando es requerido');
    }
    
    if (!id_grupo || id_grupo <= 0) {
      throw new Error('El grupo es requerido');
    }
    
    if (!id_parroquia || id_parroquia <= 0) {
      throw new Error('La parroquia es requerida');
    }
    
    // Verificar que el grupo pertenezca a la parroquia
    const grupoParroquia = await database.executeQuery(`
      SELECT id_parroquia FROM Catequesis.Grupo WHERE id_grupo = @id_grupo
    `, { id_grupo });
    
    if (grupoParroquia.recordset.length === 0) {
      throw new Error('GRUPO_NOT_FOUND');
    }
    
    if (grupoParroquia.recordset[0].id_parroquia !== id_parroquia) {
      throw new Error('GRUPO_PARROQUIA_MISMATCH');
    }
    
    return true;
  }

  /**
   * Calcular edad a partir de fecha de nacimiento
   */
  calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  }

  /**
   * Obtener resumen de inscripciones por periodo
   */
  async getResumenInscripcionesPorPeriodo(filtros = {}) {
    try {
      let whereClause = '';
      let params = {};
      
      if (filtros.id_parroquia) {
        whereClause = ' WHERE i.id_parroquia = @id_parroquia';
        params.id_parroquia = filtros.id_parroquia;
      }
      
      const resumenQuery = `
        SELECT 
          g.periodo,
          COUNT(*) as total_inscripciones,
          COUNT(CASE WHEN i.pago_realizado = 1 THEN 1 END) as inscripciones_pagadas,
          COUNT(CASE WHEN i.pago_realizado = 0 THEN 1 END) as inscripciones_pendientes,
          COUNT(DISTINCT i.id_catequizando) as catequizandos_unicos,
          COUNT(DISTINCT i.id_grupo) as grupos_con_inscripciones
        FROM Catequesis.Inscripcion i
        INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo${whereClause}
        GROUP BY g.periodo
        ORDER BY g.periodo DESC
      `;
      
      const result = await database.executeQuery(resumenQuery, params);
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo resumen de inscripciones por periodo:', error);
      throw new Error('ERROR_FETCHING_RESUMEN_INSCRIPCIONES');
    }
  }

  /**
   * Transferir catequizando entre grupos
   */
  async transferirCatequizando(idInscripcion, nuevoIdGrupo, motivo = '') {
    try {
      // Verificar que la inscripción actual existe
      const inscripcionActual = await this.getInscripcionById(idInscripcion);
      
      // Verificar que el nuevo grupo existe
      const nuevoGrupo = await database.executeStoredProcedure('Catequesis.ObtenerGrupo', {
        id_grupo: nuevoIdGrupo
      });
      
      if (!nuevoGrupo.recordset || nuevoGrupo.recordset.length === 0) {
        throw new Error('GRUPO_NOT_FOUND');
      }
      
      // Verificar que no esté ya inscrito en el nuevo grupo
      const inscripcionExistente = await database.executeQuery(`
        SELECT COUNT(*) as count 
        FROM Catequesis.Inscripcion 
        WHERE id_catequizando = @id_catequizando AND id_grupo = @id_grupo
      `, { 
        id_catequizando: inscripcionActual.id_catequizando, 
        id_grupo: nuevoIdGrupo 
      });
      
      if (inscripcionExistente.recordset[0].count > 0) {
        throw new Error('INSCRIPCION_ALREADY_EXISTS');
      }
      
      // Actualizar la inscripción con el nuevo grupo
      const inscripcionActualizada = await this.updateInscripcion(idInscripcion, {
        id_catequizando: inscripcionActual.id_catequizando,
        id_grupo: nuevoIdGrupo,
        id_parroquia: nuevoGrupo.recordset[0].id_parroquia,
        fecha_inscripcion: inscripcionActual.fecha_inscripcion,
        pago_realizado: inscripcionActual.pago_realizado
      });
      
      // Registrar el motivo de la transferencia si se proporciona
      if (motivo) {
        await database.executeQuery(`
          INSERT INTO Catequesis.LogTransferencias (
            id_inscripcion, 
            grupo_anterior, 
            grupo_nuevo, 
            motivo, 
            fecha_transferencia
          ) VALUES (
            @id_inscripcion, 
            @grupo_anterior, 
            @grupo_nuevo, 
            @motivo, 
            GETDATE()
          )
        `, {
          id_inscripcion: idInscripcion,
          grupo_anterior: inscripcionActual.id_grupo,
          grupo_nuevo: nuevoIdGrupo,
          motivo: motivo
        });
      }
      
      return {
        inscripcion: inscripcionActualizada,
        grupo_anterior: inscripcionActual.nombre_grupo,
        grupo_nuevo: nuevoGrupo.recordset[0].nombre,
        motivo: motivo
      };
    } catch (error) {
      console.error('Error transfiriendo catequizando:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND' ||
          error.message === 'GRUPO_NOT_FOUND' ||
          error.message === 'INSCRIPCION_ALREADY_EXISTS') {
        throw error;
      }
      
      throw new Error('ERROR_TRANSFERRING_CATEQUIZANDO');
    }
  }
}

module.exports = new InscripcionService();