const nivelService = require('../services/nivelService');
const response = require('../utils/response');

class NivelController {
  /**
   * Obtener todos los niveles
   * GET /api/niveles
   */
  async getAllNiveles(req, res, next) {
    try {
      const niveles = await nivelService.getAllNiveles();
      
      response.success(res, niveles, 'Niveles obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getAllNiveles:', error);
      
      if (error.message === 'ERROR_FETCHING_NIVELES') {
        return response.serverError(res, 'Error interno obteniendo niveles');
      }
      
      next(error);
    }
  }

  /**
   * Obtener niveles ordenados
   * GET /api/niveles/ordenados
   */
  async getNivelesOrdenados(req, res, next) {
    try {
      const niveles = await nivelService.getNivelesOrdenados();
      
      response.success(res, niveles, 'Niveles ordenados obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getNivelesOrdenados:', error);
      
      if (error.message === 'ERROR_FETCHING_NIVELES_ORDENADOS') {
        return response.serverError(res, 'Error interno obteniendo niveles ordenados');
      }
      
      next(error);
    }
  }

  /**
   * Obtener nivel por ID
   * GET /api/niveles/:id
   */
  async getNivelById(req, res, next) {
    try {
      const { id } = req.params;
      
      const nivel = await nivelService.getNivelById(parseInt(id));
      
      response.success(res, nivel, 'Nivel obtenido exitosamente');
    } catch (error) {
      console.error('Error en getNivelById:', error);
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        return response.notFound(res, 'Nivel no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_NIVEL') {
        return response.serverError(res, 'Error interno obteniendo nivel');
      }
      
      next(error);
    }
  }

  /**
   * Crear nuevo nivel
   * POST /api/niveles
   */
  async createNivel(req, res, next) {
    try {
      const nivelData = req.body;
      
      // Verificar permisos (solo admin puede crear niveles)
      if (req.user.tipo_perfil !== 'admin') {
        return response.forbidden(res, 'Solo los administradores pueden crear niveles');
      }
      
      const newNivel = await nivelService.createNivel(nivelData);
      
      response.created(res, newNivel, 'Nivel creado exitosamente');
    } catch (error) {
      console.error('Error en createNivel:', error);
      
      if (error.message === 'ORDEN_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe un nivel con este orden');
      }
      
      if (error.message === 'NIVEL_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe un nivel con estos datos');
      }
      
      if (error.message === 'ERROR_CREATING_NIVEL') {
        return response.serverError(res, 'Error interno creando nivel');
      }
      
