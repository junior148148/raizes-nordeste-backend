# API Back-End — Rede "Raízes do Nordeste"

Projeto Multidisciplinar (Trilha Back-End) — Curso de Análise e Desenvolvimento de Sistemas (UNINTER).

API REST desenvolvida em **Node.js + Express + Prisma ORM + SQLite** para gerenciar operações multicanal da rede de lanchonetes **Raízes do Nordeste**, com foco em regras de negócio, persistência em banco relacional, autenticação JWT, autorização por perfis (RBAC), conformidade com a LGPD, pagamento externo simulado (mock), logs de auditoria e documentação OpenAPI/Swagger.

- **Repositório oficial:** https://github.com/junior148148/raizes-nordeste-backend
- **Documentação Swagger local:** `http://localhost:3000/api-docs`
- **Coleção de Testes Postman:** `postman_collection.json` (na raiz deste repositório)

---

## 1. Arquitetura do Projeto (Camadas)

O projeto adota separação de responsabilidades em 4 camadas dentro de `src/`:

- `src/domain/`: enums de domínio (`canalPedido`, status e perfis) e classe de erro padronizado (`AppError`).
- `src/infrastructure/`: cliente do banco de dados (`PrismaClient`) e repositório de gravação de logs de auditoria (`auditoriaRepo.js`).
- `src/application/`: regras de negócio de autenticação/LGPD (`authService.js`), pedidos/estoque (`pedidoService.js`) e pagamento mock (`pagamentoService.js`).
- `src/api/`: rotas REST (`routes.js`), middlewares de autenticação/autorização e tratamento global de erros, e especificação OpenAPI (`swagger.js`).

---

## 2. Pré-requisitos

- **Node.js** versão 18 ou superior (recomendado LTS)
- **npm** (instalado junto com o Node.js)
- **Postman**, **Insomnia** ou **Newman** (para executar a coleção de testes)
- **Banco de dados:** SQLite (nativo via Prisma, não exige instalação de servidor externo)

---

## 3. Passo a Passo para Instalação e Execução

### 3.1. Clonar o repositório
```bash
git clone [https://github.com/junior148148/raizes-nordeste-backend.git](https://github.com/junior148148/raizes-nordeste-backend.git)
cd raizes-nordeste-backend
```

### 3.2. Instalar as dependências
```bash
npm install
```

### 3.3. Configurar as variáveis de ambiente
Copie o arquivo `.env.example` e renomeie a cópia para `.env`:
```bash
cp .env.example .env
```
*(No Windows Prompt de Comando, use `copy .env.example .env`.)*

Conteúdo padrão esperado no `.env`:
```env
PORT=3000
DATABASE_URL="file:./dev.db"
JWT_SECRET="chave_super_secreta_raizes_nordeste_2026"
```

### 3.4. Criar o banco de dados (Migrations) e popular dados iniciais (Seed)
```bash
npx prisma migrate dev --name init
node prisma/seed.js
```

O script `seed.js` cria automaticamente:
- **Usuário Gerente:** `gerente@raizes.com` | Senha: `Senha@123` (perfil `GERENTE`)
- **Usuário Cliente:** `cliente@raizes.com` | Senha: `Senha@123` (perfil `CLIENTE`)
- **Unidades:** Recife Matriz (ID `1`) e Brasília Asa Norte (ID `2`)
- **Produtos e Estoques:** Cuscuz Recheado (ID `1`, estoque 20), Tapioca de Queijo Coalho (ID `2`, estoque 2 — usado para validar erro `409`) e Canjica Junina sazonal (ID `3`, estoque 10).

### 3.5. Iniciar a API
```bash
node src/server.js
```
A API ficará disponível em `http://localhost:3000`.

---

## 4. Como Acessar a Documentação (Swagger/OpenAPI)

Com o servidor rodando, abra no navegador:
- **URL:** `http://localhost:3000/api-docs`

Para testar rotas protegidas pelo Swagger:
1. Execute `POST /auth/login` com um dos usuários do seed.
2. Copie o valor do campo `accessToken`.
3. Clique no botão **Authorize** (topo direito), cole o token e confirme.

---

## 5. Como Executar o Plano de Testes (Postman / Newman)

O arquivo **`postman_collection.json`** na raiz do repositório contém **15 cenários de teste** (8 positivos e 7 negativos), organizados em pastas e com scripts automáticos que salvam os tokens (`tokenCliente`, `tokenGerente`) e o ID do pedido (`pedidoId`).

### Opção A — Via Postman (Interface Gráfica)
1. Certifique-se de que executou o `seed.js` e que a API está rodando (`node src/server.js`).
2. Abra o **Postman**, clique em **Import** e selecione `postman_collection.json`.
3. Clique nos `...` da coleção e selecione **Run** para executar os 15 cenários em ordem.

### Opção B — Via Terminal (Newman — Runner oficial do Postman)
Com a API rodando em um terminal, abra outro terminal na pasta do projeto e execute:
```bash
npx newman run postman_collection.json
```

### Cobertura dos Cenários
- **01 - Auth e LGPD:** login de Cliente (`T01` - 200) e Gerente (`T02` - 200).
- **02 - Unidades e Cardápio:** consulta de cardápio disponível da unidade 1 (`T03` - 200).
- **03 - Pedidos (Multicanal):** criação de pedido válido no canal `TOTEM` (`T04` - 201) e filtro por `?canalPedido=TOTEM` (`T05` - 200).
- **04 - Pagamento Mock e Status:** pagamento recusado (`T06` - 402), pagamento aprovado (`T07` - 200) e troca de status para `PRONTO` como Gerente (`T08` - 200).
- **05 - Auditoria:** consulta a `GET /auditoria` como Gerente comprovando os logs gravados (`T09` - 200).
- **06 - Erros, Segurança e Validações:** sem token (`T10` - 401), perfil sem permissão (`T11` - 403), ausência de `canalPedido` (`T12` - 422), quantidade negativa (`T13` - 422), produto inexistente (`T14` - 404) e estoque insuficiente (`T15` - 409).

---

## 6. Segurança, LGPD e Auditoria

- **Minimização e Finalidade:** coleta apenas dados estritamente necessários para cadastro, processamento de pedidos e fidelização.
- **Consentimento Explícito:** exigido no registro (`consentimentoLgpd: true`) com registro de data/hora (`consentimentoEm`).
- **Armazenamento Seguro:** senhas armazenadas com hash `bcryptjs` e omitidas em todas as respostas JSON.
- **Anonimização (LGPD):** endpoint `DELETE /usuarios/me/anonimizar` anonimiza nome e e-mail do titular preservando a integridade histórica/fiscal dos pedidos.
- **Auditoria:** tabela `AuditLog` registra usuário, ação, entidade, ID afetado, detalhes e timestamp para ações sensíveis (login, criação de pedido, pagamentos, troca de status e anonimização).