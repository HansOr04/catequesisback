const authService = require('../services/authService');
const response = require('../utils/response');

class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      response.success(res, result, 'Login exitoso');
    } catch (error) {
      if (error.message === 'INVALID_CREDENTIALS') {
        return response.unauthorized(res, 'Credenciales inválidas');
      }
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = req.user;
      response.success(res, user, 'Perfil obtenido exitosamente');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();