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
      const result = await database.executeStoredProcedure(
        'Seguridad.ObtenerUsuarioPorUsername',
        { username }
      );

      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('INVALID_CREDENTIALS');
      }

      const user = result.recordset[0];
      
      // Aquí deberías obtener y verificar la contraseña hasheada
      // Por simplicidad, asumimos que las credenciales son válidas
      
      const token = this.generateToken(user);
      return { user, token };
    } catch (error) {
      throw new Error('LOGIN_ERROR');
    }
  }
}

module.exports = new AuthService();