const prisma = require('../infrastructure/prismaClient');
const { registrarAuditoria } = require('../infrastructure/auditoriaRepo');
const { AppError } = require('../domain/errors');

async function processarPagamentoMock({ pedidoId, metodoPagamento = 'PIX', simularResultado = 'APROVADO', usuarioId }) {
  if (!pedidoId) {
    throw new AppError(422, 'DADOS_INVALIDOS', 'O campo pedidoId é obrigatório.');
  }

  if (!['APROVADO', 'RECUSADO'].includes(simularResultado)) {
    throw new AppError(422, 'SIMULACAO_INVALIDA', 'simularResultado deve ser APROVADO ou RECUSADO.');
  }

  const pedido = await prisma.pedido.findUnique({ where: { id: Number(pedidoId) } });
  if (!pedido) {
    throw new AppError(404, 'PEDIDO_NAO_ENCONTRADO', 'Pedido não encontrado para pagamento.');
  }

  if (pedido.status === 'EM_PREPARO' || pedido.status === 'ENTREGUE') {
    throw new AppError(409, 'PEDIDO_JA_PAGO', 'Este pedido já teve o pagamento aprovado.');
  }

  const novoStatusPedido = simularResultado === 'APROVADO' ? 'EM_PREPARO' : 'PAGAMENTO_RECUSADO';
  const codigoTransacao = `MOCK-${Date.now()}`;

  const pagamento = await prisma.pagamento.create({
    data: {
      pedidoId: pedido.id,
      metodoPagamento,
      status: simularResultado,
      codigoTransacao,
    },
  });

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: { status: novoStatusPedido },
  });

  // Se aprovado e cliente tiver consentimento LGPD, acumula pontos de fidelidade (1 ponto por R$ 10)
  if (simularResultado === 'APROVADO') {
    const pontos = Math.floor(pedido.total / 10);
    if (pontos > 0) {
      await prisma.usuario.updateMany({
        where: { id: pedido.usuarioId, consentimentoLgpd: true },
        data: { pontosFidelidade: { increment: pontos } },
      });
    }
  }

  await registrarAuditoria({
    usuarioId,
    acao: `PAGAMENTO_MOCK_${simularResultado}`,
    entidade: 'Pagamento',
    entidadeId: pagamento.id,
    detalhes: { pedidoId: pedido.id, metodoPagamento, statusPedido: novoStatusPedido },
  });

  if (simularResultado === 'RECUSADO') {
    return {
      statusCode: 402,
      body: {
        error: 'PAGAMENTO_RECUSADO',
        message: 'Pagamento recusado pelo gateway externo (mock).',
        pagamento,
        novoStatusPedido,
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      message: 'Pagamento aprovado com sucesso (mock).',
      pagamento,
      novoStatusPedido,
    },
  };
}

module.exports = { processarPagamentoMock };