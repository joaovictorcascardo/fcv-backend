import assert from "node:assert/strict";
import test from "node:test";
import knex, { type Knex } from "knex";
import { analisarConsulta, ConsultaInvalida, listarComConsulta, type ConfiguracaoListagem } from "../src/queries/listagem";

const configuracao: ConfiguracaoListagem = {
  busca: ["beneficio.nome", "beneficio.descricao"],
  ordenarPor: { id: "beneficio.id", nome: "beneficio.nome" },
  filtros: {
    status: { tipo: "enum", coluna: "beneficio.status", valores: ["ATIVO", "INATIVO"] },
    conveniado_id: { tipo: "inteiro", coluna: "oferta.conveniado_id" },
    categoria: { tipo: "texto", coluna: "conveniado.categoria" },
    dataInicio: { tipo: "data", coluna: "utilizacao.data_solicitacao", operador: ">=", dataHora: true },
    dataFim: { tipo: "data", coluna: "utilizacao.data_solicitacao", operador: "<=", dataHora: true },
  },
};

type QueryExecutada = ReturnType<Knex.QueryBuilder["toSQL"]>;
function bancoSemConexao(registros: object[] = [], total = String(registros.length)) {
  const db = knex({ client: "mysql2" });
  const executadas: QueryExecutada[] = [];
  (db.client as any).runner = (builder: Knex.QueryBuilder) => ({
    run: async () => {
      const consulta = builder.toSQL();
      executadas.push(consulta);
      return consulta.method === "first" ? { total } : registros;
    },
  });
  return { db, executadas };
}

test("legado não ativa paginação e aceita filtros sem truncamento", () => {
  const consulta = analisarConsulta({ status: "ATIVO", busca: "  feira  " }, configuracao);
  assert.equal(consulta.paginada, false);
  assert.equal(consulta.busca, "feira");
  assert.equal(consulta.ordenarPor, "id");
});

test("pagina ou limite ativam envelope com os respectivos padrões", () => {
  assert.deepEqual(
    [analisarConsulta({ pagina: "3" }, configuracao), analisarConsulta({ limite: "7" }, configuracao)]
      .map(({ pagina, limite, deslocamento, paginada }) => ({ pagina, limite, deslocamento, paginada })),
    [{ pagina: 3, limite: 20, deslocamento: 40, paginada: true },
      { pagina: 1, limite: 7, deslocamento: 0, paginada: true }],
  );
});

test("rejeita entradas malformadas e tentativas de transformar parâmetros em SQL", () => {
  const invalidas: unknown[] = [
    null, [], "pagina=1", { pagina: "0" }, { pagina: "-1" }, { pagina: "1.5" },
    { pagina: "1e2" }, { pagina: "9007199254740992" }, { pagina: "9007199254740991", limite: "100" },
    { limite: "0" }, { limite: "101" }, { limite: "20; DROP TABLE usuario" },
    { pagina: ["1", "2"] }, { busca: { nome: "abc" } }, { busca: "" }, { status: "ativo" },
    { desconhecido: "x" }, { ordenarPor: "senha" }, { ordenarPor: "__proto__" },
    { ordenarPor: "nome desc; --" }, { ordem: "ASC" }, { ordem: "desc; --" },
    { conveniado_id: "0" }, { conveniado_id: "abc" }, { busca: "a".repeat(151) },
    { categoria: "a".repeat(151) },
  ];
  for (const consulta of invalidas) {
    assert.throws(() => analisarConsulta(consulta, configuracao), (erro: unknown) =>
      erro instanceof ConsultaInvalida && erro.status === 400, JSON.stringify(consulta));
  }
});

test("datas validam calendário, limites MySQL e intervalo", () => {
  for (const data of ["2026-02-29", "2024-02-30", "2026-13-01", "2026-00-01", "2026-1-01", "0999-12-31", "2026-01-01T12:00:00"]) {
    assert.throws(() => analisarConsulta({ dataInicio: data }, configuracao), ConsultaInvalida);
  }
  assert.doesNotThrow(() => analisarConsulta({ dataInicio: "2024-02-29", dataFim: "2024-03-01" }, configuracao));
  assert.throws(() => analisarConsulta({ dataInicio: "2026-03-02", dataFim: "2026-03-01" }, configuracao), ConsultaInvalida);
});

test("busca é indisponível em recurso sem campos pesquisáveis", () => {
  assert.throws(() => analisarConsulta({ busca: "abc" }, { ordenarPor: { id: "oferta.id" } }), ConsultaInvalida);
});

