const grupoService = require('../services/grupoService');
const response = require('../utils/response');

class GrupoController {
  /**
   * Obtener todos los grupos
   * GET /api/grupos
   */
  async getAllGrupos(req, res, next) {
    try {
      const { parroquia, nivel, periodo, page = 1, limit = 10 } = req.query;
      
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
      
      if (nivel) filtros.id_nivel = parseInt(nivel);
      if (periodo) filtros.periodo = periodo;
      
      const result = await grupoService.getAllGrupos(filtros);
      
      response.success(res, result, 'Grupos obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getAllGrupos:', error);
      
      if (error.message === 'ERROR_FETCHING_GRUPOS') {
        return response.serverError(res, 'Error interno obteniendo grupos');
      }
      
      next(error);
    }
  }

  /**
   * Obtener grupo por ID
   * GET /api/grupos/:id
   */
  async getGrupoById(req, res, next) {
    try {
      const { id } = req.params;
      
      const grupo = await grupoService.getGrupoById(parseInt(id));
      
      // Verificar permisos: admin puede ver cualquier grupo, otros solo de su parroquia
      if (req.user.tipo_perfil !== 'admin' && 
          grupo.id_parroquia !== req.user.id_parroquia) {
        return response.forbidden(res, 'No tienes permisos para ver este grupo');
      }
      
      response.success(res, grupo, 'Grupo obtenido exitosamente');
    } catch (error) {
      console.error('Error en getGrupoById:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.notFound(res, 'Grupo no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_GRUPO') {
        return response.serverError(res, 'Error interno obteniendo grupo');
      }
      
      next(error);
    }
  }

  /**
   * Crear nuevo grupo
   * POST /api/grupos
   */
  async createGrupo(req, res, next) {
    try {
      const grupoData = req.body;
      
      // Verificar permisos
      if (!['admin', 'parroco', 'secretaria'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para crear grupos');
      }
      
      // Si no es admin, solo puede crear grupos en su parroquia
      if (req.user.tipo_perfil !== 'admin') {
        grupoData.id_parroquia = req.user.id_parroquia;
      }
      
      const newGrupo = await grupoService.createGrupo(grupoData);
      
      response.created(res, newGrupo, 'Grupo creado exitosamente');
    } catch (error) {
      console.error('Error en createGrupo:', error);
      
      if (error.message === 'GRUPO_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe un grupo con este nombre en la parroquia y periodo');
      }
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.badRequest(res, 'La parroquia especificada no existe');
      }
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        return response.badRequest(res, 'El nivel especificado no existe');
      }
      
      if (error.message === 'ERROR_CREATING_GRUPO') {
        return response.serverError(res, 'Error interno creando grupo');
      }
      
