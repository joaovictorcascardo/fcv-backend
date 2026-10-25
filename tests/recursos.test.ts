import assert from "node:assert/strict";
import test from "node:test";
import knex, { type Knex } from "knex";
import { analisarConsulta, ConsultaInvalida } from "../src/queries/listagem";
import { criarBaseListagem, listarRecurso, recursosListagem, type NomeRecursoListagem } from "../src/queries/recursos";

// Compile the real Knex queries without connecting to a database.
function capturarConsultas() {
  const banco = knex({ client: "mysql2" });
  const consultas: Knex.Sql[] = [];
  (banco.client as unknown as { runner: (builder: Knex.QueryBuilder) => { run: () => Promise<unknown> } }).runner = builder => ({
    async run() {
      const consulta = builder.toSQL();
      assert.ok(!Array.isArray(consulta));
      consultas.push(consulta);
      return consulta.sql.includes("count(*)") ? { total: 0 } : [];
    },
  });
  return { banco, consultas };
}

for (const nome of Object.keys(recursosListagem) as NomeRecursoListagem[]) {
  test(`${nome}: consulta paginada compila dados e total; rejeita ordenação SQL`, async () => {
    const { banco, consultas } = capturarConsultas();
    try {
      const resposta = await listarRecurso(banco, nome, { pagina: "2", limite: "2", status: "status" in recursosListagem[nome].filtros ? recursosListagem[nome].filtros.status.valores![0] : "ATIVO" });
      assert.ok(!Array.isArray(resposta));
      assert.equal(resposta.paginacao.total, 0);
      assert.equal(consultas.length, 2);
      const dados = consultas.find(c => !c.sql.includes("count(*)"))!;
      const total = consultas.find(c => c.sql.includes("count(*)"))!;
      assert.match(dados.sql, /order by .+`id` asc limit \? offset \?/);
      assert.match(total.sql, /where .+`status` = \?/);
      assert.doesNotMatch(total.sql, /order by|offset/);
      // .first() may add LIMIT 1 to the single aggregate row; it must not use the page limit.
      assert.deepEqual(dados.bindings.slice(0, 1), total.bindings.slice(0, 1));
      assert.deepEqual(dados.bindings.slice(-2), [2, 2]);
      assert.throws(() => analisarConsulta({ ordenarPor: "id DESC; DROP TABLE usuario" }, recursosListagem[nome]), ConsultaInvalida);
    } finally { await banco.destroy(); }
  });
}

test("colaboradores: busca por nome vem do usuário, sem modificar os campos devolvidos", async () => {
  const { banco, consultas } = capturarConsultas();
  try {
    await listarRecurso(banco, "colaboradores", { busca: "Ana", ordenarPor: "nome", status: "ATIVO", limite: "2" });
    const dados = consultas.find(c => !c.sql.includes("count(*)"))!;
    assert.match(dados.sql, /^select `colaborador`\.\* from/);
    assert.match(dados.sql, /left join `usuario` as `usuario_colaborador`/);
    assert.match(dados.sql, /`usuario_colaborador`\.`nome` LIKE/);
    assert.match(dados.sql, /order by `usuario_colaborador`\.`nome` asc, `colaborador`\.`id` asc/);
    assert.doesNotMatch(dados.sql, /select .*`senha`/);
  } finally { await banco.destroy(); }
});

test("usuários: senha não faz parte da projeção nem da ordenação permitida", async () => {
  const banco = knex({ client: "mysql2" });
  try {
    const consulta = criarBaseListagem(banco, "usuarios").toSQL();
    assert.ok(!Array.isArray(consulta));
    assert.doesNotMatch(consulta.sql, /senha|select \*/);
    assert.match(consulta.sql, /`usuario`\.`email`/);
    assert.throws(() => analisarConsulta({ ordenarPor: "senha" }, recursosListagem.usuarios), ConsultaInvalida);
  } finally { await banco.destroy(); }
});

test("utilizações: filtro de conveniado considera origens diferentes em grupo AND", async () => {
  const { banco, consultas } = capturarConsultas();
  try {
    await listarRecurso(banco, "utilizacoes", { conveniado_id: "7", status: "PENDENTE", pagina: "1" });
    for (const consulta of consultas) {
      assert.match(consulta.sql, /\(`oferta_comum`\.`conveniado_id` = \? or `oferta_campanha`\.`conveniado_id` = \?\)/);
      assert.match(consulta.sql, /`utilizacao`\.`status` = \?/);
      assert.ok(consulta.bindings.includes(7));
    }
    const dados = consultas.find(c => !c.sql.includes("count(*)"))!;
    assert.match(dados.sql, /^select `utilizacao`\.\* from/);
  } finally { await banco.destroy(); }
});

test("campanhas: intervalo usa sobreposição, não apenas a data inicial", async () => {
  const { banco, consultas } = capturarConsultas();
  try {
    await listarRecurso(banco, "campanhas", { dataInicio: "2026-10-20", dataFim: "2026-10-24" });
    assert.equal(consultas.length, 1);
    assert.match(consultas[0].sql, /`campanha_evento`\.`data_fim` >= \?.*`campanha_evento`\.`data_inicio` <= \?/);
    assert.deepEqual(consultas[0].bindings, ["2026-10-20", "2026-10-24"]);
  } finally { await banco.destroy(); }
});

test("cada recurso recusa status e filtros que pertencem a outra entidade", () => {
  assert.throws(() => analisarConsulta({ status: "PENDENTE" }, recursosListagem.beneficios), ConsultaInvalida);
  assert.throws(() => analisarConsulta({ status: "ATIVO" }, recursosListagem.utilizacoes), ConsultaInvalida);
  assert.throws(() => analisarConsulta({ colaborador_id: "1" }, recursosListagem.campanhas), ConsultaInvalida);
  assert.throws(() => analisarConsulta({ busca: "consulta" }, recursosListagem.ofertas), ConsultaInvalida);
});
