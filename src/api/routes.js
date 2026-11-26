const express = require('express');
const prisma = require('../infrastructure/prismaClient');
const authService = require('../application/authService');
const pedidoService = require('../application/pedidoService');
const pagamentoService = require('../application/pagamentoService');
const { autenticar, autorizar } = require('./middlewares/authMiddleware');

const router = express.Router();

// --- AUTH & LGPD ---
router.post('/auth/register', async (req, res, next) => {
  try {
    const usuario = await authService.registrarUsuario(req.body);
    return res.status(201).json(usuario);
  } catch (err) { return next(err); }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const resultado = await authService.login(req.body);
    return res.status(200).json(resultado);
  } catch (err) { return next(err); }
});

router.delete('/usuarios/me/anonimizar', autenticar, async (req, res, next) => {
  try {
    const resultado = await authService.anonimizarUsuario(req.usuario.id);
    return res.status(200).json(resultado);
  } catch (err) { return next(err); }
});

// --- UNIDADES & CARDÁPIO ---
router.get('/unidades', async (req, res, next) => {
  try {
    const unidades = await prisma.unidade.findMany({ where: { ativa: true } });
    return res.status(200).json(unidades);
  } catch (err) { return next(err); }
});

router.get('/unidades/:id/cardapio', async (req, res, next) => {
  try {
    const estoques = await prisma.estoque.findMany({
      where: { unidadeId: Number(req.params.id), quantidade: { gt: 0 } },
      include: { produto: true },
    });
    const cardapio = estoques.map((e) => ({
      produtoId: e.produto.id,
      nome: e.produto.nome,
      descricao: e.produto.descricao,
      preco: e.produto.preco,
      sazonal: e.produto.sazonal,
      quantidadeDisponivel: e.quantidade,
    }));
    return res.status(200).json(cardapio);
  } catch (err) { return next(err); }
});

// --- PEDIDOS (MULTICANALIDADE) ---
router.post('/pedidos', autenticar, async (req, res, next) => {
  try {
    const pedido = await pedidoService.criarPedido({
      usuarioId: req.usuario.id,
      unidadeId: req.body.unidadeId,
      canalPedido: req.body.canalPedido,
      itens: req.body.itens,
    });
    return res.status(201).json(pedido);
  } catch (err) { return next(err); }
});

router.get('/pedidos', autenticar, async (req, res, next) => {
  try {
    const resultado = await pedidoService.listarPedidos({
      usuario: req.usuario,
      canalPedido: req.query.canalPedido,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.status(200).json(resultado);
  } catch (err) { return next(err); }
});

router.patch('/pedidos/:id/status', autenticar, autorizar(['GERENTE', 'COZINHA']), async (req, res, next) => {
  try {
    const atualizado = await pedidoService.atualizarStatusPedido({
      pedidoId: req.params.id,
      novoStatus: req.body.status,
      usuarioId: req.usuario.id,
    });
    return res.status(200).json(atualizado);
  } catch (err) { return next(err); }
});

// --- PAGAMENTO EXTERNO (MOCK) ---
router.post('/pagamentos/mock', autenticar, async (req, res, next) => {
  try {
    const resultado = await pagamentoService.processarPagamentoMock({
      pedidoId: req.body.pedidoId,
      metodoPagamento: req.body.metodoPagamento,
      simularResultado: req.body.simularResultado,
      usuarioId: req.usuario.id,
    });
    return res.status(resultado.statusCode).json(resultado.body);
  } catch (err) { return next(err); }
});

// --- AUDITORIA (RESTRITO A GERENTE) ---
router.get('/auditoria', autenticar, autorizar(['GERENTE']), async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { criadoEm: 'desc' },
      take: 50,
    });
    return res.status(200).json(logs);
  } catch (err) { return next(err); }
});

module.exports = router;