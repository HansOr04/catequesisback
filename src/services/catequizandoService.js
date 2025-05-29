const database = require('../config/database');

class CatequizandoService {
  /**
   * Obtener todos los catequizandos con paginación y búsqueda
   */
  async getAllCatequizandos(options = {}) {
    try {
      const { page = 1, limit = 10, search = '' } = options;
      const offset = (page - 1) * limit;
      
      // Usar el stored procedure simplificado
      const result = await database.executeStoredProcedure('Catequesis.ObtenerTodosCatequizandosPaginado', {
        offset: offset,
        limit: limit,
        search: search
      });
      
      // El SP devuelve dos resultsets: datos y total
      const catequizandos = result.recordsets[0] || [];
      const totalResult = result.recordsets[1] || [{ total: 0 }];
      const total = totalResult[0]?.total || 0;
      
      return {
        catequizandos: catequizandos,
        pagination: {
          current_page: page,
          per_page: limit,
          total: total,
          total_pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error obteniendo catequizandos:', error);
      
      // Fallback: usar query simple si el SP falla
      try {
        const simpleQuery = `
          SELECT TOP ${limit}
            id_catequizando, 
            nombres, 
            apellidos, 
            fecha_nacimiento, 
            documento_identidad, 
            caso_especial,
            DATEDIFF(YEAR, fecha_nacimiento, GETDATE()) AS edad
          FROM Catequesis.Catequizando
          ORDER BY apellidos, nombres
        `;
        
        const fallbackResult = await database.executeQuery(simpleQuery);
        
        return {
          catequizandos: fallbackResult.recordset || [],
          pagination: {
            current_page: page,
            per_page: limit,
            total: fallbackResult.recordset?.length || 0,
            total_pages: 1
          }
        };
      } catch (fallbackError) {
        console.error('Error en fallback query:', fallbackError);
        throw new Error('ERROR_FETCHING_CATEQUIZANDOS');
      }
    }
  }

  /**
   * Obtener catequizando por ID
   */
  async getCatequizandoById(id) {
    try {
      const result = await database.executeStoredProcedure('Catequesis.ObtenerCatequizando', { 
        id_catequizando: id 
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('CATEQUIZANDO_NOT_FOUND');
      }
      
      const catequizando = result.recordset[0];
      
      // Calcular edad
      catequizando.edad = this.calcularEdad(catequizando.fecha_nacimiento);
      
      return catequizando;
    } catch (error) {
      console.error('Error obteniendo catequizando por ID:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_CATEQUIZANDO');
    }
  }

  /**
   * Buscar catequizando por documento de identidad
   */
  async getCatequizandoByDocumento(documento) {
    try {
      const result = await database.executeStoredProcedure('Catequesis.BuscarCatequizandoPorDocumento', { 
        documento_identidad: documento 
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('CATEQUIZANDO_NOT_FOUND');
      }
      
      const catequizando = result.recordset[0];
      catequizando.edad = this.calcularEdad(catequizando.fecha_nacimiento);
      
      return catequizando;
    } catch (error) {
      console.error('Error buscando catequizando por documento:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_SEARCHING_CATEQUIZANDO');
    }
  }

  /**
   * Crear nuevo catequizando
   */
  async createCatequizando(catequizandoData) {
    try {
      const { nombres, apellidos, fecha_nacimiento, documento_identidad, caso_especial = false } = catequizandoData;
      
      // Validaciones de negocio
      await this.validateCatequizandoData({ nombres, apellidos, fecha_nacimiento, documento_identidad });
      
      const result = await database.executeStoredProcedure('Catequesis.CrearCatequizando', {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        fecha_nacimiento,
        documento_identidad: documento_identidad.trim(),
        caso_especial
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('ERROR_CREATING_CATEQUIZANDO');
      }
      
      // Obtener el catequizando completo creado
      const catequizandoId = result.recordset[0].id_catequizando;
      return await this.getCatequizandoById(catequizandoId);
    } catch (error) {
      console.error('Error creando catequizando:', error);
      
      if (error.message.includes('mismo documento de identidad')) {
        throw new Error('DOCUMENTO_ALREADY_EXISTS');
      }
      
      if (error.message === 'INVALID_AGE') {
        throw error;
      }
      
      throw new Error('ERROR_CREATING_CATEQUIZANDO');
    }
  }

  /**
   * Actualizar catequizando
   */
  async updateCatequizando(id, catequizandoData) {
    try {
      const { nombres, apellidos, fecha_nacimiento, documento_identidad, caso_especial } = catequizandoData;
      
      // Verificar que el catequizando existe
      await this.getCatequizandoById(id);
      
      // Validaciones de negocio
      await this.validateCatequizandoData({ nombres, apellidos, fecha_nacimiento, documento_identidad }, id);
      
      const result = await database.executeStoredProcedure('Catequesis.ActualizarCatequizando', {
        id_catequizando: id,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        fecha_nacimiento,
        documento_identidad: documento_identidad.trim(),
        caso_especial
      });
      
      // Obtener el catequizando actualizado
      return await this.getCatequizandoById(id);
    } catch (error) {
      console.error('Error actualizando catequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        throw error;
      }
      
      if (error.message.includes('mismo documento de identidad')) {
        throw new Error('DOCUMENTO_ALREADY_EXISTS');
      }
      
      if (error.message === 'INVALID_AGE') {
        throw error;
      }
      
      throw new Error('ERROR_UPDATING_CATEQUIZANDO');
    }
  }

  /**
   * Eliminar catequizando
   */
  async deleteCatequizando(id) {
    try {
      // Verificar que el catequizando existe
      const catequizando = await this.getCatequizandoById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.EliminarCatequizando', {
        id_catequizando: id
      });
      
      return catequizando;
    } catch (error) {
      console.error('Error eliminando catequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        throw error;
      }
      
      if (error.message.includes('registros relacionados')) {
        throw new Error('CATEQUIZANDO_HAS_DEPENDENCIES');
      }
      
      throw new Error('ERROR_DELETING_CATEQUIZANDO');
    }
  }

  /**
   * Obtener inscripciones de un catequizando
   */
  async getCatequizandoInscripciones(id) {
    try {
      // Verificar que el catequizando existe
      await this.getCatequizandoById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerInscripcionesPorCatequizando', {
        id_catequizando: id
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo inscripciones del catequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_INSCRIPCIONES');
    }
  }

  /**
   * Obtener certificados de un catequizando
   */
  async getCatequizandoCertificados(id) {
    try {
      // Verificar que el catequizando existe
      await this.getCatequizandoById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerCertificadosPorCatequizando', {
        id_catequizando: id
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo certificados del catequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_CERTIFICADOS');
    }
  }

  /**
   * Obtener sacramentos de un catequizando
   */
  async getCatequizandoSacramentos(id) {
    try {
      // Verificar que el catequizando existe
      await this.getCatequizandoById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerSacramentosPorCatequizando', {
        id_catequizando: id
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo sacramentos del catequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_SACRAMENTOS');
    }
  }

  /**
   * Obtener representantes de un catequizando
   */
  async getCatequizandoRepresentantes(id) {
    try {
      // Verificar que el catequizando existe
      await this.getCatequizandoById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerRepresentantesPorCatequizando', {
        id_catequizando: id
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo representantes del catequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_REPRESENTANTES');
    }
  }

  /**
   * Obtener padrinos de un catequizando
   */
  async getCatequizandoPadrinos(id) {
    try {
      // Verificar que el catequizando existe
      await this.getCatequizandoById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerPadrinosPorCatequizando', {
        id_catequizando: id
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error obteniendo padrinos del catequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_PADRINOS');
    }
  }

  /**
   * Obtener datos de bautismo de un catequizando
   */
  async getCatequizandoBautismo(id) {
    try {
      // Verificar que el catequizando existe
      await this.getCatequizandoById(id);
      
      const result = await database.executeStoredProcedure('Catequesis.ObtenerDatosBautismoPorCatequizando', {
        id_catequizando: id
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('BAUTISMO_NOT_FOUND');
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo datos de bautismo del catequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND' || error.message === 'BAUTISMO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_BAUTISMO');
    }
  }

  /**
   * Buscar catequizandos por diferentes criterios
   */
  async searchCatequizandos(searchTerm, tipo = 'todos') {
    try {
      let query = `
        SELECT 
          c.id_catequizando, 
          c.nombres, 
          c.apellidos, 
          c.fecha_nacimiento, 
          c.documento_identidad, 
          c.caso_especial,
          DATEDIFF(YEAR, c.fecha_nacimiento, GETDATE()) AS edad,
          (SELECT COUNT(*) FROM Catequesis.Inscripcion i WHERE i.id_catequizando = c.id_catequizando) AS total_inscripciones
        FROM Catequesis.Catequizando c
        WHERE 1=1
      `;
      
      let params = { searchTerm: `%${searchTerm}%` };
      
      // Filtros por tipo
      switch (tipo) {
        case 'activos':
          query += ` AND EXISTS (
            SELECT 1 FROM Catequesis.Inscripcion i 
            INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo
            WHERE i.id_catequizando = c.id_catequizando 
            AND g.periodo = YEAR(GETDATE())
          )`;
          break;
        case 'sin_inscripcion':
          query += ` AND NOT EXISTS (
            SELECT 1 FROM Catequesis.Inscripcion i 
            WHERE i.id_catequizando = c.id_catequizando
          )`;
          break;
        case 'casos_especiales':
          query += ` AND c.caso_especial = 1`;
          break;
        // 'todos' no necesita filtro adicional
      }
      
      query += ` AND (c.nombres LIKE @searchTerm OR c.apellidos LIKE @searchTerm OR c.documento_identidad LIKE @searchTerm)
                 ORDER BY c.apellidos, c.nombres`;
      
      const result = await database.executeQuery(query, params);
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error buscando catequizandos:', error);
      throw new Error('ERROR_SEARCHING_CATEQUIZANDOS');
    }
  }

  /**
   * Obtener estadísticas de catequizandos
   */
  async getCatequizandosStats(filtros = {}) {
    try {
      let whereClause = '';
      let params = {};
      
      if (filtros.id_parroquia) {
        whereClause = ` AND EXISTS (
          SELECT 1 FROM Catequesis.Inscripcion i 
          WHERE i.id_catequizando = c.id_catequizando 
          AND i.id_parroquia = @id_parroquia
        )`;
        params.id_parroquia = filtros.id_parroquia;
      }
      
      const statsQuery = `
        SELECT 
          COUNT(*) AS total_catequizandos,
          COUNT(CASE WHEN c.caso_especial = 1 THEN 1 END) AS casos_especiales,
          COUNT(CASE WHEN DATEDIFF(YEAR, c.fecha_nacimiento, GETDATE()) BETWEEN 6 AND 12 THEN 1 END) AS ninos,
          COUNT(CASE WHEN DATEDIFF(YEAR, c.fecha_nacimiento, GETDATE()) BETWEEN 13 AND 17 THEN 1 END) AS adolescentes,
          COUNT(CASE WHEN DATEDIFF(YEAR, c.fecha_nacimiento, GETDATE()) >= 18 THEN 1 END) AS adultos,
          COUNT(CASE WHEN EXISTS (
            SELECT 1 FROM Catequesis.Inscripcion i 
            INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo
            WHERE i.id_catequizando = c.id_catequizando 
            AND g.periodo = YEAR(GETDATE())
          ) THEN 1 END) AS activos_este_ano,
          COUNT(CASE WHEN NOT EXISTS (
            SELECT 1 FROM Catequesis.Inscripcion i 
            WHERE i.id_catequizando = c.id_catequizando
          ) THEN 1 END) AS sin_inscripciones
        FROM Catequesis.Catequizando c
        WHERE 1=1 ${whereClause}
      `;
      
      const result = await database.executeQuery(statsQuery, params);
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo estadísticas de catequizandos:', error);
      throw new Error('ERROR_FETCHING_STATS');
    }
  }

  /**
   * Validar elegibilidad para inscripción
   */
  async validarElegibilidadInscripcion(idCatequizando, idNivel) {
    try {
      // Verificar que el catequizando existe
      const catequizando = await this.getCatequizandoById(idCatequizando);
      
      // Verificar que el nivel existe
      const nivelResult = await database.executeStoredProcedure('Catequesis.ObtenerNivel', {
        id_nivel: idNivel
      });
      
      if (!nivelResult.recordset || nivelResult.recordset.length === 0) {
        throw new Error('NIVEL_NOT_FOUND');
      }
      
      const nivel = nivelResult.recordset[0];
      const validacion = {
        elegible: true,
        motivos: [],
        requisitos_cumplidos: [],
        requisitos_pendientes: []
      };
      
      // Validar edad mínima (6 años para catequesis)
      const edad = this.calcularEdad(catequizando.fecha_nacimiento);
      if (edad < 6 && !catequizando.caso_especial) {
        validacion.elegible = false;
        validacion.motivos.push('Edad mínima requerida: 6 años');
      } else {
        validacion.requisitos_cumplidos.push('Edad apropiada para catequesis');
      }
      
      // Verificar si ya está inscrito en un grupo del mismo nivel en el año actual
      const inscripcionActivaQuery = `
        SELECT COUNT(*) as count
        FROM Catequesis.Inscripcion i
        INNER JOIN Catequesis.Grupo g ON i.id_grupo = g.id_grupo
        WHERE i.id_catequizando = @id_catequizando
        AND g.id_nivel = @id_nivel
        AND g.periodo = YEAR(GETDATE())
      `;
      
      const inscripcionActiva = await database.executeQuery(inscripcionActivaQuery, {
        id_catequizando: idCatequizando,
        id_nivel: idNivel
      });
      
      if (inscripcionActiva.recordset[0].count > 0) {
        validacion.elegible = false;
        validacion.motivos.push('Ya está inscrito en este nivel en el año actual');
      } else {
        validacion.requisitos_cumplidos.push('No tiene inscripción activa en este nivel');
      }
      
      // Verificar niveles previos completados (para niveles superiores)
      if (nivel.orden > 1) {
        const nivelesCompletadosQuery = `
          SELECT COUNT(*) as count
          FROM Catequesis.Certificado cert
          INNER JOIN Catequesis.Nivel n ON cert.id_nivel = n.id_nivel
          WHERE cert.id_catequizando = @id_catequizando
          AND cert.aprobado = 1
          AND n.orden < @orden
        `;
        
        const nivelesCompletados = await database.executeQuery(nivelesCompletadosQuery, {
          id_catequizando: idCatequizando,
          orden: nivel.orden
        });
        
        const nivelesRequeridos = nivel.orden - 1;
        if (nivelesCompletados.recordset[0].count < nivelesRequeridos) {
          validacion.elegible = false;
          validacion.motivos.push(`Debe completar los niveles anteriores (${nivelesCompletados.recordset[0].count}/${nivelesRequeridos} completados)`);
        } else {
          validacion.requisitos_cumplidos.push('Niveles previos completados');
        }
      }
      
      // Verificar datos de bautismo para ciertos niveles
      if (nivel.orden >= 2) {
        try {
          await this.getCatequizandoBautismo(idCatequizando);
          validacion.requisitos_cumplidos.push('Datos de bautismo registrados');
        } catch (error) {
          if (error.message === 'BAUTISMO_NOT_FOUND') {
            validacion.requisitos_pendientes.push('Registrar datos de bautismo');
          }
        }
      }
      
      // Verificar representantes para menores de edad
      if (edad < 18) {
        const representantes = await this.getCatequizandoRepresentantes(idCatequizando);
        if (representantes.length === 0) {
          validacion.requisitos_pendientes.push('Registrar al menos un representante legal');
        } else {
          validacion.requisitos_cumplidos.push('Representante legal registrado');
        }
      }
      
      return validacion;
    } catch (error) {
      console.error('Error validando elegibilidad para inscripción:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND' || error.message === 'NIVEL_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_VALIDATING_INSCRIPTION');
    }
  }

  /**
   * Validar datos del catequizando
   */
  async validateCatequizandoData(data, excludeId = null) {
    const { nombres, apellidos, fecha_nacimiento, documento_identidad } = data;
    
    // Validar que los nombres no estén vacíos
    if (!nombres || nombres.trim().length < 2) {
      throw new Error('Los nombres deben tener al menos 2 caracteres');
    }
    
    if (!apellidos || apellidos.trim().length < 2) {
      throw new Error('Los apellidos deben tener al menos 2 caracteres');
    }
    
    // Validar documento de identidad
    if (!documento_identidad || documento_identidad.trim().length < 6) {
      throw new Error('El documento de identidad debe tener al menos 6 caracteres');
    }
    
    // Validar fecha de nacimiento
    const fechaNacimiento = new Date(fecha_nacimiento);
    const hoy = new Date();
    const edad = this.calcularEdad(fecha_nacimiento);
    
    if (fechaNacimiento >= hoy) {
      throw new Error('La fecha de nacimiento no puede ser futura');
    }
    
    if (edad > 100) {
      throw new Error('La edad no puede ser mayor a 100 años');
    }
    
    // Validar edad mínima para catequesis (con excepciones)
    if (edad < 4) {
      throw new Error('INVALID_AGE');
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
}

module.exports = new CatequizandoService();