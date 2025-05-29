const database = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class UsuarioService {
  /**
   * Obtener todos los usuarios
   */
  async getAllUsuarios(filtros = {}) {
    try {
      if (filtros.id_parroquia) {
        const result = await database.executeStoredProcedure('Seguridad.ObtenerUsuariosPorParroquia', {
          id_parroquia: filtros.id_parroquia
        });
        return result.recordset;
      } else {
        const result = await database.executeStoredProcedure('Seguridad.ObtenerTodosUsuarios');
        return result.recordset;
      }
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw new Error('ERROR_FETCHING_USUARIOS');
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getUsuarioById(id) {
    try {
      const result = await database.executeStoredProcedure('Seguridad.ObtenerUsuario', { 
        id_usuario: id 
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('USUARIO_NOT_FOUND');
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo usuario por ID:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_USUARIO');
    }
  }

  /**
   * Obtener usuario por nombre de usuario
   */
  async getUsuarioByUsername(username) {
    try {
      const result = await database.executeStoredProcedure('Seguridad.ObtenerUsuarioPorUsername', { 
        username 
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('USUARIO_NOT_FOUND');
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo usuario por username:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_USUARIO');
    }
  }

  /**
   * Crear nuevo usuario
   */
  async createUsuario(usuarioData) {
    try {
      const { username, password, tipo_perfil, id_parroquia } = usuarioData;
      
      // Validaciones de negocio
      await this.validateUsuarioData({ username, tipo_perfil, id_parroquia });
      
      const result = await database.executeStoredProcedure('Seguridad.CrearUsuario', {
        username: username.trim(),
        password: password, // El SP se encarga del hash
        tipo_perfil,
        id_parroquia: id_parroquia || null
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('ERROR_CREATING_USUARIO');
      }
      
      // Obtener el usuario completo creado
      const usuarioId = result.recordset[0].id_usuario;
      return await this.getUsuarioById(usuarioId);
    } catch (error) {
      console.error('Error creando usuario:', error);
      
      if (error.message.includes('nombre de usuario ya está en uso')) {
        throw new Error('USERNAME_ALREADY_EXISTS');
      }
      
      if (error.message.includes('tipo de perfil no es válido')) {
        throw new Error('INVALID_PROFILE_TYPE');
      }
      
      if (error.message.includes('deben tener una parroquia asignada')) {
        throw new Error('PARROQUIA_REQUIRED');
      }
      
      if (error.message.includes('Ya existe un párroco')) {
        throw new Error('PARROCO_ALREADY_EXISTS');
      }
      
      if (error.message.includes('parroquia especificada no existe')) {
        throw new Error('PARROQUIA_NOT_FOUND');
      }
      
      throw new Error('ERROR_CREATING_USUARIO');
    }
  }

  /**
   * Actualizar usuario
   */
  async updateUsuario(id, usuarioData) {
    try {
      const { username, tipo_perfil, id_parroquia } = usuarioData;
      
      // Verificar que el usuario existe
      await this.getUsuarioById(id);
      
      // Validaciones de negocio
      await this.validateUsuarioData({ username, tipo_perfil, id_parroquia }, id);
      
      const result = await database.executeStoredProcedure('Seguridad.ActualizarUsuario', {
        id_usuario: id,
        username: username.trim(),
        tipo_perfil,
        id_parroquia: id_parroquia || null
      });
      
      // Obtener el usuario actualizado
      return await this.getUsuarioById(id);
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        throw error;
      }
      
      if (error.message.includes('nombre de usuario ya está en uso')) {
        throw new Error('USERNAME_ALREADY_EXISTS');
      }
      
      if (error.message.includes('tipo de perfil no es válido')) {
        throw new Error('INVALID_PROFILE_TYPE');
      }
      
      if (error.message.includes('deben tener una parroquia asignada')) {
        throw new Error('PARROQUIA_REQUIRED');
      }
      
      if (error.message.includes('Ya existe un párroco')) {
        throw new Error('PARROCO_ALREADY_EXISTS');
      }
      
      if (error.message.includes('parroquia especificada no existe')) {
        throw new Error('PARROQUIA_NOT_FOUND');
      }
      
      throw new Error('ERROR_UPDATING_USUARIO');
    }
  }

  /**
   * Eliminar usuario
   */
  async deleteUsuario(id) {
    try {
      // Verificar que el usuario existe
      const usuario = await this.getUsuarioById(id);
      
      const result = await database.executeStoredProcedure('Seguridad.EliminarUsuario', {
        id_usuario: id
      });
      
      return usuario;
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_DELETING_USUARIO');
    }
  }

  /**
   * Cambiar contraseña
   */
  async cambiarContrasena(id, passwordActual, passwordNueva, isAdminChanging = false) {
    try {
      // Verificar que el usuario existe
      await this.getUsuarioById(id);
      
      if (isAdminChanging) {
        // Admin cambiando contraseña de otro usuario - actualizar directamente
        const hashedPassword = await bcrypt.hash(passwordNueva, 12);
        
        const result = await database.executeQuery(`
          UPDATE Seguridad.Usuario 
          SET password = @password 
          WHERE id_usuario = @id_usuario
        `, {
          id_usuario: id,
          password: hashedPassword
        });
        
        return true;
      } else {
        // Usuario cambiando su propia contraseña
        const result = await database.executeStoredProcedure('Seguridad.CambiarContrasena', {
          id_usuario: id,
          password_actual: passwordActual,
          password_nueva: passwordNueva
        });
        
        // El SP devuelve un parámetro de salida resultado (1 = exitoso, 0 = contraseña incorrecta)
        return true;
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        throw error;
      }
      
      // Si el SP devuelve 0, significa que la contraseña actual es incorrecta
      if (error.message.includes('contraseña actual') || error.message.includes('incorrecta')) {
        throw new Error('CURRENT_PASSWORD_INCORRECT');
      }
      
      throw new Error('ERROR_CHANGING_PASSWORD');
    }
  }

  /**
   * Obtener usuarios por parroquia
   */
  async getUsuariosByParroquia(idParroquia) {
    try {
      // Verificar que la parroquia existe
      const parroquiaExists = await database.executeQuery(
        'SELECT COUNT(*) as count FROM Parroquias.Parroquia WHERE id_parroquia = @id_parroquia',
        { id_parroquia: idParroquia }
      );
      
      if (parroquiaExists.recordset[0].count === 0) {
        throw new Error('PARROQUIA_NOT_FOUND');
      }
      
      const result = await database.executeStoredProcedure('Seguridad.ObtenerUsuariosPorParroquia', {
        id_parroquia: idParroquia
      });
      
      return result.recordset;
    } catch (error) {
      console.error('Error obteniendo usuarios por parroquia:', error);
      
      if (error.message === 'PARROQUIA_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_FETCHING_USUARIOS_BY_PARROQUIA');
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUsuariosStats(filtros = {}) {
    try {
      // Usar el stored procedure
      const result = await database.executeStoredProcedure('Seguridad.ObtenerEstadisticasUsuarios', {
        id_parroquia: filtros.id_parroquia || null
      });
      
      if (!result.recordset || result.recordset.length === 0) {
        // Devolver estadísticas vacías si no hay datos
        return {
          total_usuarios: 0,
          admins: 0,
          parrocos: 0,
          secretarias: 0,
          catequistas: 0,
          consultas: 0,
          parroquias_con_usuarios: 0
        };
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error obteniendo estadísticas de usuarios:', error);
      throw new Error('ERROR_FETCHING_STATS');
    }
  }

  /**
   * Buscar usuarios
   */
  async searchUsuarios(filtros) {
    try {
      const { search, id_parroquia, tipo_perfil } = filtros;
      
      // Usar el stored procedure
      const result = await database.executeStoredProcedure('Seguridad.BuscarUsuarios', {
        termino_busqueda: search,
        id_parroquia: id_parroquia || null,
        tipo_perfil: tipo_perfil || null
      });
      
      return result.recordset || [];
    } catch (error) {
      console.error('Error buscando usuarios:', error);
      throw new Error('ERROR_SEARCHING_USUARIOS');
    }
  }

  /**
   * Resetear contraseña (generar nueva contraseña aleatoria)
   */
  async resetPassword(id) {
    try {
      // Verificar que el usuario existe
      await this.getUsuarioById(id);
      
      // Generar nueva contraseña aleatoria
      const nuevaContrasena = this.generateRandomPassword();
      const hashedPassword = await bcrypt.hash(nuevaContrasena, 12);
      
      const result = await database.executeQuery(`
        UPDATE Seguridad.Usuario 
        SET password = @password 
        WHERE id_usuario = @id_usuario
      `, {
        id_usuario: id,
        password: hashedPassword
      });
      
      return nuevaContrasena;
    } catch (error) {
      console.error('Error reseteando contraseña:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_RESETTING_PASSWORD');
    }
  }

  /**
   * Activar/Desactivar usuario
   */
  async toggleUsuarioStatus(id, activo) {
    try {
      // Verificar que el usuario existe
      const usuario = await this.getUsuarioById(id);
      
      // Actualizar estado (asumiendo que hay un campo 'activo' en la tabla)
      const result = await database.executeQuery(`
        UPDATE Seguridad.Usuario 
        SET activo = @activo 
        WHERE id_usuario = @id_usuario
      `, {
        id_usuario: id,
        activo: activo
      });
      
      return await this.getUsuarioById(id);
    } catch (error) {
      console.error('Error actualizando estado del usuario:', error);
      
      if (error.message === 'USUARIO_NOT_FOUND') {
        throw error;
      }
      
      throw new Error('ERROR_UPDATING_STATUS');
    }
  }

  /**
   * Validar datos del usuario
   */
  async validateUsuarioData(data, excludeId = null) {
    const { username, tipo_perfil, id_parroquia } = data;
    
    // Validar que el username no esté vacío
    if (!username || username.trim().length < 3) {
      throw new Error('El nombre de usuario debe tener al menos 3 caracteres');
    }
    
    // Validar tipo de perfil
    const tiposValidos = ['admin', 'parroco', 'secretaria', 'catequista', 'consulta'];
    if (!tiposValidos.includes(tipo_perfil)) {
      throw new Error('INVALID_PROFILE_TYPE');
    }
    
    // Validar que ciertos perfiles tengan parroquia asignada
    if (['parroco', 'secretaria', 'catequista'].includes(tipo_perfil) && !id_parroquia) {
      throw new Error('PARROQUIA_REQUIRED');
    }
    
    // Validar que admin no tenga parroquia asignada
    if (tipo_perfil === 'admin' && id_parroquia) {
      throw new Error('Los administradores no deben tener parroquia asignada');
    }
    
    return true;
  }

  /**
   * Generar contraseña aleatoria
   */
  generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  }
}

module.exports = new UsuarioService();