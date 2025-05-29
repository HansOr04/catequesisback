const parroquiaService = require('../services/parroquiaService');
const response = require('../utils/response');
const { USER_ROLES } = require('../utils/constants');

class ParroquiaController {
  /**
   * Obtener todas las parroquias
   * GET /api/parroquias
   */
  async getAllParroquias(req, res, next) {
    try {
      const parroquias = await parroquiaService.getAllParroquias();
      
      response.success(res, parroquias, 'Parroquias obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getAllParroquias:', error);
      
      if (error.message === 'ERROR_FETCHING_PARROQUIAS') {
        return response.serverError(res, 'Error interno obteniendo parroquias');
      }
      
      next(error);
    }
  }

  /**
   * Obtener parroquia por ID
   * GET /api/parroquias/:id
   */
  async getParroquiaById(req, res, next) {
    try {
      const { id } = req.params;
      
      const parroquia = await parroquiaService.getParroquiaById(parseInt(id));
      
      response.success(res, parroquia, 'Parroquia obtenida exitosamente');
    } catch (error) {
      console.error('Error en getParroquiaById:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.notFound(res, 'Parroquia no encontrada');
      }
      
      if (error.message === 'ERROR_FETCHING_PARROQUIA') {
        return response.serverError(res, 'Error interno obteniendo parroquia');
      }
      
      next(error);
    }
  }

  /**
   * Crear nueva parroquia
   * POST /api/parroquias
   */
  async createParroquia(req, res, next) {
    try {
      const parroquiaData = req.body;
      
      // Verificar permisos (solo admin y parroco pueden crear)
      if (!['admin', 'parroco'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para crear parroquias');
      }
      
      const newParroquia = await parroquiaService.createParroquia(parroquiaData);
      
      response.created(res, newParroquia, 'Parroquia creada exitosamente');
    } catch (error) {
      console.error('Error en createParroquia:', error);
      
      if (error.message === 'PARROQUIA_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe una parroquia con estos datos');
      }
      
      if (error.message === 'ERROR_CREATING_PARROQUIA') {
        return response.serverError(res, 'Error interno creando parroquia');
      }
      
      next(error);
    }
  }

  /**
   * Actualizar parroquia
   * PUT /api/parroquias/:id
   */
  async updateParroquia(req, res, next) {
    try {
      const { id } = req.params;
      const parroquiaData = req.body;
      
      // Verificar permisos
      if (!['admin', 'parroco'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para actualizar parroquias');
      }
      
      // Si no es admin, solo puede actualizar su propia parroquia
      if (req.user.tipo_perfil === 'parroco' && req.user.id_parroquia !== parseInt(id)) {
        return response.forbidden(res, 'Solo puedes actualizar tu propia parroquia');
      }
      
      const updatedParroquia = await parroquiaService.updateParroquia(parseInt(id), parroquiaData);
      
      response.success(res, updatedParroquia, 'Parroquia actualizada exitosamente');
    } catch (error) {
      console.error('Error en updateParroquia:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.notFound(res, 'Parroquia no encontrada');
      }
      
      if (error.message === 'PARROQUIA_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe una parroquia con estos datos');
      }
      
      if (error.message === 'ERROR_UPDATING_PARROQUIA') {
        return response.serverError(res, 'Error interno actualizando parroquia');
      }
      
      next(error);
    }
  }

  /**
   * Eliminar parroquia
   * DELETE /api/parroquias/:id
   */
  async deleteParroquia(req, res, next) {
    try {
      const { id } = req.params;
      
      // Solo admin puede eliminar parroquias
      if (req.user.tipo_perfil !== 'admin') {
        return response.forbidden(res, 'Solo los administradores pueden eliminar parroquias');
      }
      
      const deletedParroquia = await parroquiaService.deleteParroquia(parseInt(id));
      
      response.success(res, deletedParroquia, 'Parroquia eliminada exitosamente');
    } catch (error) {
      console.error('Error en deleteParroquia:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.notFound(res, 'Parroquia no encontrada');
      }
      
      if (error.message === 'PARROQUIA_HAS_DEPENDENCIES') {
        return response.conflict(res, 'No se puede eliminar la parroquia porque tiene grupos o usuarios asociados');
      }
      
      if (error.message === 'ERROR_DELETING_PARROQUIA') {
        return response.serverError(res, 'Error interno eliminando parroquia');
      }
      
      next(error);
    }
  }

  /**
   * Obtener estadísticas de una parroquia
   * GET /api/parroquias/:id/stats
   */
  async getParroquiaStats(req, res, next) {
    try {
      const { id } = req.params;
      
      // Verificar permisos de acceso a la parroquia
      if (req.user.tipo_perfil !== 'admin' && req.user.id_parroquia !== parseInt(id)) {
        return response.forbidden(res, 'No tienes permisos para ver las estadísticas de esta parroquia');
      }
      
      const stats = await parroquiaService.getParroquiaStats(parseInt(id));
      
      response.success(res, stats, 'Estadísticas obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getParroquiaStats:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.notFound(res, 'Parroquia no encontrada');
      }
      
      if (error.message === 'ERROR_FETCHING_STATS') {
        return response.serverError(res, 'Error interno obteniendo estadísticas');
      }
      
      next(error);
    }
  }

  /**
   * Buscar parroquias
   * GET /api/parroquias/search?q=termino
   */
  async searchParroquias(req, res, next) {
    try {
      const { q } = req.query;
      
      if (!q || q.trim().length < 2) {
        return response.badRequest(res, 'El término de búsqueda debe tener al menos 2 caracteres');
      }
      
      const parroquias = await parroquiaService.searchParroquias(q.trim());
      
      response.success(res, parroquias, `Se encontraron ${parroquias.length} parroquias`);
    } catch (error) {
      console.error('Error en searchParroquias:', error);
      
      if (error.message === 'ERROR_SEARCHING_PARROQUIAS') {
        return response.serverError(res, 'Error interno buscando parroquias');
      }
      
      next(error);
    }
  }
}

module.exports = new ParroquiaController();