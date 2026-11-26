const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../infrastructure/prismaClient');
const { registrarAuditoria } = require('../infrastructure/auditoriaRepo');
const { AppError } = require('../domain/errors');
const { PERFIS } = require('../domain/enums');

const JWT_SECRET = process.env.JWT_SECRET || 'chave_dev_raizes';

async function registrarUsuario({ nome, email, senha, perfil = 'CLIENTE', consentimentoLgpd }) {
  if (!nome || !email || !senha) {
    throw new AppError(422, 'DADOS_INVALIDOS', 'Nome, e-mail e senha são obrigatórios.');
  }
  if (!email.includes('@')) {
    throw new AppError(422, 'EMAIL_INVALIDO', 'Informe um e-mail válido.');
  }
  if (consentimentoLgpd !== true) {
    throw new AppError(422, 'LGPD_CONSENTIMENTO_OBRIGATORIO', 'É necessário aceitar os termos de privacidade (LGPD).');
  }
  if (!PERFIS.includes(perfil)) {
    throw new AppError(422, 'PERFIL_INVALIDO', `Perfil inválido. Use: ${PERFIS.join(', ')}`);
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    throw new AppError(409, 'EMAIL_JA_CADASTRADO', 'Já existe uma conta com este e-mail.');
  }

  const senhaHash = bcrypt.hashSync(senha, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash,
      perfil,
      consentimentoLgpd: true,
      consentimentoEm: new Date(),
    },
  });

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: 'CADASTRO_USUARIO',
    entidade: 'Usuario',
    entidadeId: usuario.id,
    detalhes: { perfil, consentimentoLgpd: true },
  });

  // LGPD: nunca devolver senhaHash na resposta
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    consentimentoLgpd: usuario.consentimentoLgpd,
  };
}

async function login({ email, senha }) {
  if (!email || !senha) {
    throw new AppError(400, 'CAMPOS_OBRIGATORIOS', 'E-mail e senha são obrigatórios.');
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !bcrypt.compareSync(senha, usuario.senhaHash)) {
    throw new AppError(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.');
  }

  const accessToken = jwt.sign(
    { id: usuario.id, perfil: usuario.perfil, nome: usuario.nome },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: 'LOGIN_REALIZADO',
    entidade: 'Usuario',
    entidadeId: usuario.id,
    detalhes: 'Autenticação via JWT bem-sucedida',
  });

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: 7200,
    user: {
      id: usuario.id,
      nome: usuario.nome,
      perfil: usuario.perfil,
    },
  };
}

async function anonimizarUsuario(usuarioId) {
  const emailAnonimo = `anonimizado_${usuarioId}_${Date.now()}@removido.local`;
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      nome: 'Usuário Anonimizado (LGPD)',
      email: emailAnonimo,
      consentimentoLgpd: false,
    },
  });

  await registrarAuditoria({
    usuarioId,
    acao: 'ANONIMIZACAO_LGPD',
    entidade: 'Usuario',
    entidadeId: usuarioId,
    detalhes: 'Dados pessoais anonimizados a pedido do titular, preservando histórico fiscal.',
  });

  return { message: 'Seus dados pessoais foram anonimizados conforme a LGPD.' };
}

module.exports = { registrarUsuario, login, anonimizarUsuario };