const USER_ROLES = {
    ADMIN: 'admin',
    PARROCO: 'parroco',
    SECRETARIA: 'secretaria',
    CATEQUISTA: 'catequista',
    CONSULTA: 'consulta'
  };
  
  const PERMISSIONS = {
    [USER_ROLES.ADMIN]: ['create', 'read', 'update', 'delete', 'list', 'approve', 'manage_users'],
    [USER_ROLES.PARROCO]: ['create', 'read', 'update', 'delete', 'list', 'approve'],
    [USER_ROLES.SECRETARIA]: ['create', 'read', 'update', 'list'],
    [USER_ROLES.CATEQUISTA]: ['read', 'list', 'update_attendance'],
    [USER_ROLES.CONSULTA]: ['read', 'list']
  };
  
  const ERROR_CODES = {
    INVALID_CREDENTIALS: 'AUTH_001',
    TOKEN_EXPIRED: 'AUTH_002',
    TOKEN_INVALID: 'AUTH_003',
    INSUFFICIENT_PERMISSIONS: 'AUTH_004'
  };
  
  module.exports = {
    USER_ROLES,
    PERMISSIONS,
    ERROR_CODES
  };