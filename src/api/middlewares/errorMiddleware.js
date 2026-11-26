const { AppError } = require('../../domain/errors');

function errorMiddleware(err, req, res, next) {
  const timestamp = new Date().toISOString();

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
      timestamp,
      path: req.originalUrl,
    });
  }

  console.error('Erro inesperado:', err);
  return res.status(500).json({
    error: 'ERRO_INTERNO',
    message: 'Ocorreu um erro interno no servidor.',
    details: [],
    timestamp,
    path: req.originalUrl,
  });
}

module.exports = { errorMiddleware };