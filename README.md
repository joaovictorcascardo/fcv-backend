# FCV Backend

API da Plataforma de Benefícios e Relacionamento da Fundação Cristiano Varella.

É ela que guarda os dados no banco e responde ao aplicativo (Grupo 1), ao portal web (Grupo 3) e ao terminal de validação. Nenhuma dessas partes acessa o banco diretamente: todas pedem os dados para a API pela internet, em JSON.

**Tecnologias:** Node.js, TypeScript, Express, Knex, MySQL 8, JWT e bcrypt.

---

## Sumário

1. [Rodando a API na sua máquina](#1-rodando-a-api-na-sua-máquina)
2. [Usuários de teste](#2-usuários-de-teste)
3. [Autenticação: como integrar o login](#3-autenticação-como-integrar-o-login)
4. [Rotas disponíveis](#4-rotas-disponíveis)
5. [Respostas de erro](#5-respostas-de-erro)
6. [Acessando pelo celular (Expo)](#6-acessando-pelo-celular-expo)
7. [Estrutura do projeto](#7-estrutura-do-projeto)
8. [Fluxo de trabalho no Git](#8-fluxo-de-trabalho-no-git)

---

## 1. Rodando a API na sua máquina

### O que precisa estar instalado

| Programa | Versão | Para que serve |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | 22 ou mais nova | Executa a API |
| [MySQL Server](https://dev.mysql.com/downloads/mysql/) | 8 | Guarda os dados |
| [Git](https://git-scm.com) | qualquer | Baixa o projeto e envia as alterações |

Para conferir, abra o terminal e rode `node -v` e `git --version`. Se aparecer um número de versão, está instalado.

### Passo a passo

**1. Crie o banco vazio.** No MySQL Workbench (ou no terminal do MySQL), rode:

```sql
CREATE DATABASE fcv_beneficios;
```

Só isso. As tabelas não são criadas à mão: quem cria é a própria API, no passo 5.

**2. Baixe o projeto e entre na pasta:**

```bash
git clone https://github.com/joaovictorcascardo/fcv-backend.git
cd fcv-backend
git checkout develop
```

**3. Instale as dependências:**

```bash
npm install
```

Isso cria a pasta `node_modules` com as bibliotecas que a API usa. Ela não vai para o GitHub.

**4. Crie o arquivo `.env`.** Copie o `.env.example`, renomeie a cópia para `.env` e troque o valor de `DB_SENHA` pela senha do **seu** MySQL:

```env
PORTA=3333

DB_HOST=localhost
DB_PORTA=3306
DB_USUARIO=root
DB_SENHA=coloque_a_senha_do_seu_mysql
DB_NOME=fcv_beneficios

JWT_SEGREDO=troque-por-uma-frase-grande-e-secreta
JWT_EXPIRA_EM=8h
```

O `.env` guarda senhas e configurações da sua máquina, por isso ele **nunca** vai para o GitHub (está no `.gitignore`). O `.env.example` existe só para mostrar quais variáveis são necessárias.

**5. Crie as tabelas e os dados de teste:**

```bash
npm run db:reset
```

Esse comando apaga as tabelas, cria de novo a partir das migrations e preenche com os dados de teste (seeds). Pode rodar sempre que quiser voltar o banco ao estado inicial.

**6. Ligue a API:**

```bash
npm run dev
```

Deve aparecer `API rodando em http://localhost:3333`. Abra esse endereço no navegador: se aparecer `{"mensagem":"API da Plataforma FCV no ar"}`, está tudo certo.

O `npm run dev` reinicia a API sozinho sempre que você salva um arquivo. Para desligar, use `Ctrl + C` no terminal.

### Comandos do projeto

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Liga a API em modo de desenvolvimento |
| `npm run db:reset` | Recria todas as tabelas e os dados de teste |
| `npm run db:migrate` | Cria apenas as tabelas que ainda não existem |
| `npm run db:seed` | Apaga os dados e insere os dados de teste de novo |

---

## 2. Usuários de teste

Todos com a senha **`123456`**.

| E-mail | Perfil | Escopo | Observação |
| --- | --- | --- | --- |
| `admin@fcv.org.br` | FCV_ADMINISTRADOR | FCV | Acesso total |
| `operador@fcv.org.br` | FCV_OPERADOR | FCV | Equipe operacional |
| `carla@fcv.org.br` | COLABORADOR | COLABORADOR | Usuária do aplicativo |
| `diego@fcv.org.br` | COLABORADOR | COLABORADOR | Usuário do aplicativo |
| `elisa@fcv.org.br` | COLABORADOR | COLABORADOR | Usuária do aplicativo |
| `fabio@fcv.org.br` | COLABORADOR | COLABORADOR | **Inativo**: o login é recusado |
| `farmacia@parceiro.com` | CONVENIADO | CONVENIADO | Estabelecimento parceiro |
| `academia@parceiro.com` | CONVENIADO | CONVENIADO | Estabelecimento parceiro |
| `otica@parceiro.com` | CONVENIADO | CONVENIADO | Estabelecimento parceiro |

O usuário inativo serve para testar a mensagem de erro na tela de login.

---

## 3. Autenticação: como integrar o login

A API usa **JWT** (JSON Web Token). A ideia é parecida com a pulseira de um evento: você mostra o documento uma vez na entrada (login) e recebe uma pulseira (token). Depois disso, em vez de mostrar o documento de novo, você só mostra a pulseira em cada pedido.

### O fluxo completo

1. A tela de login envia e-mail e senha para `POST /api/v1/auth/login`.
2. A API confere e devolve um `token` e os dados do `usuario`.
3. O front guarda o token.
4. Em toda requisição seguinte, o front envia o token no cabeçalho:
   ```
   Authorization: Bearer <token>
   ```
5. O token vale **8 horas**. Quando vencer, a API responde `401` e o front deve mandar o usuário de volta para o login.

Para sair (logout), basta o front apagar o token guardado. Não existe rota de logout.

### Qual tela abrir depois do login

Use o campo `usuario.escopo` da resposta:

| `escopo` | Quem é | Onde entra |
| --- | --- | --- |
| `FCV` | Equipe da fundação | Portal web (Grupo 3) |
| `COLABORADOR` | Funcionário da FCV | Aplicativo (Grupo 1) |
| `CONVENIADO` | Estabelecimento parceiro | Área do conveniado |

Se alguém fizer login no lugar errado (por exemplo, um colaborador no portal), o front deve mostrar uma mensagem e não deixar entrar.

### `POST /api/v1/auth/login`

Envio:

```json
{
  "email": "carla@fcv.org.br",
  "senha": "123456"
}
```

Resposta `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 3,
    "nome": "Carla Souza",
    "email": "carla@fcv.org.br",
    "perfil_id": 3,
    "status": "ATIVO",
    "data_criacao": "2026-10-09 15:16:40",
    "perfil": "COLABORADOR",
    "escopo": "COLABORADOR"
  }
}
```

A senha nunca volta na resposta.

Possíveis erros:

| Status | Resposta | Quando acontece |
| --- | --- | --- |
| `400` | `Informe e-mail e senha` | Faltou um dos campos |
| `401` | `E-mail ou senha incorretos` | Usuário não existe ou senha errada |
| `403` | `Usuário inativo` | O cadastro está desativado |

A API responde a mesma mensagem para e-mail inexistente e senha errada de propósito: assim ninguém descobre quais e-mails estão cadastrados.

### `GET /api/v1/auth/eu`

Devolve os dados de quem está logado. Use quando o app ou o portal abrir e já existir um token guardado: se responder `200`, o usuário continua logado; se responder `401`, mande para a tela de login.

```
GET /api/v1/auth/eu
Authorization: Bearer <token>
```

A resposta tem os mesmos campos do `usuario` do login.

### Exemplo em JavaScript

Serve tanto para o React (portal) quanto para o React Native (aplicativo), porque os dois usam `fetch`:

```js
const API_URL = "http://localhost:3333/api/v1";

export async function login(email, senha) {
  const resposta = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro);
  }

  return dados;
}

export async function buscarUsuarioLogado(token) {
  const resposta = await fetch(`${API_URL}/auth/eu`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (resposta.status === 401) {
    return null;
  }

  return resposta.json();
}
```

Na tela de login, a mensagem de `error.message` pode ser mostrada direto para o usuário: ela já vem em português.

**Onde guardar o token:**

- Portal (React): `localStorage.setItem("token", dados.token)`
- Aplicativo (React Native): `expo-secure-store`, que guarda de forma criptografada no celular

---

## 4. Rotas disponíveis

Todas começam com `/api/v1`.

| Método | Rota | Quem pode usar | O que faz |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Qualquer pessoa | Faz login e devolve o token |
| `GET` | `/auth/eu` | Qualquer usuário logado | Dados de quem está logado |
| `GET` | `/perfis` | Escopo FCV | Lista os perfis de acesso |
| `GET` | `/perfis/:id` | Escopo FCV | Mostra um perfil |
| `POST` | `/perfis` | Escopo FCV | Cria um perfil |
| `PUT` | `/perfis/:id` | Escopo FCV | Altera um perfil |
| `DELETE` | `/perfis/:id` | Escopo FCV | Exclui um perfil |
| `GET` | `/usuarios` | Escopo FCV | Lista os usuários |
| `GET` | `/usuarios/:id` | Escopo FCV | Mostra um usuário |
| `POST` | `/usuarios` | Escopo FCV | Cria um usuário |
| `PUT` | `/usuarios/:id` | Escopo FCV | Altera um usuário |
| `DELETE` | `/usuarios/:id` | Escopo FCV | Exclui um usuário |

As demais tabelas (colaboradores, conveniados, benefícios, campanhas e utilizações) estão sendo implementadas e entram nesta lista quando chegarem à `main`.

### Exemplo: criar um usuário

```
POST /api/v1/usuarios
Authorization: Bearer <token de um usuário FCV>
Content-Type: application/json
```

```json
{
  "nome": "Maria Lima",
  "email": "maria@fcv.org.br",
  "senha": "123456",
  "perfil_id": 3
}
```

A senha é criptografada antes de ser salva. O `status` é opcional e começa como `ATIVO`.

No `PUT`, envie só os campos que mudaram. Se a senha não for enviada, ela continua a mesma.

---

## 5. Respostas de erro

Todo erro volta no mesmo formato, para o front tratar de um jeito só:

```json
{ "erro": "Mensagem em português" }
```

Erros vindos do banco trazem também um campo `detalhe`, com a mensagem original do MySQL, útil para quem está desenvolvendo.

| Status | Significado | Exemplo |
| --- | --- | --- |
| `400` | Dados inválidos | Campo obrigatório vazio, JSON mal formatado |
| `401` | Não está logado | Token ausente, inválido ou vencido |
| `403` | Logado, mas sem permissão | Colaborador tentando acessar `/usuarios` |
| `404` | Não encontrado | Rota ou registro inexistente |
| `409` | Conflito | E-mail já cadastrado, ou exclusão de registro ligado a outros |
| `500` | Erro interno | Falha inesperada. O detalhe aparece no terminal da API |

---

## 6. Acessando pelo celular (Expo)

No celular, `localhost` significa o próprio celular, não o seu computador. Por isso o aplicativo precisa usar o **IP do computador** onde a API está rodando.

1. No computador, rode `ipconfig` (Windows) e procure o **Endereço IPv4** do Wi-Fi, algo como `192.168.0.10`.
2. No aplicativo, troque a URL:
   ```js
   const API_URL = "http://192.168.0.10:3333/api/v1";
   ```
3. Celular e computador precisam estar **na mesma rede Wi-Fi**.
4. Na primeira vez que a API ligar, o Windows pode perguntar se o Node.js pode acessar a rede. Marque **Redes privadas** e permita.

Para testar, abra `http://192.168.0.10:3333` no navegador do celular. Se aparecer a mensagem da API, o aplicativo também vai conseguir acessar.

---

## 7. Estrutura do projeto

A API segue o padrão **MVC**: cada requisição passa por rota, controller e model, nessa ordem.

```
src/
  server.ts              liga a API na porta configurada
  app.ts                 configura o Express (JSON, CORS, rotas, erros)
  routes/                endereços da API e qual controller atende cada um
  controllers/           recebem a requisição, validam e montam a resposta
  models/                conversam com o banco (consultas com Knex)
  middlewares/
    autenticar.ts        confere o token JWT
    permitir.ts          confere se o escopo do usuário pode usar a rota
    erros.ts             transforma erros do MySQL em mensagens claras
  database/
    db.ts                conexão com o banco
    migrations/          criação das tabelas, em ordem numérica
    seeds/               dados de teste
requests/                requisições prontas para testar no VS Code
```

### Testando sem front

Os arquivos da pasta `requests/` funcionam com a extensão **REST Client** do VS Code. Abra um arquivo `.http` e clique em **Send Request** acima de cada requisição. Comece sempre pelo login, porque as outras reaproveitam o token dele.

---

## 8. Fluxo de trabalho no Git

| Branch | Para que serve |
| --- | --- |
| `develop` | Onde o grupo trabalha no dia a dia |
| `main` | Versão entregue, recebe a `develop` quando ela está testada |

Antes de começar a trabalhar:

```bash
git pull
npm install
npm run db:reset
```

Depois de terminar e testar uma parte:

```bash
git add .
git commit -m "feat: descreve o que foi feito"
git pull
git push
```

**Padrão das mensagens de commit:**

| Prefixo | Quando usar |
| --- | --- |
| `feat:` | Funcionalidade nova |
| `fix:` | Correção de erro |
| `docs:` | Documentação |
| `test:` | Arquivos de teste |
| `chore:` | Configuração e manutenção |

**Regras do banco:** nunca altere uma migration que já está na `develop`. Se uma tabela precisar mudar, crie uma migration nova. Assim o banco de todos continua igual.
