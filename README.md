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
- **Postman** ou **Insomnia** (para importar e executar a coleção de testes)
- **Banco de dados:** SQLite (nativo via Prisma, não exige instalação de servidor externo)

---

## 3. Passo a Passo para Instalação e Execução

### 3.1. Clonar o repositório
```bash
git clone [https://github.com/junior148148/raizes-nordeste-backend.git](https://github.com/junior148148/raizes-nordeste-backend.git)
cd raizes-nordeste-backend