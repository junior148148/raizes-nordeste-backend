const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API Raízes do Nordeste - Back-End',
    version: '1.0.0',
    description: 'API REST multicanal com persistência SQLite/Prisma, JWT, LGPD, Pagamento Mock e Auditoria.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Cadastrar novo usuário com consentimento LGPD',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: {
                nome: 'Maria Silva',
                email: 'maria@exemplo.com',
                senha: 'Senha@123',
                perfil: 'CLIENTE',
                consentimentoLgpd: true,
              },
            },
          },
        },
        responses: { 201: { description: 'Usuário criado' }, 422: { description: 'Erro de validação/LGPD' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Autenticar e receber token JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: { email: 'cliente@raizes.com', senha: 'Senha@123' },
            },
          },
        },
        responses: { 200: { description: 'Token gerado' }, 401: { description: 'Credenciais inválidas' } },
      },
    },
    '/unidades': {
      get: { summary: 'Listar unidades da rede', responses: { 200: { description: 'Lista de unidades' } } },
    },
    '/unidades/{id}/cardapio': {
      get: {
        summary: 'Consultar cardápio disponível por unidade',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Cardápio da unidade' } },
      },
    },
    '/pedidos': {
      post: {
        summary: 'Criar pedido multicanal validando estoque',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: {
                unidadeId: 1,
                canalPedido: 'TOTEM',
                itens: [{ produtoId: 1, quantidade: 2 }],
              },
            },
          },
        },
        responses: {
          201: { description: 'Pedido criado' },
          401: { description: 'Sem token' },
          404: { description: 'Unidade/produto inexistente' },
          409: { description: 'Estoque insuficiente' },
          422: { description: 'canalPedido inválido ou ausente' },
        },
      },
      get: {
        summary: 'Listar pedidos com filtro por canalPedido e paginação',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'canalPedido', in: 'query', schema: { type: 'string', enum: ['APP', 'TOTEM', 'BALCAO', 'PICKUP', 'WEB'] } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Lista paginada de pedidos' } },
      },
    },
    '/pedidos/{id}/status': {
      patch: {
        summary: 'Atualizar status do pedido (Restrito a GERENTE ou COZINHA)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { example: { status: 'PRONTO' } } },
        },
        responses: { 200: { description: 'Status atualizado' }, 403: { description: 'Sem permissão' } },
      },
    },
    '/pagamentos/mock': {
      post: {
        summary: 'Simular pagamento externo (APROVADO ou RECUSADO)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: { pedidoId: 1, metodoPagamento: 'PIX', simularResultado: 'APROVADO' },
            },
          },
        },
        responses: { 200: { description: 'Pagamento aprovado' }, 402: { description: 'Pagamento recusado' } },
      },
    },
    '/auditoria': {
      get: {
        summary: 'Listar logs de auditoria de ações sensíveis (Restrito a GERENTE)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Logs de auditoria' }, 403: { description: 'Sem permissão' } },
      },
    },
    '/usuarios/me/anonimizar': {
      delete: {
        summary: 'Anonimizar dados pessoais do usuário logado (LGPD)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Dados anonimizados' } },
      },
    },
  },
};

module.exports = swaggerDocument;