      next(error);
    }
  }

  /**
   * Actualizar nivel
   * PUT /api/niveles/:id
   */
  async updateNivel(req, res, next) {
    try {
      const { id } = req.params;
      const nivelData = req.body;
      
      // Verificar permisos (solo admin puede actualizar niveles)
      if (req.user.tipo_perfil !== 'admin') {
        return response.forbidden(res, 'Solo los administradores pueden actualizar niveles');
      }
      
      const updatedNivel = await nivelService.updateNivel(parseInt(id), nivelData);
      
      response.success(res, updatedNivel, 'Nivel actualizado exitosamente');
    } catch (error) {
      console.error('Error en updateNivel:', error);
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        return response.notFound(res, 'Nivel no encontrado');
      }
      
      if (error.message === 'ORDEN_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe un nivel con este orden');
      }
      
      if (error.message === 'NIVEL_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe un nivel con estos datos');
      }
      
      if (error.message === 'ERROR_UPDATING_NIVEL') {
        return response.serverError(res, 'Error interno actualizando nivel');
      }
      
      next(error);
    }
  }

  /**
   * Eliminar nivel
   * DELETE /api/niveles/:id
   */
  async deleteNivel(req, res, next) {
    try {
      const { id } = req.params;
      
      // Solo admin puede eliminar niveles
      if (req.user.tipo_perfil !== 'admin') {
        return response.forbidden(res, 'Solo los administradores pueden eliminar niveles');
      }
      
      const deletedNivel = await nivelService.deleteNivel(parseInt(id));
      
      response.success(res, deletedNivel, 'Nivel eliminado exitosamente');
    } catch (error) {
      console.error('Error en deleteNivel:', error);
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        return response.notFound(res, 'Nivel no encontrado');
      }
      
      if (error.message === 'NIVEL_HAS_DEPENDENCIES') {
        return response.conflict(res, 'No se puede eliminar el nivel porque tiene grupos o sacramentos asociados');
      }
      
      if (error.message === 'ERROR_DELETING_NIVEL') {
        return response.serverError(res, 'Error interno eliminando nivel');
      }
      
      next(error);
    }
  }

  /**
   * Obtener estadísticas de un nivel
   * GET /api/niveles/:id/stats
   */
  async getNivelStats(req, res, next) {
    try {
      const { id } = req.params;
      
      const stats = await nivelService.getNivelStats(parseInt(id));
      
      response.success(res, stats, 'Estadísticas obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getNivelStats:', error);
      
      if (error.message === 'NIVEL_NOT_FOUND') {
        return response.notFound(res, 'Nivel no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_STATS') {
        return response.serverError(res, 'Error interno obteniendo estadísticas');
      }
      
      next(error);
    }
  }

  /**
   * Buscar niveles
   * GET /api/niveles/search?q=termino
   */
  async searchNiveles(req, res, next) {
    try {
      const { q } = req.query;
      
      if (!q || q.trim().length < 2) {
        return response.badRequest(res, 'El término de búsqueda debe tener al menos 2 caracteres');
      }
      
      const niveles = await nivelService.searchNiveles(q.trim());
      
      response.success(res, niveles, `Se encontraron ${niveles.length} niveles`);
    } catch (error) {
      console.error('Error en searchNiveles:', error);
      
      if (error.message === 'ERROR_SEARCHING_NIVELES') {
        return response.serverError(res, 'Error interno buscando niveles');
      }
      
      next(error);
    }
  }

  /**
   * Reordenar niveles
   * PUT /api/niveles/reorder
   */
  async reorderNiveles(req, res, next) {
    try {
      const { ordenData } = req.body;
      
      // Solo admin puede reordenar niveles
      if (req.user.tipo_perfil !== 'admin') {
        return response.forbidden(res, 'Solo los administradores pueden reordenar niveles');
      }
      
      if (!Array.isArray(ordenData) || ordenData.length === 0) {
        return response.badRequest(res, 'Datos de reordenamiento inválidos');
      }
      
      const reorderedNiveles = await nivelService.reorderNiveles(ordenData);
      
      response.success(res, reorderedNiveles, 'Niveles reordenados exitosamente');
    } catch (error) {
      console.error('Error en reorderNiveles:', error);
      
      if (error.message === 'ERROR_REORDERING_NIVELES') {
        return response.serverError(res, 'Error interno reordenando niveles');
      }
      
      next(error);
    }
  }

  /**
   * Obtener progresión de niveles para un catequizando
   * GET /api/niveles/progresion/:idCatequizando
   */
  async getProgresionNiveles(req, res, next) {
    try {
      const { idCatequizando } = req.params;
      
      // Verificar permisos para acceder a datos del catequizando
      if (!['admin', 'parroco', 'secretaria', 'catequista'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para ver la progresión de catequizandos');
      }
      
      const progresion = await nivelService.getProgresionNiveles(parseInt(idCatequizando));
      
      response.success(res, progresion, 'Progresión de niveles obtenida exitosamente');
    } catch (error) {
      console.error('Error en getProgresionNiveles:', error);
      
      if (error.message === 'ERROR_FETCHING_PROGRESION') {
        return response.serverError(res, 'Error interno obteniendo progresión');
      }
      
      next(error);
    }
  }
}

module.exports = new NivelController();