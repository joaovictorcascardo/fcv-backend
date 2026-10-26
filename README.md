# FCV Backend

API da Plataforma de Benefícios e Relacionamento da Fundação Cristiano Varella.

Ela guarda os dados no banco e responde ao aplicativo (Grupo 1), ao portal web (Grupo 3) e ao terminal de validação. Nenhuma dessas partes acessa o banco diretamente: todas pedem os dados para a API, em JSON.

**Tecnologias:** Node.js, TypeScript, Express, Knex, MySQL 8, JWT e bcrypt.

## Sumário

1. [Rodando a API na sua máquina](#1-rodando-a-api-na-sua-máquina)
2. [Documentação das rotas](#2-documentação-das-rotas)
3. [Usuários de teste](#3-usuários-de-teste)
4. [Autenticação: como integrar o login](#4-autenticação-como-integrar-o-login)
5. [Respostas de erro](#5-respostas-de-erro)
6. [Acessando pelo celular (Expo)](#6-acessando-pelo-celular-expo)
7. [Estrutura do projeto](#7-estrutura-do-projeto)
8. [Fluxo de trabalho no Git](#8-fluxo-de-trabalho-no-git)

---

## 1. Rodando a API na sua máquina

Precisa ter instalado o [Node.js](https://nodejs.org) 22 ou mais novo, o [MySQL Server](https://dev.mysql.com/downloads/mysql/) 8 e o [Git](https://git-scm.com).

**1. Crie o banco vazio** no MySQL Workbench:

```sql
CREATE DATABASE fcv_beneficios;
```

As tabelas não são criadas à mão: quem cria é a própria API, no passo 5.

**2. Baixe o projeto:**

```bash
git clone https://github.com/joaovictorcascardo/fcv-backend.git
cd fcv-backend
```

**3. Instale as dependências:**

```bash
npm install
```

**4. Crie o arquivo `.env`.** Copie o `.env.example`, renomeie a cópia para `.env` e troque o `DB_SENHA` pela senha do **seu** MySQL. O `.env` guarda senhas da sua máquina, por isso nunca vai para o GitHub.

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

**5. Crie as tabelas e os dados de teste:**

```bash
npm run db:reset
```

Pode rodar sempre que quiser voltar o banco ao estado inicial.

**6. Ligue a API:**

```bash
npm run dev
```

Abra http://localhost:3333 no navegador. Se aparecer `{"mensagem":"API da Plataforma FCV no ar"}`, está funcionando. Para desligar, use `Ctrl + C`.

---

## 2. Documentação das rotas

Com a API rodando, abra **http://localhost:3333/api/v1/docs**.

Lá estão todas as rotas com os campos de cada uma (obrigatórios, tamanhos e valores aceitos), exemplos prontos e as respostas possíveis. Dá para testar pelo navegador:

1. Abra `POST /auth/login`, clique em **Try it out** e depois em **Execute**.
2. Copie o `token` da resposta.
3. Clique em **Authorize** no topo da página e cole o token.
4. Agora qualquer rota funciona com **Try it out** → **Execute**.

Resumo das rotas (todas começam com `/api/v1`):

| Rota | Quem pode usar | O que guarda |
| --- | --- | --- |
| `/auth/login` e `/auth/eu` | Qualquer pessoa / usuário logado | Login e dados de quem está logado |
| `/auth/registrar` | Qualquer pessoa | Colaborador cria a própria conta (nasce inativa até a FCV liberar) |
| `/auth/esqueci-senha` e `/auth/redefinir-senha` | Qualquer pessoa | Pede um código de 6 dígitos e troca a senha com ele |
| `/perfis` | Ver: escopo FCV. Criar, alterar e excluir: só `FCV_ADMINISTRADOR` | Perfis de acesso |
| `/usuarios` | Ver: escopo FCV. Criar, alterar e excluir: só `FCV_ADMINISTRADOR` | Contas de acesso (a senha é criptografada) |
| `/colaboradores` | Escopo FCV | Dados de RH do colaborador |
| `/conveniados` | Ver: usuário logado. Criar, alterar e excluir: escopo FCV | Estabelecimentos parceiros |
| `/beneficios` | Ver: usuário logado. Criar, alterar e excluir: escopo FCV | Benefícios permanentes e suas regras de uso |
| `/ofertas` | Ver: usuário logado. Criar, alterar e excluir: escopo FCV | Qual conveniado oferece qual benefício |
| `/campanhas` | Ver: usuário logado. Criar, alterar e excluir: escopo FCV | Campanhas e eventos com período definido |
| `/itens-campanha` | Ver: usuário logado. Criar, alterar e excluir: escopo FCV | Benefícios que fazem parte de uma campanha |
| `/ofertas-campanha` | Ver: usuário logado. Criar, alterar e excluir: escopo FCV | Qual conveniado oferece qual item de campanha |
| `/utilizacoes` | Escopo FCV | Cada uso de um benefício, com token do QR Code e status |
| `/eu/utilizacoes` | Colaborador e conveniado logados | Histórico de quem está logado, com filtros `status`, `de` e `ate` |

Fora o `/auth`, todas têm as cinco operações: `GET /rota` lista, `GET /rota/:id` mostra um, `POST /rota` cria, `PUT /rota/:id` altera (envie só os campos que mudaram) e `DELETE /rota/:id` exclui. A exceção é `/utilizacoes`: o `DELETE` cancela pelo status e nunca apaga (veja a [seção 10](#10-s4-06--preservação-do-histórico)).

---

## 3. Usuários de teste

Todos com a senha **`123456`**.

| E-mail | Escopo | Observação |
| --- | --- | --- |
| `admin@fcv.org.br` | FCV | Administrador: único que cria e altera usuários e perfis |
| `operador@fcv.org.br` | FCV | Equipe operacional: vê usuários e perfis, mas não altera |
| `carla@fcv.org.br`, `diego@fcv.org.br` | COLABORADOR | Usuários do aplicativo |
| `elisa@fcv.org.br` | COLABORADOR | **Afastada**: o login é recusado |
| `fabio@fcv.org.br` | COLABORADOR | **Inativo**: serve para testar o login recusado |
| `farmacia@parceiro.com`, `academia@parceiro.com` | CONVENIADO | Estabelecimentos parceiros |
| `otica@parceiro.com` | CONVENIADO | **Em análise**: o login é recusado |

---

## 4. Autenticação: como integrar o login

A API usa **JWT**. Funciona como a pulseira de um evento: você mostra o documento uma vez na entrada (login) e recebe uma pulseira (token). Depois, em cada pedido, só mostra a pulseira.

1. A tela de login envia `email` e `senha` para `POST /api/v1/auth/login`.
2. A API devolve um `token` e os dados do `usuario` (a senha nunca volta).
3. O front guarda o token.
4. Em toda requisição seguinte, envia o token no cabeçalho `Authorization: Bearer <token>`.
5. O token vale **8 horas**. Quando vencer, a API responde `401` e o front volta para o login.

Para sair, basta o front apagar o token. Ao abrir o app ou o portal com um token já guardado, chame `GET /api/v1/auth/eu`: se vier `200`, o usuário continua logado; se vier `401` ou `403`, mande para o login.

**Acesso retirado vale na hora:** a cada requisição a API confere no banco se o usuário, o perfil e o vínculo (colaborador ou conveniado) continuam ativos. Se a FCV inativar ou afastar alguém, o token dessa pessoa para de funcionar na próxima chamada (`403`), sem esperar as 8 horas.

**Criar conta (colaborador):** a tela de cadastro envia nome, e-mail, senha, matrícula, setor, cargo e data de admissão para `POST /api/v1/auth/registrar`. A conta nasce `INATIVO`, então o login responde `403` até a FCV liberar pelo portal (`PUT /api/v1/usuarios/:id` com `"status": "ATIVO"`).

**Esqueci minha senha:** `POST /api/v1/auth/esqueci-senha` com o `email` gera um código de 6 dígitos que vale 15 minutos. A resposta é sempre a mesma e **não traz o código** (senão qualquer um trocaria a senha de outra pessoa). Ainda não há envio por e-mail: no protótipo o código aparece **só no terminal da API**. A tela seguinte envia `email`, `codigo` e `nova_senha` para `POST /api/v1/auth/redefinir-senha`. O código vale para 5 tentativas, e cada usuário pode pedir no máximo 3 códigos por hora.

**Qual tela abrir depois do login**, pelo campo `usuario.escopo`:

| `escopo` | Quem é | Onde entra |
| --- | --- | --- |
| `FCV` | Equipe da fundação | Portal web (Grupo 3) |
| `COLABORADOR` | Funcionário da FCV | Aplicativo (Grupo 1) |
| `CONVENIADO` | Estabelecimento parceiro | Área do conveniado |

Se alguém entrar no lugar errado (um colaborador no portal, por exemplo), o front mostra uma mensagem e não deixa entrar.

**Exemplo em JavaScript**, serve para React e React Native:

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

A mensagem de `error.message` já vem em português e pode ser mostrada direto na tela.

**Onde guardar o token:** no portal, `localStorage.setItem("token", dados.token)`; no aplicativo, `expo-secure-store`.

---

## 5. Respostas de erro

Todo erro volta no mesmo formato:

```json
{ "erro": "Mensagem em português" }
```

| Status | Significado | Exemplo |
| --- | --- | --- |
| `400` | Dados inválidos | Campo obrigatório vazio, JSON mal formatado |
| `401` | Não está logado | Token ausente, inválido ou vencido |
| `403` | Sem permissão | Colaborador acessando `/usuarios`, operador criando um usuário, conta inativa, afastada ou em análise |
| `404` | Não encontrado | Rota ou registro inexistente |
| `409` | Conflito | E-mail já cadastrado, exclusão de registro ligado a outros |
| `500` | Erro interno | O detalhe aparece no terminal da API |

---

## 6. Acessando pelo celular (Expo)

No celular, `localhost` é o próprio celular. O aplicativo precisa usar o **IP do computador** onde a API está rodando.

1. No computador, rode `ipconfig` e pegue o **Endereço IPv4** do Wi-Fi (algo como `192.168.0.10`).
2. No aplicativo, use `const API_URL = "http://192.168.0.10:3333/api/v1";`
3. Celular e computador precisam estar **na mesma rede Wi-Fi**.
4. Se o Windows perguntar se o Node.js pode acessar a rede, marque **Redes privadas** e permita.

Para testar, abra `http://192.168.0.10:3333` no navegador do celular.

---

## 7. Estrutura do projeto

A API segue o padrão **MVC**: cada requisição passa por rota, controller e model.

```
src/
  server.ts          liga a API
  app.ts             configura o Express (JSON, CORS, rotas, erros)
  routes/            endereços da API
  controllers/       recebem a requisição e montam a resposta
  models/            consultas no banco com Knex
  middlewares/       token (autenticar), escopo (permitir) e erros
  database/          conexão, migrations e seeds
  docs/swagger.ts    documentação exibida em /api/v1/docs
requests/            requisições de teste para a extensão REST Client do VS Code
```

---

## 8. Fluxo de trabalho no Git

Para quem programa a API. Cada integrante trabalha em uma branch individual; `develop` reúne as entregas aprovadas e `main` recebe a `develop` depois dos testes integrados.

Para começar em uma nova cópia limpa:

```bash
git clone https://github.com/joaovictorcascardo/fcv-backend.git
cd fcv-backend
git switch develop
git pull --ff-only origin develop
git switch -c feature/seu-nome-sua-task
npm ci
```

Atalho para o clone: `git clone -b develop https://github.com/joaovictorcascardo/fcv-backend.git`. Depois entre na pasta e crie sua branch individual. O prefixo `feature/` é um exemplo; esta entrega de Samuel C. já usa `feat/samuel-c-consultas`, sem precisar renomeá-la. Não repita a criação de uma cópia limpa sobre trabalho local existente.

Depois de terminar, revisar e testar, selecione somente os arquivos da entrega com `git add caminho/do/arquivo`. Commits podem ser criados localmente; para enviar a branch, é necessária permissão de escrita no repositório:

```bash
git status
git diff
# Depois de selecionar os arquivos revisados:
git commit -m "feat: descreve o que foi feito"
git push -u origin feature/seu-nome-sua-task
```

Use o nome real da sua branch no push. Abra um PR da branch individual para **`develop`**, peça revisão e resolva conflitos na branch individual. Repita os testes e integre somente após aprovação. Depois que a `develop` integrada estiver testada, abra um PR **`develop → main`**. Este fluxo não presume deploy automático do backend.

Prefixos de commit: `feat:` funcionalidade nova, `fix:` correção, `docs:` documentação, `test:` testes, `chore:` configuração.

**Regras:**

- Nunca altere uma migration que já está na `develop`. Se uma tabela precisar mudar, crie uma migration nova.
- Ao criar ou mudar uma rota, atualize também o `src/docs/swagger.ts`.
- Não use reset do banco como passo de Git. Migrations e seeds de teste só devem atingir a base dedicada, sem apagar a base da apresentação.

---

## 9. Sprint 4 — entrega local de Samuel C.

Na Sprint 4, o **Grupo 3 cuida do backend**, o Grupo 1 do portal web e o Grupo 2 do aplicativo. Esta seção complementa a documentação histórica acima e aplica o fluxo de trabalho da seção 8 à entrega de Samuel C.

A parte de Samuel C. compreende S4-01 (contrato com os consumidores) e S4-07 (filtros, ordenação e paginação no servidor), mantendo Knex e MySQL. A implementação está na branch `feat/samuel-c-consultas`, aguardando revisão e integração pela equipe. O aceite do contrato pelos Grupos 1 e 2 permanece pendente.

- [Contrato completo, matriz de acesso e roteiro de demonstração](docs/contrato-listagens-sprint4.md).
- [Exemplos de leitura para REST Client](requests/listagens.http).
- Swagger: `http://localhost:3333/api/v1/docs`.

As dez listagens preservam o **array completo** quando `pagina` e `limite` não são enviados. Enviar um desses parâmetros ativa `{ dados, paginacao }`, com página padrão 1 e limite padrão 20, de 1 a 100. Os filtros e campos de ordenação permitidos de cada recurso estão no contrato. O portal atual pode continuar consumindo os arrays sem truncamento silencioso.

Verifique esta entrega com:

```bash
npm ci
npm run check
npm test
```

Use banco dedicado para testes de integração. **Não use `db:reset` nem seeds de limpeza na base existente da apresentação.** A busca não requer apagar dados. Segredos e tokens ficam somente na configuração local.

Para iniciar uma cópia limpa: clone o repositório, entre na pasta, execute `git switch develop`, atualize com `git pull --ff-only origin develop` e crie uma branch individual com `git switch -c feature/seu-nome-sua-task`. O atalho de clone é `git clone -b develop https://github.com/joaovictorcascardo/fcv-backend.git`. Os nomes são individuais; esta entrega local já usa `feat/samuel-c-consultas`, sem precisar renomeá-la. Não repita o início de uma cópia limpa sobre alterações locais existentes.

Quando receber acesso, revise os arquivos, teste e faça seus próprios commits `feat:`. Abra um PR da branch individual para **`develop`**; resolva conflitos nessa branch, repita os testes e integre somente após aprovação. Depois de testar a `develop` integrada, abra um PR **`develop → main`**. Não se presume deploy automático do backend. As tasks não foram confirmadas automaticamente no Notion.

---

## 10. S4-06 — preservação do histórico

O histórico de uso dos benefícios não pode sumir. Por isso:

- **Utilizações nunca são apagadas.** `DELETE /utilizacoes/:id` cancela mudando o status: `PENDENTE` vira `REPROVADA` e `APROVADA` vira `ESTORNADA`, com "Cancelada pela FCV" nas observações. Se já estiver `REPROVADA` ou `ESTORNADA`, responde `409`.
- **Cadastros do catálogo com utilizações não são excluídos.** Benefício, oferta, campanha, item de campanha e oferta de campanha respondem `409` quando há utilização ligada, e a mensagem diz para inativar (`INATIVO`, `DESCONTINUADO`, `ENCERRADA` ou `CANCELADA`). Oferta comum e oferta de campanha são conferidas cada uma pela sua própria FK.
- **O banco também protege.** As FKs da tabela `utilizacao` (migration 10) não têm `CASCADE`: o MySQL recusa apagar uma oferta que tenha utilização.
- **O `CASCADE` das migrations 08 e 09 foi revisado e mantido.** Ao excluir uma campanha ou um item, ele apaga junto os itens e as ofertas de campanha, mas isso só acontece quando não há utilização nenhuma, porque a API bloqueia antes com `409`. Nenhuma migration existente foi alterada.
- O `CASCADE` da migration 11 só apaga códigos de troca de senha do usuário excluído; não é histórico.