      next(error);
    }
  }

  /**
   * Actualizar grupo
   * PUT /api/grupos/:id
   */
  async updateGrupo(req, res, next) {
    try {
      const { id } = req.params;
      const grupoData = req.body;
      
      // Verificar permisos
      if (!['admin', 'parroco', 'secretaria'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para actualizar grupos');
      }
      
      // Verificar que puede actualizar este grupo
      const grupoExistente = await grupoService.getGrupoById(parseInt(id));
      if (req.user.tipo_perfil !== 'admin' && 
          grupoExistente.id_parroquia !== req.user.id_parroquia) {
        return response.forbidden(res, 'Solo puedes actualizar grupos de tu parroquia');
      }
      
      const updatedGrupo = await grupoService.updateGrupo(parseInt(id), grupoData);
      
      response.success(res, updatedGrupo, 'Grupo actualizado exitosamente');
    } catch (error) {
      console.error('Error en updateGrupo:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.notFound(res, 'Grupo no encontrado');
      }
      
      if (error.message === 'GRUPO_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe otro grupo con este nombre en la parroquia y periodo');
      }
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.badRequest(res, 'La parroquia especificada no existe');
      }
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        return response.badRequest(res, 'El nivel especificado no existe');
      }
      
      if (error.message === 'ERROR_UPDATING_GRUPO') {
        return response.serverError(res, 'Error interno actualizando grupo');
      }
      
      next(error);
    }
  }

  /**
   * Eliminar grupo
   * DELETE /api/grupos/:id
   */
  async deleteGrupo(req, res, next) {
    try {
      const { id } = req.params;
      
      // Verificar permisos
      if (!['admin', 'parroco'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'Solo administradores y párrocos pueden eliminar grupos');
      }
      
      // Verificar que puede eliminar este grupo
      const grupoExistente = await grupoService.getGrupoById(parseInt(id));
      if (req.user.tipo_perfil !== 'admin' && 
          grupoExistente.id_parroquia !== req.user.id_parroquia) {
        return response.forbidden(res, 'Solo puedes eliminar grupos de tu parroquia');
      }
      
      const deletedGrupo = await grupoService.deleteGrupo(parseInt(id));
      
      response.success(res, deletedGrupo, 'Grupo eliminado exitosamente');
    } catch (error) {
      console.error('Error en deleteGrupo:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.notFound(res, 'Grupo no encontrado');
      }
      
      if (error.message === 'GRUPO_HAS_DEPENDENCIES') {
        return response.conflict(res, 'No se puede eliminar el grupo porque tiene inscripciones o catequistas asociados');
      }
      
      if (error.message === 'ERROR_DELETING_GRUPO') {
        return response.serverError(res, 'Error interno eliminando grupo');
      }
      
      next(error);
    }
  }

  /**
   * Obtener grupos por parroquia
   * GET /api/grupos/parroquia/:idParroquia
   */
  async getGruposByParroquia(req, res, next) {
    try {
      const { idParroquia } = req.params;
      const { periodo, nivel } = req.query;
      
      // Verificar permisos
      if (req.user.tipo_perfil !== 'admin' && 
          parseInt(idParroquia) !== req.user.id_parroquia) {
        return response.forbidden(res, 'No tienes permisos para ver grupos de esta parroquia');
      }
      
      const grupos = await grupoService.getGruposByParroquia(parseInt(idParroquia), { periodo, nivel });
      
      response.success(res, grupos, 'Grupos obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getGruposByParroquia:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.notFound(res, 'Parroquia no encontrada');
      }
      
      if (error.message === 'ERROR_FETCHING_GRUPOS_BY_PARROQUIA') {
        return response.serverError(res, 'Error interno obteniendo grupos por parroquia');
      }
      
      next(error);
    }
  }

  /**
   * Obtener grupos por nivel
   * GET /api/grupos/nivel/:idNivel
   */
  async getGruposByNivel(req, res, next) {
    try {
      const { idNivel } = req.params;
      const { periodo, parroquia } = req.query;
      
      let filtros = { periodo };
      
      // Filtrar por parroquia si no es admin
      if (req.user.tipo_perfil !== 'admin') {
        filtros.id_parroquia = req.user.id_parroquia;
      } else if (parroquia) {
        filtros.id_parroquia = parseInt(parroquia);
      }
      
      const grupos = await grupoService.getGruposByNivel(parseInt(idNivel), filtros);
      
      response.success(res, grupos, 'Grupos obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getGruposByNivel:', error);
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        return response.notFound(res, 'Nivel no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_GRUPOS_BY_NIVEL') {
        return response.serverError(res, 'Error interno obteniendo grupos por nivel');
      }
      
      next(error);
    }
  }

  /**
   * Obtener inscripciones de un grupo
   * GET /api/grupos/:id/inscripciones
   */
  async getGrupoInscripciones(req, res, next) {
    try {
      const { id } = req.params;
      
      // Verificar que puede ver este grupo
      const grupo = await grupoService.getGrupoById(parseInt(id));
      if (req.user.tipo_perfil !== 'admin' && 
          grupo.id_parroquia !== req.user.id_parroquia) {
        return response.forbidden(res, 'No tienes permisos para ver las inscripciones de este grupo');
      }
      
      const inscripciones = await grupoService.getGrupoInscripciones(parseInt(id));
      
      response.success(res, inscripciones, 'Inscripciones obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getGrupoInscripciones:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.notFound(res, 'Grupo no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_INSCRIPCIONES') {
        return response.serverError(res, 'Error interno obteniendo inscripciones');
      }
      
      next(error);
    }
  }

  /**
   * Obtener catequistas de un grupo
   * GET /api/grupos/:id/catequistas
   */
  async getGrupoCatequistas(req, res, next) {
    try {
      const { id } = req.params;
      
      // Verificar que puede ver este grupo
      const grupo = await grupoService.getGrupoById(parseInt(id));
      if (req.user.tipo_perfil !== 'admin' && 
          grupo.id_parroquia !== req.user.id_parroquia) {
        return response.forbidden(res, 'No tienes permisos para ver los catequistas de este grupo');
      }
      
      const catequistas = await grupoService.getGrupoCatequistas(parseInt(id));
      
      response.success(res, catequistas, 'Catequistas obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getGrupoCatequistas:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.notFound(res, 'Grupo no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_CATEQUISTAS') {
        return response.serverError(res, 'Error interno obteniendo catequistas');
      }
      
      next(error);
    }
  }

  /**
   * Obtener estadísticas de un grupo
   * GET /api/grupos/:id/stats
   */
  async getGrupoStats(req, res, next) {
    try {
      const { id } = req.params;
      
      // Verificar que puede ver este grupo
      const grupo = await grupoService.getGrupoById(parseInt(id));
      if (req.user.tipo_perfil !== 'admin' && 
          grupo.id_parroquia !== req.user.id_parroquia) {
        return response.forbidden(res, 'No tienes permisos para ver las estadísticas de este grupo');
      }
      
      const stats = await grupoService.getGrupoStats(parseInt(id));
      
      response.success(res, stats, 'Estadísticas obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getGrupoStats:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.notFound(res, 'Grupo no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_STATS') {
        return response.serverError(res, 'Error interno obteniendo estadísticas');
      }
      
      next(error);
    }
  }

  /**
   * Buscar grupos
   * GET /api/grupos/search?q=termino
   */
  async searchGrupos(req, res, next) {
    try {
      const { q, parroquia, nivel, periodo } = req.query;
      
      if (!q || q.trim().length < 2) {
        return response.badRequest(res, 'El término de búsqueda debe tener al menos 2 caracteres');
      }
      
      let filtros = { search: q.trim() };
      
      // Filtrar por parroquia si no es admin
      if (req.user.tipo_perfil !== 'admin') {
        filtros.id_parroquia = req.user.id_parroquia;
      } else if (parroquia) {
        filtros.id_parroquia = parseInt(parroquia);
      }
      
      if (nivel) filtros.id_nivel = parseInt(nivel);
      if (periodo) filtros.periodo = periodo;
      
      const grupos = await grupoService.searchGrupos(filtros);
      
      response.success(res, grupos, `Se encontraron ${grupos.length} grupos`);
    } catch (error) {
      console.error('Error en searchGrupos:', error);
      
      if (error.message === 'ERROR_SEARCHING_GRUPOS') {
        return response.serverError(res, 'Error interno buscando grupos');
      }
      
      next(error);
    }
  }
}

module.exports = new GrupoController();