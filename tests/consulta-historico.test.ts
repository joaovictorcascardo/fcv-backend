import assert from "node:assert/strict";
import test from "node:test";
import knex, { type Knex } from "knex";
import { analisarConsulta, ConsultaInvalida } from "../src/queries/listagem";
import { configuracaoHistorico, listarHistorico, type DonoHistorico } from "../src/queries/historico";

function capturarConsultas() {
  const banco = knex({ client: "mysql2" });
  const consultas: Knex.Sql[] = [];
  (banco.client as unknown as { runner: (builder: Knex.QueryBuilder) => { run: () => Promise<unknown> } }).runner = builder => ({
    async run() {
      const sql = builder.toSQL();
      assert.ok(!Array.isArray(sql));
      consultas.push(sql);
      return sql.sql.includes("count(*)") ? { total: 3 } : [];
    },
  });
  return { banco, consultas };
}

test("histórico: recusa calendário impossível, intervalo invertido e parâmetros estruturados", () => {
  for (const consulta of [
    { ate: "2026-02-30" }, { de: "2025-02-29" }, { de: "0999-12-31" },
    { de: "2026-03-01", ate: "2026-02-28" }, { status: ["PENDENTE", "APROVADA"] },
    { pagina: "0" }, { limite: "101" }, { ordenarPor: "senha" }, { ordem: "desc; DROP TABLE usuario" },
    { colaborador_id: "2" }, { conveniado_id: "2" },
  ]) assert.throws(() => analisarConsulta(consulta, configuracaoHistorico), ConsultaInvalida);
  assert.doesNotThrow(() => analisarConsulta({ de: "2024-02-29", ate: "2024-02-29" }, configuracaoHistorico));
});

for (const [dono, coluna, id] of [
  [{ colaborador_id: 7 }, "utilizacao`\.`colaborador_id", 7],
  [{ conveniado_id: 9 }, "conveniado`\.`id", 9],
] as const) {
  test(`histórico: dados e total preservam o dono ${Object.keys(dono)[0]} e os filtros`, async () => {
    const { banco, consultas } = capturarConsultas();
    try {
      const resultado = await listarHistorico(banco, dono as DonoHistorico, {
        pagina: "5", limite: "2", status: "APROVADA", de: "2026-10-01", ate: "2026-10-26",
      });
      assert.ok(!Array.isArray(resultado));
      assert.deepEqual(resultado, { dados: [], paginacao: { pagina: 5, limite: 2, total: 3, totalPaginas: 2 } });
      assert.equal(consultas.length, 2);
      for (const sql of consultas) {
        assert.match(sql.sql, new RegExp("where `" + coluna + "` = \\?"));
        assert.deepEqual(sql.bindings.slice(0, 4), [id, "APROVADA", "2026-10-01 00:00:00", "2026-10-27 00:00:00"]);
      }
      const dados = consultas.find(c => !c.sql.includes("count(*)"))!;
      assert.match(dados.sql, /order by `utilizacao`\.`data_solicitacao` desc, `utilizacao`\.`id` asc limit \? offset \?/);
      assert.deepEqual(dados.bindings.slice(-2), [2, 8]);
      assert.doesNotMatch(dados.sql, /token_qrcode|senha/);
    } finally { await banco.destroy(); }
  });
}

test("histórico: formato legado preserva array e ordenação com desempate; dia máximo não transborda", async () => {
  const { banco, consultas } = capturarConsultas();
  try {
    const resposta = await listarHistorico(banco, { colaborador_id: 1 }, { ate: "9999-12-31" });
    assert.ok(Array.isArray(resposta));
    assert.equal(consultas.length, 1);
    assert.doesNotMatch(consultas[0].sql, /limit|offset|count\(\*\)/);
    assert.match(consultas[0].sql, /order by `utilizacao`\.`data_solicitacao` desc, `utilizacao`\.`id` asc/);
    assert.equal(consultas[0].bindings.at(-1), "9999-12-31 23:59:59.999999");
  } finally { await banco.destroy(); }
});
