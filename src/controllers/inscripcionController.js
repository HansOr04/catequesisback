const inscripcionService = require('../services/inscripcionService');
const response = require('../utils/response');

class InscripcionController {
  /**
   * Obtener todas las inscripciones
   * GET /api/inscripciones
   */
  async getAllInscripciones(req, res, next) {
    try {
      const { parroquia, grupo, catequizando, periodo, pago, page = 1, limit = 10 } = req.query;
      
      // Filtrar por parroquia si no es admin
      let filtros = {
        page: parseInt(page),
        limit: parseInt(limit)
      };
      
      if (req.user.tipo_perfil !== 'admin' && req.user.id_parroquia) {
        filtros.id_parroquia = req.user.id_parroquia;
      } else if (parroquia) {
        filtros.id_parroquia = parseInt(parroquia);
      }
      
      if (grupo) filtros.id_grupo = parseInt(grupo);
      if (catequizando) filtros.id_catequizando = parseInt(catequizando);
      if (periodo) filtros.periodo = periodo;
      if (pago !== undefined) filtros.pago_realizado = pago === 'true';
      
      const result = await inscripcionService.getAllInscripciones(filtros);
      
      response.success(res, result, 'Inscripciones obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getAllInscripciones:', error);
      
      if (error.message === 'ERROR_FETCHING_INSCRIPCIONES') {
        return response.serverError(res, 'Error interno obteniendo inscripciones');
      }
      
      next(error);
    }
  }

  /**
   * Obtener inscripción por ID
   * GET /api/inscripciones/:id
   */
  async getInscripcionById(req, res, next) {
    try {
      const { id } = req.params;
      
      const inscripcion = await inscripcionService.getInscripcionById(parseInt(id));
      
      // Verificar permisos: admin puede ver cualquier inscripción, otros solo de su parroquia
      if (req.user.tipo_perfil !== 'admin' && 
          inscripcion.id_parroquia !== req.user.id_parroquia) {
        return response.forbidden(res, 'No tienes permisos para ver esta inscripción');
      }
      
      response.success(res, inscripcion, 'Inscripción obtenida exitosamente');
    } catch (error) {
      console.error('Error en getInscripcionById:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND') {
        return response.notFound(res, 'Inscripción no encontrada');
      }
      
      if (error.message === 'ERROR_FETCHING_INSCRIPCION') {
        return response.serverError(res, 'Error interno obteniendo inscripción');
      }
      
      next(error);
    }
  }

  /**
   * Crear nueva inscripción
   * POST /api/inscripciones
   */
  async createInscripcion(req, res, next) {
    try {
      const inscripcionData = req.body;
      
      // Verificar permisos
      if (!['admin', 'parroco', 'secretaria'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para crear inscripciones');
      }
      
      // Si no es admin, solo puede crear inscripciones en su parroquia
      if (req.user.tipo_perfil !== 'admin') {
        inscripcionData.id_parroquia = req.user.id_parroquia;
      }
      
      const newInscripcion = await inscripcionService.createInscripcion(inscripcionData);
      
      response.created(res, newInscripcion, 'Inscripción creada exitosamente');
    } catch (error) {
      console.error('Error en createInscripcion:', error);
      
      if (error.message === 'INSCRIPCION_ALREADY_EXISTS') {
        return response.conflict(res, 'El catequizando ya está inscrito en este grupo');
      }
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.badRequest(res, 'El catequizando especificado no existe');
      }
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.badRequest(res, 'El grupo especificado no existe');
      }
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.badRequest(res, 'La parroquia especificada no existe');
      }
      
      if (error.message === 'GRUPO_PARROQUIA_MISMATCH') {
        return response.badRequest(res, 'El grupo no pertenece a la parroquia especificada');
      }
      
      if (error.message === 'ERROR_CREATING_INSCRIPCION') {
        return response.serverError(res, 'Error interno creando inscripción');
      }
      
