# Sprint 4 — contrato de listagens de Samuel C.

Esta entrega trata de **S4-01 (contrato com web e mobile)** e **S4-07 (filtros, ordenação e paginação no servidor)**. O backend continua usando Express, TypeScript, Knex e MySQL. Não altera CSS ou telas do portal.

**Situação da integração:** consultas, autenticação, catálogo e cadastros foram integrados na `develop`. As correções da auditoria acrescentam paginação ao histórico próprio, filtros por benefício e validações descritas em [correcoes-auditoria-sprint4.md](correcoes-auditoria-sprint4.md). O aceite dos contratos pelos Grupos 1 (web) e 2 (mobile) continua pendente; este documento não representa confirmação de participação no Notion.

## 1. Dois formatos, sem truncamento silencioso

Todas as URLs abaixo começam com `/api/v1`. As dez coleções aceitam o mesmo contrato comum.

### Modo compatível com o portal atual

```http
GET /api/v1/colaboradores
Authorization: Bearer <token>
```

Sem `pagina` e sem `limite`, a resposta continua sendo **um array completo**. Filtros e ordenação podem ser usados nesse modo, sem trocar o formato nem limitar a quantidade de registros. O portal atual carrega as dez coleções como arrays e usa essa base em relatórios, históricos, vínculos e calendário.

### Modo paginado explícito

```http
GET /api/v1/colaboradores?pagina=1&limite=20&ordenarPor=id&ordem=asc
Authorization: Bearer <token>
```

Enviar **pelo menos um** entre `pagina` e `limite` ativa a paginação no SQL e o envelope:

```json
{
  "dados": [],
  "paginacao": {
    "pagina": 1,
    "limite": 20,
    "total": 0,
    "totalPaginas": 0
  }
}
```

`total` é a quantidade que corresponde aos mesmos filtros e ao mesmo escopo da consulta, antes de limitar a página. Não é o tamanho de `dados`. Sem resultados, os totais são zero. Uma página além do fim retorna `dados: []` e mantém o total real; não muda silenciosamente para outra página.

Não tornar a paginação padrão antes de combinar a migração dos consumidores. Apenas ajustar a tipagem do frontend não corrige relatórios que dependem da coleção completa.

## 2. Parâmetros comuns

| Parâmetro | Regra |
| --- | --- |
| `pagina` | Inteiro positivo. Padrão 1 quando o modo paginado está ativo. |
| `limite` | Inteiro de 1 a 100. Padrão 20 quando o modo paginado está ativo. |
| `busca` | Substring literal de até 150 caracteres, aplicada apenas aos campos textuais permitidos do recurso. |
| `ordenarPor` | Campo da lista permitida do recurso. Não aceita expressão SQL. Padrão `id`. |
| `ordem` | `asc` ou `desc`. Padrão `asc`. |
| `dataInicio`, `dataFim` | Dias no formato `AAAA-MM-DD`, somente nos recursos que possuem filtro de período. Podem ser enviados separadamente. |

Parâmetros repetidos, estruturas/arrays no lugar de texto, nomes de parâmetro desconhecidos, página/limite inválidos, ordenação não permitida, enum inválido, data inexistente ou período invertido retornam **400**. Não enviar parâmetros de uma coleção para outra.

Os filtros são combinados por **AND**. Na busca textual, os campos permitidos são combinados em um grupo **OR**, sem escapar dos outros filtros. `%` e `_` digitados na busca são caracteres literais. A ordenação usa `id` como desempate, para evitar duplicações entre páginas quando o campo principal contém valores iguais.

### Campos permitidos por coleção

Os filtros textuais específicos, como `nome`, `setor` e `categoria`, usam **igualdade**. Para substring, use `busca`. Espaços nas extremidades são removidos; valores vazios não são aceitos. IDs de relacionamento são inteiros positivos. Enumerações distinguem maiúsculas e minúsculas.

