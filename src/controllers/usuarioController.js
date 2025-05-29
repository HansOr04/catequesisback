const usuarioService = require('../services/usuarioService');
const response = require('../utils/response');

class UsuarioController {
  /**
   * Obtener todos los usuarios
   * GET /api/usuarios
   */
  async getAllUsuarios(req, res, next) {
    try {
      const { parroquia } = req.query;
      
      // Filtrar por parroquia si no es admin
      let filtros = {};
      if (req.user.tipo_perfil !== 'admin') {
        filtros.id_parroquia = req.user.id_parroquia;
      } else if (parroquia) {
        filtros.id_parroquia = parseInt(parroquia);
      }
      
      const usuarios = await usuarioService.getAllUsuarios(filtros);
      
      response.success(res, usuarios, 'Usuarios obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getAllUsuarios:', error);
      
      if (error.message === 'ERROR_FETCHING_USUARIOS') {
        return response.serverError(res, 'Error interno obteniendo usuarios');
      }
      
      next(error);
    }
  }

  /**
   * Obtener usuario por ID
   * GET /api/usuarios/:id
   */
  async getUsuarioById(req, res, next) {
    try {
      const { id } = req.params;
      
      const usuario = await usuarioService.getUsuarioById(parseInt(id));
      
      // Verificar permisos: admin puede ver cualquier usuario, otros solo de su parroquia
      if (req.user.tipo_perfil !== 'admin' && 
          usuario.id_parroquia !== req.user.id_parroquia) {
        return response.forbidden(res, 'No tienes permisos para ver este usuario');
      }
      
      response.success(res, usuario, 'Usuario obtenido exitosamente');
    } catch (error) {
      console.error('Error en getUsuarioById:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        return response.notFound(res, 'Usuario no encontrado');
      }
      
      if (error.message === 'ERROR_FETCHING_USUARIO') {
        return response.serverError(res, 'Error interno obteniendo usuario');
      }
      
      next(error);
    }
  }

  /**
   * Crear nuevo usuario
   * POST /api/usuarios
   */
  async createUsuario(req, res, next) {
    try {
      const usuarioData = req.body;
      
      // Solo admin puede crear usuarios
      if (req.user.tipo_perfil !== 'admin') {
        return response.forbidden(res, 'Solo los administradores pueden crear usuarios');
      }
      
      const newUsuario = await usuarioService.createUsuario(usuarioData);
      
      response.created(res, newUsuario, 'Usuario creado exitosamente');
    } catch (error) {
      console.error('Error en createUsuario:', error);
      
      if (error.message === 'USERNAME_ALREADY_EXISTS') {
        return response.conflict(res, 'El nombre de usuario ya está en uso');
      }
      
      if (error.message === 'INVALID_PROFILE_TYPE') {
        return response.badRequest(res, 'Tipo de perfil inválido');
      }
      
      if (error.message === 'PARROQUIA_REQUIRED') {
        return response.badRequest(res, 'La parroquia es requerida para este tipo de perfil');
      }
      
      if (error.message === 'PARROCO_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe un párroco asignado a esta parroquia');
      }
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.badRequest(res, 'La parroquia especificada no existe');
      }
      
      if (error.message === 'ERROR_CREATING_USUARIO') {
        return response.serverError(res, 'Error interno creando usuario');
      }
      