      next(error);
    }
  }

  /**
   * Actualizar inscripción
   * PUT /api/inscripciones/:id
   */
  async updateInscripcion(req, res, next) {
    try {
      const { id } = req.params;
      const inscripcionData = req.body;
      
      // Verificar permisos
      if (!['admin', 'parroco', 'secretaria'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para actualizar inscripciones');
      }
      
      // Verificar que puede actualizar esta inscripción
      const inscripcionExistente = await inscripcionService.getInscripcionById(parseInt(id));
      if (req.user.tipo_perfil !== 'admin' && 
          inscripcionExistente.id_parroquia !== req.user.id_parroquia) {
        return response.forbidden(res, 'Solo puedes actualizar inscripciones de tu parroquia');
      }
      
      const updatedInscripcion = await inscripcionService.updateInscripcion(parseInt(id), inscripcionData);
      
      response.success(res, updatedInscripcion, 'Inscripción actualizada exitosamente');
    } catch (error) {
      console.error('Error en updateInscripcion:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND') {
        return response.notFound(res, 'Inscripción no encontrada');
      }
      
      if (error.message === 'INSCRIPCION_ALREADY_EXISTS') {
        return response.conflict(res, 'El catequizando ya está inscrito en este grupo en otra inscripción');
      }
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.badRequest(res, 'El catequizando especificado no existe');
      }
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.badRequest(res, 'El grupo especificado no existe');
      }
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.badRequest(res, 'La parroquia especificada no existe');
      }
      
      if (error.message === 'ERROR_UPDATING_INSCRIPCION') {
        return response.serverError(res, 'Error interno actualizando inscripción');
      }
      
      next(error);
    }
  }

  /**
   * Eliminar inscripción
   * DELETE /api/inscripciones/:id
   */
  async deleteInscripcion(req, res, next) {
    try {
      const { id } = req.params;
      
      // Verificar permisos
      if (!['admin', 'parroco'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'Solo administradores y párrocos pueden eliminar inscripciones');
      }
      
      // Verificar que puede eliminar esta inscripción
      const inscripcionExistente = await inscripcionService.getInscripcionById(parseInt(id));
      if (req.user.tipo_perfil !== 'admin' && 
          inscripcionExistente.id_parroquia !== req.user.id_parroquia) {
        return response.forbidden(res, 'Solo puedes eliminar inscripciones de tu parroquia');
      }
      
      const deletedInscripcion = await inscripcionService.deleteInscripcion(parseInt(id));
      
      response.success(res, deletedInscripcion, 'Inscripción eliminada exitosamente');
    } catch (error) {
      console.error('Error en deleteInscripcion:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND') {
        return response.notFound(res, 'Inscripción no encontrada');
      }
      
      if (error.message === 'INSCRIPCION_HAS_DEPENDENCIES') {
        return response.conflict(res, 'No se puede eliminar la inscripción porque tiene asistencias o pagos asociados');
      }
      
      if (error.message === 'ERROR_DELETING_INSCRIPCION') {
        return response.serverError(res, 'Error interno eliminando inscripción');
      }
      
      next(error);
    }
  }

  /**
   * Actualizar estado de pago
   * PUT /api/inscripciones/:id/pago
   */
  async updatePagoInscripcion(req, res, next) {
    try {
      const { id } = req.params;
      const { pago_realizado } = req.body;
      
      // Verificar permisos
      if (!['admin', 'parroco', 'secretaria'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para actualizar pagos');
      }
      
      // Verificar que puede actualizar esta inscripción
      const inscripcionExistente = await inscripcionService.getInscripcionById(parseInt(id));
      if (req.user.tipo_perfil !== 'admin' && 
          inscripcionExistente.id_parroquia !== req.user.id_parroquia) {
        return response.forbidden(res, 'Solo puedes actualizar pagos de tu parroquia');
      }
      
      const updatedInscripcion = await inscripcionService.updatePagoInscripcion(parseInt(id), pago_realizado);
      
      const mensaje = pago_realizado ? 'Pago registrado exitosamente' : 'Pago marcado como pendiente';
      response.success(res, updatedInscripcion, mensaje);
    } catch (error) {
      console.error('Error en updatePagoInscripcion:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND') {
        return response.notFound(res, 'Inscripción no encontrada');
      }
      
      if (error.message === 'ERROR_UPDATING_PAGO') {
        return response.serverError(res, 'Error interno actualizando pago');
      }
      
      next(error);
    }
  }

  /**
   * Obtener inscripciones por catequizando
   * GET /api/inscripciones/catequizando/:idCatequizando
   */
  async getInscripcionesByIdCatequizando(req, res, next) {
    try {
      const { idCatequizando } = req.params;
      
      const inscripciones = await inscripcionService.getInscripcionesByCatequizando(parseInt(idCatequizando));
      
      // Filtrar por parroquia si no es admin
      let inscripcionesFiltradas = inscripciones;
      if (req.user.tipo_perfil !== 'admin') {
        inscripcionesFiltradas = inscripciones.filter(i => i.id_parroquia === req.user.id_parroquia);
      }
      
      response.success(res, inscripcionesFiltradas, 'Inscripciones obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getInscripcionesByIdCatequizando:', error);
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.notFound(res, 'Catequizando no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_INSCRIPCIONES_BY_CATEQUIZANDO') {
        return response.serverError(res, 'Error interno obteniendo inscripciones por catequizando');
      }
      
      next(error);
    }
  }

  /**
   * Obtener inscripciones por grupo
   * GET /api/inscripciones/grupo/:idGrupo
   */
  async getInscripcionesByIdGrupo(req, res, next) {
    try {
      const { idGrupo } = req.params;
      
      const inscripciones = await inscripcionService.getInscripcionesByGrupo(parseInt(idGrupo));
      
      // Verificar permisos para ver este grupo
      if (inscripciones.length > 0) {
        const primeraInscripcion = inscripciones[0];
        if (req.user.tipo_perfil !== 'admin' && 
            primeraInscripcion.id_parroquia !== req.user.id_parroquia) {
          return response.forbidden(res, 'No tienes permisos para ver las inscripciones de este grupo');
        }
      }
      
      response.success(res, inscripciones, 'Inscripciones obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getInscripcionesByIdGrupo:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.notFound(res, 'Grupo no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_INSCRIPCIONES_BY_GRUPO') {
        return response.serverError(res, 'Error interno obteniendo inscripciones por grupo');
      }
      
      next(error);
    }
  }

  /**
   * Obtener estadísticas de inscripciones
   * GET /api/inscripciones/stats
   */
  async getInscripcionesStats(req, res, next) {
    try {
      // Filtrar por parroquia si no es admin
      let filtros = {};
      if (req.user.tipo_perfil !== 'admin' && req.user.id_parroquia) {
        filtros.id_parroquia = req.user.id_parroquia;
      }
      
      const stats = await inscripcionService.getInscripcionesStats(filtros);
      
      response.success(res, stats, 'Estadísticas obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getInscripcionesStats:', error);
      
      if (error.message === 'ERROR_FETCHING_STATS') {
        return response.serverError(res, 'Error interno obteniendo estadísticas');
      }
      
      next(error);
    }
  }

  /**
   * Buscar inscripciones
   * GET /api/inscripciones/search?q=termino
   */
  async searchInscripciones(req, res, next) {
    try {
      const { q, grupo, periodo, pago } = req.query;
      
      if (!q || q.trim().length < 2) {
        return response.badRequest(res, 'El término de búsqueda debe tener al menos 2 caracteres');
      }
      
      let filtros = { search: q.trim() };
      
      // Filtrar por parroquia si no es admin
      if (req.user.tipo_perfil !== 'admin') {
        filtros.id_parroquia = req.user.id_parroquia;
      }
      
      if (grupo) filtros.id_grupo = parseInt(grupo);
      if (periodo) filtros.periodo = periodo;
      if (pago !== undefined) filtros.pago_realizado = pago === 'true';
      
      const inscripciones = await inscripcionService.searchInscripciones(filtros);
      
      response.success(res, inscripciones, `Se encontraron ${inscripciones.length} inscripciones`);
    } catch (error) {
      console.error('Error en searchInscripciones:', error);
      
      if (error.message === 'ERROR_SEARCHING_INSCRIPCIONES') {
        return response.serverError(res, 'Error interno buscando inscripciones');
      }
      
      next(error);
    }
  }

  /**
   * Obtener inscripciones pendientes de pago
   * GET /api/inscripciones/pendientes-pago
   */
  async getInscripcionesPendientesPago(req, res, next) {
    try {
      const { parroquia, grupo } = req.query;
      
      let filtros = { pago_realizado: false };
      
      // Filtrar por parroquia si no es admin
      if (req.user.tipo_perfil !== 'admin') {
        filtros.id_parroquia = req.user.id_parroquia;
      } else if (parroquia) {
        filtros.id_parroquia = parseInt(parroquia);
      }
      
      if (grupo) filtros.id_grupo = parseInt(grupo);
      
      const inscripcionesPendientes = await inscripcionService.getInscripcionesPendientesPago(filtros);
      
      response.success(res, inscripcionesPendientes, 'Inscripciones pendientes de pago obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getInscripcionesPendientesPago:', error);
      
      if (error.message === 'ERROR_FETCHING_PENDIENTES_PAGO') {
        return response.serverError(res, 'Error interno obteniendo inscripciones pendientes de pago');
      }
      
      next(error);
    }
  }

  /**
   * Inscribir catequizando con validaciones completas
   * POST /api/inscripciones/inscribir
   */
  async inscribirCatequizando(req, res, next) {
    try {
      const { 
        id_catequizando, 
        id_grupo, 
        validar_requisitos = true,
        observaciones = '' 
      } = req.body;
      
      // Verificar permisos
      if (!['admin', 'parroco', 'secretaria'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para inscribir catequizandos');
      }
      
      const inscripcionData = {
        id_catequizando,
        id_grupo,
        id_parroquia: req.user.tipo_perfil === 'admin' ? undefined : req.user.id_parroquia,
        fecha_inscripcion: new Date(),
        pago_realizado: false,
        observaciones
      };
      
      const result = await inscripcionService.inscribirCatequizandoConValidaciones(
        inscripcionData, 
        validar_requisitos
      );
      
      if (result.warnings && result.warnings.length > 0) {
        return response.success(res, result, 'Inscripción creada con advertencias');
      }
      
      response.created(res, result.inscripcion, 'Catequizando inscrito exitosamente');
    } catch (error) {
      console.error('Error en inscribirCatequizando:', error);
      
      if (error.message === 'REQUISITOS_NO_CUMPLIDOS') {
        return response.badRequest(res, 'El catequizando no cumple los requisitos para inscribirse', error.details);
      }
      
      if (error.message === 'INSCRIPCION_ALREADY_EXISTS') {
        return response.conflict(res, 'El catequizando ya está inscrito en este grupo');
      }
      
      if (error.message === 'CATEQUIZANDO_NOT_FOUND') {
        return response.badRequest(res, 'El catequizando especificado no existe');
      }
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.badRequest(res, 'El grupo especificado no existe');
      }
      
      next(error);
    }
  }
}

module.exports = new InscripcionController();