| Coleção | Campos da `busca` | Filtros específicos | `ordenarPor` permitido |
| --- | --- | --- | --- |
| `perfis` | nome, descrição | `nome`, `escopo`, `status` | `id`, `nome`, `escopo`, `status` |
| `usuarios` | nome, e-mail | `perfil_id`, `nome`, `email`, `status`, `dataInicio`, `dataFim` | `id`, `nome`, `email`, `perfil_id`, `status`, `data_criacao` |
| `colaboradores` | matrícula, setor, cargo, nome/e-mail do usuário | `usuario_id`, `matricula`, `setor`, `cargo`, `status`, `dataInicio`, `dataFim` | `id`, `matricula`, `setor`, `cargo`, `status`, `data_admissao`, `nome` |
| `conveniados` | nome fantasia, razão social, CNPJ, categoria | `usuario_id`, `categoria`, `cnpj`, `status` | `id`, `nome_fantasia`, `razao_social`, `categoria`, `status` |
| `beneficios` | nome, descrição | `nome`, `status`, `tipo_beneficio`, `tipo_janela` | `id`, `nome`, `valor`, `status`, `tipo_beneficio` |
| `ofertas` | Não possui; enviar `busca` resulta em 400 | `beneficio_id`, `conveniado_id`, `status` | `id`, `beneficio_id`, `conveniado_id`, `status` |
| `campanhas` | nome, descrição, patrocinador | `nome`, `patrocinador`, `tipo`, `status`, `dataInicio`, `dataFim` | `id`, `nome`, `tipo`, `status`, `data_inicio`, `data_fim` |
| `itens-campanha` | nome, descrição | `campanha_id`, `nome`, `tipo_beneficio`, `status` | `id`, `nome`, `valor`, `campanha_id`, `status` |
| `ofertas-campanha` | Não possui; enviar `busca` resulta em 400 | `beneficio_campanha_id`, `conveniado_id`, `status` | `id`, `beneficio_campanha_id`, `conveniado_id`, `status` |
| `utilizacoes` | Não possui; enviar `busca` resulta em 400 | `colaborador_id`, `beneficio_id`, `beneficio_campanha_id`, `beneficio_conveniado_id`, `beneficio_campanha_conveniado_id`, `status`, `canal_validacao`, `origem`, `conveniado_id`, `dataInicio`, `dataFim` | `id`, `data_solicitacao`, `data_confirmacao`, `valor_aplicado`, `status` |

Enumerações:

- `escopo` de perfil: `FCV`, `COLABORADOR`, `CONVENIADO`.
- `status` de perfis, usuários, ofertas, itens de campanha e ofertas de campanha: `ATIVO`, `INATIVO`.
- `status` de colaboradores: `ATIVO`, `INATIVO`, `AFASTADO`.
- `status` de conveniados: `ATIVO`, `INATIVO`, `EM_ANALISE`.
- `status` de benefícios: `ATIVO`, `INATIVO`, `DESCONTINUADO`.
- `status` de campanhas: `PLANEJADA`, `ATIVA`, `ENCERRADA`, `CANCELADA`.
- `status` de utilizações: `PENDENTE`, `APROVADA`, `REPROVADA`, `ESTORNADA`.
- `tipo_beneficio`: `PERCENTUAL`, `VALOR_FIXO`.
- `tipo_janela`: `CALENDARIO_FIXO`, `JANELA_MOVEL`.
- `tipo` de campanha: `CAMPANHA`, `EVENTO_INTERNO`, `EVENTO_PATROCINADO`, `VOUCHER`, `CORTESIA`.
- `canal_validacao`: `APP_CONVENIADO`, `TERMINAL_IOT`.
- `origem` de utilização: `COMUM` (oferta comum) ou `CAMPANHA` (oferta de campanha).

Datas aceitas vão de `1000-01-01` a `9999-12-31`, respeitando a faixa suportada pelo MySQL. Não há filtro de período nas demais seis coleções. Filtros por nome não são aceitos em toda coleção indiscriminadamente; use exatamente as chaves acima.

## 3. Datas, relacionamentos e contagem

