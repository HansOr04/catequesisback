const catequizandoService = require('../services/catequizandoService');
const response = require('../utils/response');

class CatequizandoController {
  /**
   * Obtener todos los catequizandos
   * GET /api/catequizandos
   */
  async getAllCatequizandos(req, res, next) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      
      const result = await catequizandoService.getAllCatequizandos({
        page: parseInt(page),
        limit: parseInt(limit),
        search: search.trim()
      });
      
      response.success(res, result, 'Catequizandos obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getAllCatequizandos:', error);
      
      if (error.message === 'ERROR_FETCHING_CATEQUIZANDOS') {
        return response.serverError(res, 'Error interno obteniendo catequizandos');
      }
      
      next(error);
    }
  }

  /**
   * Obtener catequizando por ID
   * GET /api/catequizandos/:id
   */
  async getCatequizandoById(req, res, next) {
    try {
      const { id } = req.params;
      
      const catequizando = await catequizandoService.getCatequizandoById(parseInt(id));
      
      response.success(res, catequizando, 'Catequizando obtenido exitosamente');
    } catch (error) {
      console.error('Error en getCatequizandoById:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'Catequizando no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_CATEQUIZANDO') {
        return response.serverError(res, 'Error interno obteniendo catequizando');
      }
      
      next(error);
    }
  }

  /**
   * Buscar catequizando por documento de identidad
   * GET /api/catequizandos/documento/:documento
   */
  async getCatequizandoByDocumento(req, res, next) {
    try {
      const { documento } = req.params;
      
      const catequizando = await catequizandoService.getCatequizandoByDocumento(documento);
      
      response.success(res, catequizando, 'Catequizando encontrado exitosamente');
    } catch (error) {
      console.error('Error en getCatequizandoByDocumento:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'No se encontró un catequizando con ese documento');
      }
      
      if (error.message === 'ERROR_SEARCHING_CATEQUIZANDO') {
        return response.serverError(res, 'Error interno buscando catequizando');
      }
      
      next(error);
    }
  }

  /**
   * Crear nuevo catequizando
   * POST /api/catequizandos
   */
  async createCatequizando(req, res, next) {
    try {
      const catequizandoData = req.body;
      
      // Verificar permisos (admin, parroco, secretaria pueden crear)
      if (!['admin', 'parroco', 'secretaria'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para crear catequizandos');
      }
      
      const newCatequizando = await catequizandoService.createCatequizando(catequizandoData);
      
      response.created(res, newCatequizando, 'Catequizando creado exitosamente');
    } catch (error) {
      console.error('Error en createCatequizando:', error);
      
      if (error.message === 'DOCUMENTO_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe un catequizando con este documento de identidad');
      }
      
      if (error.message === 'INVALID_AGE') {
        return response.badRequest(res, 'La edad del catequizando no es válida para catequesis');
      }
      
      if (error.message === 'ERROR_CREATING_CATEQUIZANDO') {
        return response.serverError(res, 'Error interno creando catequizando');
      }
      
      next(error);
    }
  }

  /**
   * Actualizar catequizando
   * PUT /api/catequizandos/:id
   */
  async updateCatequizando(req, res, next) {
    try {
      const { id } = req.params;
      const catequizandoData = req.body;
      
      // Verificar permisos
      if (!['admin', 'parroco', 'secretaria'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para actualizar catequizandos');
      }
      
      const updatedCatequizando = await catequizandoService.updateCatequizando(parseInt(id), catequizandoData);
      
      response.success(res, updatedCatequizando, 'Catequizando actualizado exitosamente');
    } catch (error) {
      console.error('Error en updateCatequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'Catequizando no encontrado');
      }
      
      if (error.message === 'DOCUMENTO_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe otro catequizando con este documento de identidad');
      }
      
      if (error.message === 'INVALID_AGE') {
        return response.badRequest(res, 'La edad del catequizando no es válida para catequesis');
      }
      
      if (error.message === 'ERROR_UPDATING_CATEQUIZANDO') {
        return response.serverError(res, 'Error interno actualizando catequizando');
      }
      
      next(error);
    }
  }

  /**
   * Eliminar catequizando
   * DELETE /api/catequizandos/:id
   */
  async deleteCatequizando(req, res, next) {
    try {
      const { id } = req.params;
      
      // Solo admin puede eliminar catequizandos
      if (req.user.tipo_perfil !== 'admin') {
        return response.forbidden(res, 'Solo los administradores pueden eliminar catequizandos');
      }
      
      const deletedCatequizando = await catequizandoService.deleteCatequizando(parseInt(id));
      
      response.success(res, deletedCatequizando, 'Catequizando eliminado exitosamente');
    } catch (error) {
      console.error('Error en deleteCatequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'Catequizando no encontrado');
      }
      
      if (error.message === 'CATEQUIZANDO_HAS_DEPENDENCIES') {
        return response.conflict(res, 'No se puede eliminar el catequizando porque tiene inscripciones, certificados o sacramentos asociados');
      }
      
      if (error.message === 'ERROR_DELETING_CATEQUIZANDO') {
        return response.serverError(res, 'Error interno eliminando catequizando');
      }
      
      next(error);
    }
  }

  /**
   * Obtener historial de inscripciones de un catequizando
   * GET /api/catequizandos/:id/inscripciones
   */
  async getCatequizandoInscripciones(req, res, next) {
    try {
      const { id } = req.params;
      
      const inscripciones = await catequizandoService.getCatequizandoInscripciones(parseInt(id));
      
      response.success(res, inscripciones, 'Historial de inscripciones obtenido exitosamente');
    } catch (error) {
      console.error('Error en getCatequizandoInscripciones:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'Catequizando no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_INSCRIPCIONES') {
        return response.serverError(res, 'Error interno obteniendo inscripciones');
      }
      
      next(error);
    }
  }

  /**
   * Obtener certificados de un catequizando
   * GET /api/catequizandos/:id/certificados
   */
  async getCatequizandoCertificados(req, res, next) {
    try {
      const { id } = req.params;
      
      const certificados = await catequizandoService.getCatequizandoCertificados(parseInt(id));
      
      response.success(res, certificados, 'Certificados obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getCatequizandoCertificados:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'Catequizando no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_CERTIFICADOS') {
        return response.serverError(res, 'Error interno obteniendo certificados');
      }
      
      next(error);
    }
  }

  /**
   * Obtener sacramentos recibidos por un catequizando
   * GET /api/catequizandos/:id/sacramentos
   */
  async getCatequizandoSacramentos(req, res, next) {
    try {
      const { id } = req.params;
      
      const sacramentos = await catequizandoService.getCatequizandoSacramentos(parseInt(id));
      
      response.success(res, sacramentos, 'Sacramentos obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getCatequizandoSacramentos:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'Catequizando no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_SACRAMENTOS') {
        return response.serverError(res, 'Error interno obteniendo sacramentos');
      }
      
      next(error);
    }
  }

  /**
   * Obtener representantes de un catequizando
   * GET /api/catequizandos/:id/representantes
   */
  async getCatequizandoRepresentantes(req, res, next) {
    try {
      const { id } = req.params;
      
      const representantes = await catequizandoService.getCatequizandoRepresentantes(parseInt(id));
      
      response.success(res, representantes, 'Representantes obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getCatequizandoRepresentantes:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'Catequizando no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_REPRESENTANTES') {
        return response.serverError(res, 'Error interno obteniendo representantes');
      }
      
      next(error);
    }
  }

  /**
   * Obtener padrinos de un catequizando
   * GET /api/catequizandos/:id/padrinos
   */
  async getCatequizandoPadrinos(req, res, next) {
    try {
      const { id } = req.params;
      
      const padrinos = await catequizandoService.getCatequizandoPadrinos(parseInt(id));
      
      response.success(res, padrinos, 'Padrinos obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getCatequizandoPadrinos:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'Catequizando no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_PADRINOS') {
        return response.serverError(res, 'Error interno obteniendo padrinos');
      }
      
      next(error);
    }
  }

  /**
   * Obtener datos de bautismo de un catequizando
   * GET /api/catequizandos/:id/bautismo
   */
  async getCatequizandoBautismo(req, res, next) {
    try {
      const { id } = req.params;
      
      const bautismo = await catequizandoService.getCatequizandoBautismo(parseInt(id));
      
      response.success(res, bautismo, 'Datos de bautismo obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getCatequizandoBautismo:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'Catequizando no encontrado');
      }
      
      if (error.message === 'BAUTISMO_NOT_FOUND') {
        return response.notFound(res, 'No se encontraron datos de bautismo para este catequizando');
      }
      
      if (error.message === 'ERROR_FETCHING_BAUTISMO') {
        return response.serverError(res, 'Error interno obteniendo datos de bautismo');
      }
      
      next(error);
    }
  }

  /**
   * Buscar catequizandos
   * GET /api/catequizandos/search?q=termino
   */
  async searchCatequizandos(req, res, next) {
    try {
      const { q, tipo = 'todos' } = req.query;
      
      if (!q || q.trim().length < 2) {
        return response.badRequest(res, 'El término de búsqueda debe tener al menos 2 caracteres');
      }
      
      const catequizandos = await catequizandoService.searchCatequizandos(q.trim(), tipo);
      
      response.success(res, catequizandos, `Se encontraron ${catequizandos.length} catequizandos`);
    } catch (error) {
      console.error('Error en searchCatequizandos:', error);
      
      if (error.message === 'ERROR_SEARCHING_CATEQUIZANDOS') {
        return response.serverError(res, 'Error interno buscando catequizandos');
      }
      
      next(error);
    }
  }

  /**
   * Obtener estadísticas de catequizandos
   * GET /api/catequizandos/stats
   */
  async getCatequizandosStats(req, res, next) {
    try {
      // Filtrar por parroquia si no es admin
      const filtros = {};
      if (req.user.tipo_perfil !== 'admin' && req.user.id_parroquia) {
        filtros.id_parroquia = req.user.id_parroquia;
      }
      
      const stats = await catequizandoService.getCatequizandosStats(filtros);
      
      response.success(res, stats, 'Estadísticas obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getCatequizandosStats:', error);
      
      if (error.message === 'ERROR_FETCHING_STATS') {
        return response.serverError(res, 'Error interno obteniendo estadísticas');
      }
      
      next(error);
    }
  }

  /**
   * Validar elegibilidad para inscripción
   * POST /api/catequizandos/:id/validar-inscripcion
   */
  async validarInscripcion(req, res, next) {
    try {
      const { id } = req.params;
      const { id_nivel } = req.body;
      
      const validacion = await catequizandoService.validarElegibilidadInscripcion(parseInt(id), parseInt(id_nivel));
      
      if (validacion.elegible) {
        response.success(res, validacion, 'Catequizando elegible para inscripción');
      } else {
        response.badRequest(res, 'Catequizando no elegible para inscripción', validacion);
      }
    } catch (error) {
      console.error('Error en validarInscripcion:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'Catequizando no encontrado');
      }
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        return response.notFound(res, 'Nivel no encontrado');
      }
      
      if (error.message === 'ERROR_VALIDATING_INSCRIPTION') {
        return response.serverError(res, 'Error interno validando inscripción');
      }
      
      next(error);
    }
  }
}

module.exports = new CatequizandoController();