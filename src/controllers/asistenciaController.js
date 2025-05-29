const asistenciaService = require('../services/asistenciaService');
const response = require('../utils/response');

class AsistenciaController {
  /**
   * Registrar asistencia individual
   * POST /api/asistencias
   */
  async registrarAsistencia(req, res, next) {
    try {
      const asistenciaData = req.body;
      
      // Verificar permisos
      if (!['admin', 'parroco', 'secretaria', 'catequista'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para registrar asistencias');
      }
      
      const nuevaAsistencia = await asistenciaService.registrarAsistencia(asistenciaData);
      
      response.created(res, nuevaAsistencia, 'Asistencia registrada exitosamente');
    } catch (error) {
      console.error('Error en registrarAsistencia:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND') {
        return response.badRequest(res, 'La inscripción especificada no existe');
      }
      
      if (error.message === 'ASISTENCIA_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe un registro de asistencia para esta inscripción en la fecha especificada');
      }
      
      if (error.message === 'ERROR_REGISTERING_ASISTENCIA') {
        return response.serverError(res, 'Error interno registrando asistencia');
      }
      
      next(error);
    }
  }

  /**
   * Registrar asistencia masiva para un grupo
   * POST /api/asistencias/grupo/:idGrupo/masiva
   */
  async registrarAsistenciaMasiva(req, res, next) {
    try {
      const { idGrupo } = req.params;
      const { fecha, asistencias } = req.body;
      
      // Verificar permisos
      if (!['admin', 'parroco', 'secretaria', 'catequista'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para registrar asistencias');
      }
      
      const resultado = await asistenciaService.registrarAsistenciaMasiva(
        parseInt(idGrupo), 
        fecha, 
        asistencias,
        req.user
      );
      
      response.success(res, resultado, 'Asistencia masiva registrada exitosamente');
    } catch (error) {
      console.error('Error en registrarAsistenciaMasiva:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.badRequest(res, 'El grupo especificado no existe');
      }
      
      if (error.message === 'GRUPO_ACCESS_DENIED') {
        return response.forbidden(res, 'No tienes acceso a este grupo');
      }
      
      if (error.message === 'INVALID_ASISTENCIAS_DATA') {
        return response.badRequest(res, 'Los datos de asistencia son inválidos');
      }
      
      if (error.message === 'ERROR_REGISTERING_ASISTENCIA_MASIVA') {
        return response.serverError(res, 'Error interno registrando asistencia masiva');
      }
      
      next(error);
    }
  }

  /**
   * Obtener asistencias por inscripción
   * GET /api/asistencias/inscripcion/:idInscripcion
   */
  async getAsistenciasByInscripcion(req, res, next) {
    try {
      const { idInscripcion } = req.params;
      
      const asistencias = await asistenciaService.getAsistenciasByInscripcion(parseInt(idInscripcion));
      
      response.success(res, asistencias, 'Asistencias obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getAsistenciasByInscripcion:', error);
      
      if (error.message === 'INSCRIPCION_NOT_FOUND') {
        return response.notFound(res, 'Inscripción no encontrada');
      }
      
      if (error.message === 'ERROR_FETCHING_ASISTENCIAS') {
        return response.serverError(res, 'Error interno obteniendo asistencias');
      }
      
      next(error);
    }
  }

  /**
   * Obtener asistencias por grupo y fecha
   * GET /api/asistencias/grupo/:idGrupo/fecha/:fecha
   */
  async getAsistenciasByGrupoYFecha(req, res, next) {
    try {
      const { idGrupo, fecha } = req.params;
      
      // Verificar acceso al grupo
      const hasAccess = await asistenciaService.verificarAccesoGrupo(parseInt(idGrupo), req.user);
      if (!hasAccess) {
        return response.forbidden(res, 'No tienes acceso a este grupo');
      }
      
      const asistencias = await asistenciaService.getAsistenciasByGrupoYFecha(
        parseInt(idGrupo), 
        fecha
      );
      
      response.success(res, asistencias, 'Asistencias obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getAsistenciasByGrupoYFecha:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.notFound(res, 'Grupo no encontrado');
      }
      
      if (error.message === 'INVALID_DATE_FORMAT') {
        return response.badRequest(res, 'Formato de fecha inválido');
      }
      
      if (error.message === 'ERROR_FETCHING_ASISTENCIAS') {
        return response.serverError(res, 'Error interno obteniendo asistencias');
      }
      
      next(error);
    }
  }

  /**
   * Obtener resumen de asistencias de un grupo
   * GET /api/asistencias/grupo/:idGrupo/resumen
   */
  async getResumenAsistenciasGrupo(req, res, next) {
    try {
      const { idGrupo } = req.params;
      const { fecha_inicio, fecha_fin } = req.query;
      
      // Verificar acceso al grupo
      const hasAccess = await asistenciaService.verificarAccesoGrupo(parseInt(idGrupo), req.user);
      if (!hasAccess) {
        return response.forbidden(res, 'No tienes acceso a este grupo');
      }
      
      const resumen = await asistenciaService.getResumenAsistenciasGrupo(
        parseInt(idGrupo), 
        { fecha_inicio, fecha_fin }
      );
      
      response.success(res, resumen, 'Resumen de asistencias obtenido exitosamente');
    } catch (error) {
      console.error('Error en getResumenAsistenciasGrupo:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.notFound(res, 'Grupo no encontrado');
      }
      
      if (error.message === 'INVALID_DATE_RANGE') {
        return response.badRequest(res, 'Rango de fechas inválido');
      }
      
      if (error.message === 'ERROR_FETCHING_RESUMEN') {
        return response.serverError(res, 'Error interno obteniendo resumen');
      }
      
      next(error);
    }
  }

  /**
   * Generar reporte de asistencias
   * GET /api/asistencias/grupo/:idGrupo/reporte
   */
  async generarReporteAsistencias(req, res, next) {
    try {
      const { idGrupo } = req.params;
      const { fecha_inicio, fecha_fin, formato = 'json' } = req.query;
      
      // Verificar acceso al grupo
      const hasAccess = await asistenciaService.verificarAccesoGrupo(parseInt(idGrupo), req.user);
      if (!hasAccess) {
        return response.forbidden(res, 'No tienes acceso a este grupo');
      }
      
      const reporte = await asistenciaService.generarReporteAsistencias(
        parseInt(idGrupo),
        { fecha_inicio, fecha_fin, formato }
      );
      
      if (formato === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="asistencias_grupo_${idGrupo}.csv"`);
        res.send(reporte);
      } else {
        response.success(res, reporte, 'Reporte de asistencias generado exitosamente');
      }
    } catch (error) {
      console.error('Error en generarReporteAsistencias:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.notFound(res, 'Grupo no encontrado');
      }
      
      if (error.message === 'INVALID_DATE_RANGE') {
        return response.badRequest(res, 'Rango de fechas inválido');
      }
      
      if (error.message === 'ERROR_GENERATING_REPORT') {
        return response.serverError(res, 'Error interno generando reporte');
      }
      
      next(error);
    }
  }

  /**
   * Actualizar asistencia
   * PUT /api/asistencias/:id
   */
  async updateAsistencia(req, res, next) {
    try {
      const { id } = req.params;
      const { asistio } = req.body;
      
      // Verificar permisos
      if (!['admin', 'parroco', 'secretaria', 'catequista'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para actualizar asistencias');
      }
      
      const asistenciaActualizada = await asistenciaService.updateAsistencia(
        parseInt(id), 
        asistio,
        req.user
      );
      
      response.success(res, asistenciaActualizada, 'Asistencia actualizada exitosamente');
    } catch (error) {
      console.error('Error en updateAsistencia:', error);
      
      if (error.message === 'ASISTENCIA_NOT_FOUND') {
        return response.notFound(res, 'Asistencia no encontrada');
      }
      
      if (error.message === 'ACCESS_DENIED') {
        return response.forbidden(res, 'No tienes permisos para actualizar esta asistencia');
      }
      
      if (error.message === 'ERROR_UPDATING_ASISTENCIA') {
        return response.serverError(res, 'Error interno actualizando asistencia');
      }
      
      next(error);
    }
  }

  /**
   * Eliminar asistencia
   * DELETE /api/asistencias/:id
   */
  async deleteAsistencia(req, res, next) {
    try {
      const { id } = req.params;
      
      // Verificar permisos
      if (!['admin', 'parroco', 'secretaria'].includes(req.user.tipo_perfil)) {
        return response.forbidden(res, 'No tienes permisos para eliminar asistencias');
      }
      
      const asistenciaEliminada = await asistenciaService.deleteAsistencia(
        parseInt(id),
        req.user
      );
      
      response.success(res, asistenciaEliminada, 'Asistencia eliminada exitosamente');
    } catch (error) {
      console.error('Error en deleteAsistencia:', error);
      
      if (error.message === 'ASISTENCIA_NOT_FOUND') {
        return response.notFound(res, 'Asistencia no encontrada');
      }
      
      if (error.message === 'ACCESS_DENIED') {
        return response.forbidden(res, 'No tienes permisos para eliminar esta asistencia');
      }
      
      if (error.message === 'ERROR_DELETING_ASISTENCIA') {
        return response.serverError(res, 'Error interno eliminando asistencia');
      }
      
      next(error);
    }
  }

  /**
   * Obtener estadísticas de asistencia por grupo
   * GET /api/asistencias/grupo/:idGrupo/stats
   */
  async getStatsAsistenciaGrupo(req, res, next) {
    try {
      const { idGrupo } = req.params;
      const { periodo } = req.query;
      
      // Verificar acceso al grupo
      const hasAccess = await asistenciaService.verificarAccesoGrupo(parseInt(idGrupo), req.user);
      if (!hasAccess) {
        return response.forbidden(res, 'No tienes acceso a este grupo');
      }
      
      const stats = await asistenciaService.getStatsAsistenciaGrupo(
        parseInt(idGrupo), 
        periodo
      );
      
      response.success(res, stats, 'Estadísticas de asistencia obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getStatsAsistenciaGrupo:', error);
      
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
   * Obtener listado de fechas con asistencias registradas para un grupo
   * GET /api/asistencias/grupo/:idGrupo/fechas
   */
  async getFechasAsistenciaGrupo(req, res, next) {
    try {
      const { idGrupo } = req.params;
      
      // Verificar acceso al grupo
      const hasAccess = await asistenciaService.verificarAccesoGrupo(parseInt(idGrupo), req.user);
      if (!hasAccess) {
        return response.forbidden(res, 'No tienes acceso a este grupo');
      }
      
      const fechas = await asistenciaService.getFechasAsistenciaGrupo(parseInt(idGrupo));
      
      response.success(res, fechas, 'Fechas de asistencia obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getFechasAsistenciaGrupo:', error);
      
      if (error.message === 'GRUPO_NOT_FOUND') {
        return response.notFound(res, 'Grupo no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_FECHAS') {
        return response.serverError(res, 'Error interno obteniendo fechas');
      }
      
      next(error);
    }
  }

  /**
   * Obtener catequizandos con baja asistencia
   * GET /api/asistencias/baja-asistencia
   */
  async getCatequizandosBajaAsistencia(req, res, next) {
    try {
      const { porcentaje_minimo = 70, parroquia, grupo } = req.query;
      
      let filtros = { 
        porcentaje_minimo: parseInt(porcentaje_minimo) 
      };
      
      // Filtrar por parroquia si no es admin
      if (req.user.tipo_perfil !== 'admin') {
        filtros.id_parroquia = req.user.id_parroquia;
      } else if (parroquia) {
        filtros.id_parroquia = parseInt(parroquia);
      }
      
      if (grupo) filtros.id_grupo = parseInt(grupo);
      
      const catequizandos = await asistenciaService.getCatequizandosBajaAsistencia(filtros);
      
      response.success(res, catequizandos, 'Catequizandos con baja asistencia obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getCatequizandosBajaAsistencia:', error);
      
      if (error.message === 'ERROR_FETCHING_BAJA_ASISTENCIA') {
        return response.serverError(res, 'Error interno obteniendo catequizandos con baja asistencia');
      }
      
      next(error);
    }
  }
}

module.exports = new AsistenciaController();