# Correções da auditoria do backend - Sprint 4

Base: `develop` após a integração do PR #2 (`b88f5e1`). As alterações mantêm Express/TypeScript, MVC, Knex e MySQL. Nenhuma regra de saldo, renovação, emissão/decisão de QR ou envio de e-mail foi acrescentada.

## Histórico próprio: F03 e F04

`GET /api/v1/eu/utilizacoes` continua retornando o array completo quando `pagina` e `limite` não são enviados. Enviar qualquer um ativa o mesmo envelope das consultas internas:

```json
{ "dados": [], "paginacao": { "pagina": 1, "limite": 20, "total": 0, "totalPaginas": 0 } }
```

- `pagina`: inteiro positivo; `limite`: de 1 a 100. Padrões 1 e 20.
- `ordenarPor`: `id`, `data_solicitacao`, `data_confirmacao`, `valor_aplicado`, `status`.
- `ordem`: `asc` ou `desc`. Padrão: `data_solicitacao desc`, com `id asc` como desempate.
- `status`: `PENDENTE`, `APROVADA`, `REPROVADA` ou `ESTORNADA`.
- `de` e `ate`: dias reais entre `1000-01-01` e `9999-12-31`; o último dia é inclusivo. Intervalo invertido responde 400.
- Parâmetros repetidos, desconhecidos ou estruturados e tentativas de informar `colaborador_id`/`conveniado_id` respondem 400.

O dono vem do usuário autenticado. A base já restrita pelo dono é usada tanto no total quanto na página. O DTO de cada utilização foi preservado; o token de QR não foi acrescentado ao histórico.

Exemplo: `GET /api/v1/eu/utilizacoes?pagina=1&limite=20&status=PENDENTE&de=2026-10-01&ate=2026-10-26`.

## Consulta interna por benefício: F05

`GET /api/v1/utilizacoes` acrescenta dois filtros de igualdade:

- `beneficio_id`: benefício comum, através da oferta comum.
- `beneficio_campanha_id`: item promocional, através da oferta de campanha.

Os espaços de IDs são separados. Um benefício comum de ID 1 não inclui automaticamente o item de campanha de ID 1. Os filtros continuam combinados por AND, inclusive na contagem. Os filtros antigos de IDs das ofertas e `origem` continuam disponíveis.

## Respostas de erro e entradas: F06 e F09

Erros conhecidos de banco retornam somente `{ "erro": "mensagem controlada" }`, com os status anteriores. SQL, valores da consulta, nomes internos do driver e `sqlMessage` não são enviados ao consumidor. Logs usam metadados seguros de diagnóstico, sem query ou objeto bruto do erro.

IDs de cadastros e catálogo aceitam somente números inteiros seguros positivos ou strings decimais de dígitos. Booleanos, arrays, objetos, notação hexadecimal/exponencial e inteiros inseguros são rejeitados. A data de admissão valida os componentes do calendário e a faixa do MySQL. `descricao` de perfil é texto de até 255 caracteres ou null; `permissoes` é uma lista de textos ou null, conforme o Swagger existente.

## Recuperação e perfil: F07 e F08

Geração e consumo do código de recuperação usam transação Knex e bloqueio por usuário em ordem consistente. Troca da senha e invalidação dos códigos ocorrem na mesma transação. Duas requisições com o mesmo código têm no máximo um sucesso. Tentativas erradas são contabilizadas mesmo quando a resposta é 400, respeitando o limite de cinco.

Login e `/auth/eu` preservam os campos já existentes do usuário e devolvem vínculos com projeções explícitas. O escopo atual determina o vínculo: `COLABORADOR` recebe `colaborador` e `conveniado: null`; `CONVENIADO` recebe `conveniado` e `colaborador: null`; `FCV` recebe ambos null. Senha/hash e futuras colunas internas não são expostos.

## Itens já integrados e validação

F02 (senha vazia no CRUD de usuários) e F10 (integração dos cadastros e das suítes) já receberam implementação no PR #2. Esta mudança acrescenta regressão HTTP para POST e PUT com senha vazia, verificando também que nada é persistido ou alterado.

```bash
npm run check
npm test
```

Os testes HTTP são opt-in: `FCV_TEST_MYSQL=1` e `DB_NOME` novo com prefixo `fcv_sprint4_test_`, em servidor local isolado. A suíte cria seu próprio banco e o remove ao terminar. Não executar testes de escrita no banco de apresentação.

Verificação realizada em 26/10/2026: TypeScript aprovado, 93 testes unitários/SQL e 31 testes HTTP/MySQL aprovados, sem falhas nem casos pulados. O banco temporário foi removido e o servidor de teste foi encerrado. Os testes HTTP incluem consumo concorrente do código, limite de tentativas, login real após redefinição, senha vazia sem persistência, isolamento do histórico, DTO e erro SQL real sanitizado.

Permanecem a homologação com os clientes web/mobile, o aceite dos contratos pela equipe e a confirmação individual no Notion. Testes automatizados não substituem esses aceites nem antecipam a avaliação do professor.