      next(error);
    }
  }

  /**
   * Actualizar usuario
   * PUT /api/usuarios/:id
   */
  async updateUsuario(req, res, next) {
    try {
      const { id } = req.params;
      const usuarioData = req.body;
      
      // Solo admin puede actualizar usuarios
      if (req.user.tipo_perfil !== 'admin') {
        return response.forbidden(res, 'Solo los administradores pueden actualizar usuarios');
      }
      
      // No permitir que el admin se cambie su propio tipo de perfil
      if (parseInt(id) === req.user.id_usuario && usuarioData.tipo_perfil !== 'admin') {
        return response.badRequest(res, 'No puedes cambiar tu propio tipo de perfil');
      }
      
      const updatedUsuario = await usuarioService.updateUsuario(parseInt(id), usuarioData);
      
      response.success(res, updatedUsuario, 'Usuario actualizado exitosamente');
    } catch (error) {
      console.error('Error en updateUsuario:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        return response.notFound(res, 'Usuario no encontrado');
      }
      
      if (error.message === 'USERNAME_ALREADY_EXISTS') {
        return response.conflict(res, 'El nombre de usuario ya está en uso por otro usuario');
      }
      
      if (error.message === 'INVALID_PROFILE_TYPE') {
        return response.badRequest(res, 'Tipo de perfil inválido');
      }
      
      if (error.message === 'PARROQUIA_REQUIRED') {
        return response.badRequest(res, 'La parroquia es requerida para este tipo de perfil');
      }
      
      if (error.message === 'PARROCO_ALREADY_EXISTS') {
        return response.conflict(res, 'Ya existe un párroco asignado a esta parroquia');
      }
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.badRequest(res, 'La parroquia especificada no existe');
      }
      
      if (error.message === 'ERROR_UPDATING_USUARIO') {
        return response.serverError(res, 'Error interno actualizando usuario');
      }
      
      next(error);
    }
  }

  /**
   * Eliminar usuario
   * DELETE /api/usuarios/:id
   */
  async deleteUsuario(req, res, next) {
    try {
      const { id } = req.params;
      
      // Solo admin puede eliminar usuarios
      if (req.user.tipo_perfil !== 'admin') {
        return response.forbidden(res, 'Solo los administradores pueden eliminar usuarios');
      }
      
      // No permitir que el admin se elimine a sí mismo
      if (parseInt(id) === req.user.id_usuario) {
        return response.badRequest(res, 'No puedes eliminar tu propio usuario');
      }
      
      const deletedUsuario = await usuarioService.deleteUsuario(parseInt(id));
      
      response.success(res, deletedUsuario, 'Usuario eliminado exitosamente');
    } catch (error) {
      console.error('Error en deleteUsuario:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        return response.notFound(res, 'Usuario no encontrado');
      }
      
      if (error.message === 'ERROR_DELETING_USUARIO') {
        return response.serverError(res, 'Error interno eliminando usuario');
      }
      
      next(error);
    }
  }

  /**
   * Cambiar contraseña
   * PUT /api/usuarios/:id/password
   */
  async cambiarContrasena(req, res, next) {
    try {
      const { id } = req.params;
      const { password_actual, password_nueva } = req.body;
      
      // Los usuarios pueden cambiar su propia contraseña o admin puede cambiar cualquiera
      if (req.user.tipo_perfil !== 'admin' && parseInt(id) !== req.user.id_usuario) {
        return response.forbidden(res, 'Solo puedes cambiar tu propia contraseña');
      }
      
      // Si es admin cambiando contraseña de otro usuario, no se requiere contraseña actual
      const isAdminChangingOther = req.user.tipo_perfil === 'admin' && parseInt(id) !== req.user.id_usuario;
      
      const result = await usuarioService.cambiarContrasena(
        parseInt(id), 
        isAdminChangingOther ? null : password_actual, 
        password_nueva,
        isAdminChangingOther
      );
      
      response.success(res, null, 'Contraseña cambiada exitosamente');
    } catch (error) {
      console.error('Error en cambiarContrasena:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        return response.notFound(res, 'Usuario no encontrado');
      }
      
      if (error.message === 'CURRENT_PASSWORD_INCORRECT') {
        return response.badRequest(res, 'La contraseña actual es incorrecta');
      }
      
      if (error.message === 'ERROR_CHANGING_PASSWORD') {
        return response.serverError(res, 'Error interno cambiando contraseña');
      }
      
      next(error);
    }
  }

  /**
   * Obtener usuarios por parroquia
   * GET /api/usuarios/parroquia/:idParroquia
   */
  async getUsuariosByParroquia(req, res, next) {
    try {
      const { idParroquia } = req.params;
      
      // Verificar permisos: admin puede ver cualquier parroquia, otros solo la suya
      if (req.user.tipo_perfil !== 'admin' && 
          parseInt(idParroquia) !== req.user.id_parroquia) {
        return response.forbidden(res, 'No tienes permisos para ver usuarios de esta parroquia');
      }
      
      const usuarios = await usuarioService.getUsuariosByParroquia(parseInt(idParroquia));
      
      response.success(res, usuarios, 'Usuarios obtenidos exitosamente');
    } catch (error) {
      console.error('Error en getUsuariosByParroquia:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        return response.notFound(res, 'Parroquia no encontrada');
      }
      
      if (error.message === 'ERROR_FETCHING_USUARIOS_BY_PARROQUIA') {
        return response.serverError(res, 'Error interno obteniendo usuarios por parroquia');
      }
      
      next(error);
    }
  }

  /**
   * Obtener estadísticas de usuarios
   * GET /api/usuarios/stats
   */
  async getUsuariosStats(req, res, next) {
    try {
      // Filtrar por parroquia si no es admin
      let filtros = {};
      if (req.user.tipo_perfil !== 'admin') {
        filtros.id_parroquia = req.user.id_parroquia;
      }
      
      const stats = await usuarioService.getUsuariosStats(filtros);
      
      response.success(res, stats, 'Estadísticas obtenidas exitosamente');
    } catch (error) {
      console.error('Error en getUsuariosStats:', error);
      
      if (error.message === 'ERROR_FETCHING_STATS') {
        return response.serverError(res, 'Error interno obteniendo estadísticas');
      }
      
      next(error);
    }
  }

  /**
   * Buscar usuarios
   * GET /api/usuarios/search?q=termino
   */
  async searchUsuarios(req, res, next) {
    try {
      const { q, tipo_perfil } = req.query;
      
      if (!q || q.trim().length < 2) {
        return response.badRequest(res, 'El término de búsqueda debe tener al menos 2 caracteres');
      }
      
      // Filtrar por parroquia si no es admin
      let filtros = { search: q.trim() };
      if (req.user.tipo_perfil !== 'admin') {
        filtros.id_parroquia = req.user.id_parroquia;
      }
      
      if (tipo_perfil) {
        filtros.tipo_perfil = tipo_perfil;
      }
      
      const usuarios = await usuarioService.searchUsuarios(filtros);
      
      response.success(res, usuarios, `Se encontraron ${usuarios.length} usuarios`);
    } catch (error) {
      console.error('Error en searchUsuarios:', error);
      
      if (error.message === 'ERROR_SEARCHING_USUARIOS') {
        return response.serverError(res, 'Error interno buscando usuarios');
      }
      
      next(error);
    }
  }

  /**
   * Resetear contraseña (solo admin)
   * PUT /api/usuarios/:id/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { id } = req.params;
      
      // Solo admin puede resetear contraseñas
      if (req.user.tipo_perfil !== 'admin') {
        return response.forbidden(res, 'Solo los administradores pueden resetear contraseñas');
      }
      
      const nuevaContrasena = await usuarioService.resetPassword(parseInt(id));
      
      response.success(res, { nueva_contrasena: nuevaContrasena }, 'Contraseña reseteada exitosamente');
    } catch (error) {
      console.error('Error en resetPassword:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        return response.notFound(res, 'Usuario no encontrado');
      }
      
      if (error.message === 'ERROR_RESETTING_PASSWORD') {
        return response.serverError(res, 'Error interno reseteando contraseña');
      }
      
      next(error);
    }
  }

  /**
   * Activar/Desactivar usuario
   * PUT /api/usuarios/:id/toggle-status
   */
  async toggleUsuarioStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { activo } = req.body;
      
      // Solo admin puede cambiar el estado de usuarios
      if (req.user.tipo_perfil !== 'admin') {
        return response.forbidden(res, 'Solo los administradores pueden cambiar el estado de usuarios');
      }
      
      // No permitir desactivar su propio usuario
      if (parseInt(id) === req.user.id_usuario && !activo) {
        return response.badRequest(res, 'No puedes desactivar tu propio usuario');
      }
      
      const usuario = await usuarioService.toggleUsuarioStatus(parseInt(id), activo);
      
      const mensaje = activo ? 'Usuario activado exitosamente' : 'Usuario desactivado exitosamente';
      response.success(res, usuario, mensaje);
    } catch (error) {
      console.error('Error en toggleUsuarioStatus:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        return response.notFound(res, 'Usuario no encontrado');
      }
      
      if (error.message === 'ERROR_UPDATING_STATUS') {
        return response.serverError(res, 'Error interno actualizando estado del usuario');
      }
      
      next(error);
    }
  }
}

module.exports = new UsuarioController();