- Em usuários, `dataInicio`/`dataFim` filtram a criação; em colaboradores, a admissão; em utilizações, a solicitação.
- O último dia é inclusivo. Para `DATETIME`, a consulta usa o começo do dia seguinte como limite exclusivo, incluindo horários do último dia. As datas representam os dias gravados pela configuração do banco; esta entrega não converte o fuso de dados existentes.
- Em campanhas, o período seleciona campanhas que **se sobrepõem** à consulta: o início da campanha não pode ser depois de `dataFim`, e o fim da campanha não pode ser antes de `dataInicio`.
- Nome e e-mail do colaborador pertencem ao usuário vinculado. A busca/ordenação usa relacionamento controlado e mantém os campos de resposta do colaborador.
- Ofertas comuns e ofertas de campanha são entidades distintas. Filtros de utilizações que atravessam esses relacionamentos devem respeitar a FK correspondente; IDs iguais não tornam as duas ofertas equivalentes.
- `beneficio_id` filtra o benefício da oferta comum; `beneficio_campanha_id` filtra o item promocional da oferta de campanha. São filtros distintos combinados por AND; não são IDs de ofertas. Não enviar ambos para tentar consultar as duas origens por OR.
- A consulta filtrada é a base tanto dos registros quanto da contagem. Um filtro de autorização acrescentado pelo servidor precisa restringir essa base **antes** de contar e paginar. Query string, corpo e contagem nunca devem ampliar o acesso.
- Usuários continuam sem senha/hash na resposta. A busca não passa a expor colunas de autenticação.

## 4. Acesso atual e matriz proposta para revisão

### Comportamento implementado no backend

| Coleções | Leitura | Criação/alteração/exclusão |
| --- | --- | --- |
| `perfis`, `usuarios` | JWT com escopo FCV | Somente perfil `FCV_ADMINISTRADOR` ativo |
| `colaboradores`, `utilizacoes` | JWT com escopo FCV | JWT com escopo FCV |
| `conveniados`, `beneficios`, `ofertas`, `campanhas`, `itens-campanha`, `ofertas-campanha` | Qualquer escopo autenticado | JWT com escopo FCV |

O parser das buscas não substitui `autenticar`/`permitir` e não cria novas permissões. O middleware confere no banco os estados atuais do usuário, perfil e vínculo. O histórico pessoal usa `/eu/utilizacoes`, com dono derivado da autenticação; não aceita IDs de dono enviados na query.

### Contrato de acesso desejado, pendente de revisão e integração

| Ator | Proposta para pactuar |
| --- | --- |
| Administrador FCV | Operações internas autorizadas; criação/edição de usuários e perfis exclusiva conforme RF37. |
| Operador FCV | Leitura mínima necessária ao portal; operações operacionais permitidas; sem criar/editar usuários ou perfis. |
| Colaborador | Cadastro/histórico próprios e leituras de catálogo aprovadas; sem listas internas globais. |
| Conveniado | Cadastro/histórico do estabelecimento autenticado e leituras aprovadas; sem consultar outro estabelecimento. |

As implementações de papéis, estados atuais e serviços pessoais estão integradas. Grupo 1 e Grupo 2 precisam homologar os DTOs e exemplos de consumo antes do aceite de S4-01.

O resultado esperado de integração é: sem token/token inválido/expirado, **401**; usuário autenticado sem permissão, **403**. Os parâmetros inválidos geram **400** depois dos controles de acesso. Os erros seguem `{ "erro": "Mensagem em português" }`.

## 5. Requisições reproduzíveis

O arquivo [`requests/listagens.http`](../requests/listagens.http) contém exemplos apenas de leitura, sem credenciais reais. Use a extensão REST Client do VS Code, faça login com uma conta de teste autorizada e preencha `token` localmente. Não salve tokens no Git.

Exemplo no PowerShell, com o token guardado apenas na sessão local:

```powershell
curl.exe --get "http://localhost:3333/api/v1/colaboradores" `
  --header "Authorization: Bearer $env:FCV_TOKEN" `
  --data-urlencode "pagina=1" `
  --data-urlencode "limite=20" `
  --data-urlencode "ordenarPor=id" `
  --data-urlencode "ordem=asc"
