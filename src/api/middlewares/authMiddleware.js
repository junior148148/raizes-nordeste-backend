const jwt = require('jsonwebtoken');
const { AppError } = require('../../domain/errors');

const JWT_SECRET = process.env.JWT_SECRET || 'chave_dev_raizes';

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'TOKEN_AUSENTE', 'Token de autenticação não informado.'));
  }

  const token = authHeader.split(' ')[1];
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return next(new AppError(401, 'TOKEN_INVALIDO', 'Token inválido ou expirado.'));
  }
}

function autorizar(perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
      return next(
        new AppError(403, 'ACESSO_NEGADO', `Acesso restrito aos perfis: ${perfisPermitidos.join(', ')}.`)
      );
    }
    return next();
  };
}

module.exports = { autenticar, autorizar };