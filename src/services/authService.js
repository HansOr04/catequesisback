// src/services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const database = require('../config/database');

class AuthService {
  generateToken(user) {
    const payload = {
      id_usuario: user.id_usuario,
      username: user.username,
      tipo_perfil: user.tipo_perfil,
      id_parroquia: user.id_parroquia
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  async login(username, password) {
    try {
      console.log('🔐 Intentando login para usuario:', username);
      
      // Primero intentar obtener el usuario
      let result;
      try {
        result = await database.executeStoredProcedure(
          'Seguridad.ObtenerUsuarioPorUsername',
          { username }
        );
      } catch (spError) {
        console.log('❌ Error con SP, intentando query directa:', spError.message);
        
        // Si falla el SP, usar query directa
        result = await database.executeQuery(`
          SELECT 
            u.id_usuario,
            u.username,
            u.password,
            u.tipo_perfil,
            u.id_parroquia,
            u.activo,
            p.nombre as nombre_parroquia
          FROM Seguridad.Usuario u
          LEFT JOIN Parroquias.Parroquia p ON u.id_parroquia = p.id_parroquia
          WHERE u.username = @username
        `, { username });
      }

      console.log('📊 Resultado de búsqueda:', result.recordset ? 'Encontrado' : 'No encontrado');

      if (!result.recordset || result.recordset.length === 0) {
        console.log('❌ Usuario no encontrado');
        throw new Error('INVALID_CREDENTIALS');
      }

      const user = result.recordset[0];
      console.log('👤 Usuario encontrado:', {
        id: user.id_usuario,
        username: user.username,
        tipo_perfil: user.tipo_perfil,
        activo: user.activo
      });

      // Verificar si el usuario está activo
      if (user.activo === false) {
        console.log('❌ Usuario inactivo');
        throw new Error('USER_INACTIVE');
      }

      // Verificar contraseña
      let passwordValid = false;
      
      if (user.password) {
        // Si hay contraseña hasheada, compararla
        try {
          passwordValid = await this.comparePassword(password, user.password);
          console.log('🔒 Verificación de contraseña hasheada:', passwordValid ? 'Válida' : 'Inválida');
        } catch (bcryptError) {
          console.log('❌ Error verificando hash, probando contraseña plana');
          // Si falla bcrypt, tal vez sea contraseña plana (para desarrollo)
          passwordValid = (password === user.password);
        }
      } else {
        // Para desarrollo/pruebas - permitir credenciales por defecto
        console.log('⚠️ No hay contraseña en BD, usando credenciales por defecto');
        passwordValid = (username === 'admin' && password === 'admin123') ||
                       (username === 'parroco' && password === 'parroco123') ||
                       (username === 'secretaria' && password === 'secretaria123');
      }

      if (!passwordValid) {
        console.log('❌ Contraseña inválida');
        throw new Error('INVALID_CREDENTIALS');
      }

      console.log('✅ Login exitoso');

      // Preparar datos del usuario (sin password)
      const userData = {
        id_usuario: user.id_usuario,
        username: user.username,
        tipo_perfil: user.tipo_perfil,
        id_parroquia: user.id_parroquia,
        nombre_parroquia: user.nombre_parroquia || null
      };

      const token = this.generateToken(userData);
      
      return { 
        user: userData, 
        token 
      };
    } catch (error) {
      console.error('❌ Error en login:', error.message);
      
      if (error.message === 'INVALID_CREDENTIALS' || error.message === 'USER_INACTIVE') {
        throw error;
      }
      
      throw new Error('LOGIN_ERROR');
    }
  }

  // Método para crear usuario inicial de prueba
  async createTestUser() {
    try {
      const testUsers = [
        {
          username: 'admin',
          password: 'admin123',
          tipo_perfil: 'admin',
          id_parroquia: null
        },
        {
          username: 'parroco',
          password: 'parroco123',
          tipo_perfil: 'parroco',
          id_parroquia: 1
        },
        {
          username: 'secretaria',
          password: 'secretaria123',
          tipo_perfil: 'secretaria',
          id_parroquia: 1
        }
      ];

      for (const testUser of testUsers) {
        try {
          // Verificar si ya existe
          const exists = await database.executeQuery(
            'SELECT COUNT(*) as count FROM Seguridad.Usuario WHERE username = @username',
            { username: testUser.username }
          );

          if (exists.recordset[0].count === 0) {
            const hashedPassword = await this.hashPassword(testUser.password);
            
            await database.executeQuery(`
              INSERT INTO Seguridad.Usuario (username, password, tipo_perfil, id_parroquia, activo)
              VALUES (@username, @password, @tipo_perfil, @id_parroquia, 1)
            `, {
              username: testUser.username,
              password: hashedPassword,
              tipo_perfil: testUser.tipo_perfil,
              id_parroquia: testUser.id_parroquia
            });
            
            console.log(`✅ Usuario de prueba creado: ${testUser.username}`);
          }
        } catch (userError) {
          console.log(`⚠️ No se pudo crear usuario ${testUser.username}:`, userError.message);
        }
      }
    } catch (error) {
      console.log('⚠️ Error creando usuarios de prueba:', error.message);
    }
  }
}

module.exports = new AuthService();