test("SQL preserva escopo, agrupa OR e vincula busca literal", async () => {
  const { db, executadas } = bancoSemConexao([{ id: 5 }], "4");
  const base = db("beneficio").select("beneficio.*").where("beneficio.tenant_id", 41);
  const original = base.toSQL();
  const resposta = await listarComConsulta(base, {
    pagina: "2", limite: "2", status: "ATIVO", busca: "50%_!\\x", ordenarPor: "nome", ordem: "desc",
  }, configuracao);
  assert.deepEqual(resposta, { dados: [{ id: 5 }], paginacao: { pagina: 2, limite: 2, total: 4, totalPaginas: 2 } });
  assert.deepEqual(base.toSQL().sql, original.sql);
  assert.deepEqual(base.toSQL().bindings, original.bindings);
  assert.equal(executadas.length, 2);
  const dados = executadas.find((query) => query.method !== "first")!;
  const contagem = executadas.find((query) => query.method === "first")!;
  const condicoes = "where `beneficio`.`tenant_id` = ? and `beneficio`.`status` = ? and (`beneficio`.`nome` LIKE ? ESCAPE '!' or `beneficio`.`descricao` LIKE ? ESCAPE '!')";
  assert.ok(dados.sql.includes(condicoes));
  assert.ok(contagem.sql.includes(condicoes));
  assert.ok(dados.sql.includes("order by `beneficio`.`nome` desc, `beneficio`.`id` asc limit ? offset ?"));
  assert.ok(!contagem.sql.includes("order by"));
  assert.ok(!contagem.sql.includes("offset"));
  assert.deepEqual(dados.bindings, [41, "ATIVO", "%50!%!_!!\\x%", "%50!%!_!!\\x%", 2, 2]);
  assert.deepEqual(contagem.bindings, [41, "ATIVO", "%50!%!_!!\\x%", "%50!%!_!!\\x%", 1]);
  assert.ok(!dados.sql.includes("50%"));
});

test("formato legado executa uma única consulta sem limite ou contagem", async () => {
  const registros = Array.from({ length: 145 }, (_, indice) => ({ id: indice + 1 }));
  const { db, executadas } = bancoSemConexao(registros);
  const resposta = await listarComConsulta(db("beneficio").select("*"), { status: "ATIVO" }, configuracao);
  assert.deepEqual(resposta, registros);
  assert.equal(executadas.length, 1);
  assert.ok(!executadas[0].sql.includes("limit"));
});

test("zero resultados e página fora do fim preservam os totais corretos", async () => {
  for (const total of ["0", "3"]) {
    const { db } = bancoSemConexao([], total);
    const resposta = await listarComConsulta(db("beneficio").select("*"), { pagina: "4", limite: "2" }, configuracao);
    assert.deepEqual(resposta, { dados: [], paginacao: { pagina: 4, limite: 2, total: Number(total), totalPaginas: Math.ceil(Number(total) / 2) } });
  }
});

test("data fim DATETIME inclui o dia inteiro por limite exclusivo do próximo dia", async () => {
  const { db, executadas } = bancoSemConexao();
  await listarComConsulta(db("utilizacao").select("*"), { dataInicio: "2024-02-29", dataFim: "2024-02-29" }, configuracao);
  assert.ok(executadas[0].sql.includes("`utilizacao`.`data_solicitacao` >= ? and `utilizacao`.`data_solicitacao` < ?"));
  assert.deepEqual(executadas[0].bindings, ["2024-02-29 00:00:00", "2024-03-01 00:00:00"]);
});

test("data fim máxima não gera data fora do domínio MySQL", async () => {
  const { db, executadas } = bancoSemConexao();
  await listarComConsulta(db("utilizacao").select("*"), { dataFim: "9999-12-31" }, configuracao);
  assert.deepEqual(executadas[0].bindings, ["9999-12-31 23:59:59.999999"]);
  assert.ok(executadas[0].sql.includes("`utilizacao`.`data_solicitacao` <= ?"));
});

test("filtro customizado permanece agrupado e é incluído na contagem", async () => {
  const { db, executadas } = bancoSemConexao();
  const especial: ConfiguracaoListagem = {
    ordenarPor: { id: "utilizacao.id" },
    filtros: { conveniado_id: {
      tipo: "inteiro",
      aplicar: (query, valor) => { query.where(function () {
        this.where("comum.conveniado_id", valor).orWhere("campanha.conveniado_id", valor);
      }); },
    } },
  };
  await listarComConsulta(db("utilizacao").select("utilizacao.*").where("utilizacao.colaborador_id", 7), { limite: "5", conveniado_id: "12" }, especial);
  for (const query of executadas) {
    assert.ok(query.sql.includes("where `utilizacao`.`colaborador_id` = ? and (`comum`.`conveniado_id` = ? or `campanha`.`conveniado_id` = ?)"));
    assert.deepEqual(query.bindings.slice(0, 3), [7, 12, 12]);
  }
});
