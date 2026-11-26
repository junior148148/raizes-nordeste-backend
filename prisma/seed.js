const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const senhaHash = bcrypt.hashSync('Senha@123', 10);

  // 1. Criar usuários padrão (um Gerente e um Cliente)
  await prisma.usuario.upsert({
    where: { email: 'gerente@raizes.com' },
    update: {},
    create: {
      nome: 'Francisca Gestora',
      email: 'gerente@raizes.com',
      senhaHash,
      perfil: 'GERENTE',
      consentimentoLgpd: true,
      consentimentoEm: new Date(),
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'cliente@raizes.com' },
    update: {},
    create: {
      nome: 'João Cliente',
      email: 'cliente@raizes.com',
      senhaHash,
      perfil: 'CLIENTE',
      consentimentoLgpd: true,
      consentimentoEm: new Date(),
    },
  });

  // 2. Criar Unidades da franquia
  const recife = await prisma.unidade.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nome: 'Raízes do Nordeste - Recife Matriz', cidade: 'Recife' },
  });

  const brasilia = await prisma.unidade.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, nome: 'Raízes do Nordeste - Asa Norte', cidade: 'Brasília' },
  });

  // 3. Criar Produtos nordestinos
  const cuscuz = await prisma.produto.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nome: 'Cuscuz Recheado com Carne de Sol', descricao: 'Cuscuz quente com manteiga de garrafa', preco: 28.90 },
  });

  const tapioca = await prisma.produto.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, nome: 'Tapioca de Queijo Coalho', descricao: 'Tapioca crocante regional', preco: 18.50 },
  });

  const canjica = await prisma.produto.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, nome: 'Canjica Junina', descricao: 'Produto sazonal de São João', preco: 14.00, sazonal: true },
  });

  // 4. Criar Estoque por unidade (Tapioca com só 2 unidades para facilitar o teste de erro 409)
  const estoques = [
    { unidadeId: recife.id, produtoId: cuscuz.id, quantidade: 20 },
    { unidadeId: recife.id, produtoId: tapioca.id, quantidade: 2 },
    { unidadeId: recife.id, produtoId: canjica.id, quantidade: 10 },
    { unidadeId: brasilia.id, produtoId: cuscuz.id, quantidade: 15 },
    { unidadeId: brasilia.id, produtoId: tapioca.id, quantidade: 5 },
  ];

  for (const item of estoques) {
    await prisma.estoque.upsert({
      where: { unidadeId_produtoId: { unidadeId: item.unidadeId, produtoId: item.produtoId } },
      update: { quantidade: item.quantidade },
      create: item,
    });
  }

  console.log('Seed executado com sucesso! Usuários, unidades, produtos e estoques criados.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });