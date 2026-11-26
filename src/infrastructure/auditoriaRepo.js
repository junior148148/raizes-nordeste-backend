const prisma = require('./prismaClient');

async function registrarAuditoria({ usuarioId = null, acao, entidade, entidadeId = null, detalhes }) {
  return prisma.auditLog.create({
    data: {
      usuarioId,
      acao,
      entidade,
      entidadeId,
      detalhes: typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes),
    },
  });
}

module.exports = { registrarAuditoria };