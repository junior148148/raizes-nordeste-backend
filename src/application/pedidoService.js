const prisma = require('../infrastructure/prismaClient');
const { registrarAuditoria } = require('../infrastructure/auditoriaRepo');
const { AppError } = require('../domain/errors');
const { CANAIS_PEDIDO, STATUS_PEDIDO } = require('../domain/enums');

async function criarPedido({ usuarioId, unidadeId, canalPedido, itens }) {
  if (!canalPedido || !CANAIS_PEDIDO.includes(canalPedido)) {
    throw new AppError(
      422,
      'CANAL_PEDIDO_INVALIDO',
      `O campo canalPedido é obrigatório e deve ser um de: ${CANAIS_PEDIDO.join(', ')}`,
      [{ field: 'canalPedido', issue: 'Valor ausente ou não permitido' }]
    );
  }

  if (!unidadeId || !Array.isArray(itens) || itens.length === 0) {
    throw new AppError(422, 'PEDIDO_INVALIDO', 'Informe unidadeId e pelo menos um item no pedido.');
  }

  const unidade = await prisma.unidade.findUnique({ where: { id: Number(unidadeId) } });
  if (!unidade) {
    throw new AppError(404, 'UNIDADE_NAO_ENCONTRADA', 'A unidade informada não existe.');
  }

  let total = 0;
  const itensPreparados = [];

  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    if (!item.produtoId || !Number.isInteger(item.quantidade) || item.quantidade <= 0) {
      throw new AppError(422, 'QUANTIDADE_INVALIDA', 'Cada item precisa de produtoId e quantidade inteira positiva.', [
        { field: `itens[${i}].quantidade`, issue: 'Deve ser maior que zero' },
      ]);
    }

    const produto = await prisma.produto.findUnique({ where: { id: Number(item.produtoId) } });
    if (!produto) {
      throw new AppError(404, 'PRODUTO_NAO_ENCONTRADO', `Produto ID ${item.produtoId} não encontrado.`);
    }

    const estoque = await prisma.estoque.findUnique({
      where: { unidadeId_produtoId: { unidadeId: unidade.id, produtoId: produto.id } },
    });

    if (!estoque || estoque.quantidade < item.quantidade) {
      const disponivel = estoque ? estoque.quantidade : 0;
      throw new AppError(409, 'ESTOQUE_INSUFICIENTE', `Estoque insuficiente para o produto ${produto.nome}.`, [
        { field: `itens[${i}].quantidade`, issue: `Disponível na unidade: ${disponivel}` },
      ]);
    }

    total += produto.preco * item.quantidade;
    itensPreparados.push({
      produtoId: produto.id,
      quantidade: item.quantidade,
      precoUnitario: produto.preco,
    });
  }

  // Transação: cria o pedido e dá baixa no estoque ao mesmo tempo
  const pedido = await prisma.$transaction(async (tx) => {
    for (const item of itensPreparados) {
      await tx.estoque.update({
        where: { unidadeId_produtoId: { unidadeId: unidade.id, produtoId: item.produtoId } },
        data: { quantidade: { decrement: item.quantidade } },
      });
    }

    return tx.pedido.create({
      data: {
        usuarioId,
        unidadeId: unidade.id,
        canalPedido,
        status: 'AGUARDANDO_PAGAMENTO',
        total: Number(total.toFixed(2)),
        itens: { create: itensPreparados },
      },
      include: { itens: true },
    });
  });

  await registrarAuditoria({
    usuarioId,
    acao: 'CRIAR_PEDIDO',
    entidade: 'Pedido',
    entidadeId: pedido.id,
    detalhes: { canalPedido, unidadeId: unidade.id, total: pedido.total },
  });

  return pedido;
}

async function listarPedidos({ usuario, canalPedido, status, page = 1, limit = 10 }) {
  const where = {};

  // LGPD: cliente comum só vê os próprios pedidos; gerente/cozinha vê da rede
  if (usuario.perfil === 'CLIENTE') {
    where.usuarioId = usuario.id;
  }

  if (canalPedido) {
    if (!CANAIS_PEDIDO.includes(canalPedido)) {
      throw new AppError(400, 'FILTRO_CANAL_INVALIDO', `canalPedido deve ser um de: ${CANAIS_PEDIDO.join(', ')}`);
    }
    where.canalPedido = canalPedido;
  }

  if (status) {
    where.status = status;
  }

  const pagina = Math.max(1, Number(page) || 1);
  const limite = Math.min(50, Math.max(1, Number(limit) || 10));

  const [totalRegistros, pedidos] = await Promise.all([
    prisma.pedido.count({ where }),
    prisma.pedido.findMany({
      where,
      include: { itens: true, pagamentos: true },
      orderBy: { criadoEm: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    }),
  ]);

  return { page: pagina, limit: limite, totalRegistros, dados: pedidos };
}

async function atualizarStatusPedido({ pedidoId, novoStatus, usuarioId }) {
  if (!STATUS_PEDIDO.includes(novoStatus)) {
    throw new AppError(422, 'STATUS_INVALIDO', `Status inválido. Use: ${STATUS_PEDIDO.join(', ')}`);
  }

  const pedido = await prisma.pedido.findUnique({ where: { id: Number(pedidoId) } });
  if (!pedido) {
    throw new AppError(404, 'PEDIDO_NAO_ENCONTRADO', 'Pedido não encontrado.');
  }

  const statusAnterior = pedido.status;
  const atualizado = await prisma.pedido.update({
    where: { id: pedido.id },
    data: { status: novoStatus },
  });

  await registrarAuditoria({
    usuarioId,
    acao: 'ATUALIZAR_STATUS_PEDIDO',
    entidade: 'Pedido',
    entidadeId: pedido.id,
    detalhes: { de: statusAnterior, para: novoStatus },
  });

  return atualizado;
}

module.exports = { criarPedido, listarPedidos, atualizarStatusPedido };