```

`FCV_TOKEN` é uma variável local, não um token fornecido por este documento. Para o celular, troque `localhost` pelo endereço da máquina que executa a API e ajuste a configuração do aplicativo.

## 6. Validação e demonstração

Na pasta deste backend:

```bash
npm ci
npm run check
npm test
```

`check` verifica TypeScript; `test` executa a suíte da entrega. Os resultados efetivamente obtidos devem acompanhar a revisão; este guia não antecipa aprovação do professor nem dos consumidores.

Para testes manuais com MySQL, use **um banco dedicado de teste**, com massa suficiente para duas páginas e valores empatados. A configuração é local. Não execute `db:reset`, seeds de limpeza ou testes de escrita no banco usado na apresentação. Os exemplos de listagem não exigem reset de uma base existente.

Roteiro de revisão:

1. Chamar as dez coleções sem paginação e conferir que todas retornam arrays completos.
2. Na mesma coleção, solicitar páginas 1 e 2 com limite pequeno e ordenação fixa; conferir que não repetem registros e que o total permanece correto.
3. Combinar busca, filtro específico, ordenação e paginação; comparar `total` com o conjunto filtrado completo.
4. Testar busca sem resultados, página além do fim e desempate por ID.
5. Testar datas inválidas/invertidas, primeiro/último dia e sobreposição de campanha.
6. Conferir 400 para query inválida, 401 sem token e 403 com conta de escopo não FCV em `/usuarios`.
7. Abrir o portal existente e conferir login, dashboard, relatórios, históricos e calendário sem migrar seu consumidor para envelope por acidente.
8. Pedir ao Grupo 2 validação no aplicativo; revisar a matriz com Heitor e os serviços pessoais com Thales. Registrar os resultados reais no PR.

## 7. Contribuição e integração no Git

Trabalhe em uma branch individual baseada em `develop`. Commits podem ser criados localmente; enviar a branch exige permissão de escrita no repositório. A implementação original de consultas foi integrada a partir de `feat/samuel-c-consultas`; novas mudanças seguem o mesmo fluxo de PR para `develop`. Não integrar à `main` diretamente.

Para quem vai começar em uma **nova cópia limpa**, o fluxo normal é:

```bash
git clone https://github.com/joaovictorcascardo/fcv-backend.git
cd fcv-backend
git switch develop
git pull --ff-only origin develop
git switch -c feature/seu-nome-sua-task
```

O nome `feature/seu-nome-sua-task` é um exemplo: cada integrante usa um nome próprio e descritivo. Não execute esse início novamente sobre a cópia que já contém as alterações locais.

Atalho para clonar diretamente em `develop`:

```bash
git clone -b develop https://github.com/joaovictorcascardo/fcv-backend.git
cd fcv-backend
git switch -c feature/seu-nome-sua-task
```

Quando receber acesso, confira os arquivos e execute as verificações. Se `develop` tiver avançado, salve uma cópia das alterações locais antes de atualizar/integrar a base; resolva conflitos e teste novamente.

Depois da revisão local, prepare commits com mensagens como `feat: adicionar consultas paginadas aos recursos` e `feat: documentar contrato de listagens da sprint 4`. Use `git add` somente nos arquivos revisados, nunca em `.env`, tokens ou dados locais.

```bash
git status
git diff
# Após selecionar os arquivos, revisar e testar:
git commit -m "feat: adicionar filtros ordenacao e paginacao na API"
git push -u origin feat/samuel-c-consultas
```

Abra PR com **base `develop`** e compare `feat/samuel-c-consultas`. Outro integrante revisa; conflitos são resolvidos na branch individual, que deve ser testada novamente. Integre em `develop` somente depois da aprovação e da resolução dos conflitos. Depois de testar a `develop` integrada e obter o aceite da equipe, abra outro PR **`develop → main`** para a entrega final. Não forçar push nem atribuir commits aos colegas. Este fluxo não presume publicação ou deploy automático do backend.

## 8. Pendências que esta entrega não encerra

- Aceite do contrato e da matriz pelos Grupos 1 e 2.
- Homologação das escritas de administrador/operador, estados atuais e recuperação de senha pelos consumidores.
- Homologação dos payloads, vínculos do perfil, histórico próprio e modo paginado no web/mobile.
- Regras de saldo, renovação, QR e decisão dos benefícios: etapa posterior definida pela Sprint 4.
- Confirmação individual e data/hora no Notion: preenchimento pelo próprio integrante após verificar a entrega.
