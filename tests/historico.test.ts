import assert from "node:assert/strict";
import test from "node:test";
import knex from "knex";
import db from "../src/database/db";
import { consultaUtilizacoesVinculadas, mensagemExclusaoBloqueada, type CadastroComHistorico } from "../src/models/historicoModel";
import { observacaoAoCancelar, statusAoCancelar, utilizacaoModel } from "../src/models/utilizacaoModel";
import { utilizacaoController } from "../src/controllers/utilizacaoController";
import { beneficioModel } from "../src/models/beneficioModel";
import { beneficioController } from "../src/controllers/beneficioController";
import { beneficioConveniadoModel } from "../src/models/beneficioConveniadoModel";
import { beneficioConveniadoController } from "../src/controllers/beneficioConveniadoController";
import { campanhaEventoModel } from "../src/models/campanhaEventoModel";
import { campanhaEventoController } from "../src/controllers/campanhaEventoController";
import { beneficioCampanhaModel } from "../src/models/beneficioCampanhaModel";
import { beneficioCampanhaController } from "../src/controllers/beneficioCampanhaController";
import { beneficioCampanhaConveniadoModel } from "../src/models/beneficioCampanhaConveniadoModel";
import { beneficioCampanhaConveniadoController } from "../src/controllers/beneficioCampanhaConveniadoController";

test.after(() => db.destroy());

// Troca métodos do model durante um teste e devolve tudo como estava no final.
async function comModel(model: any, trocas: Record<string, Function>, corpo: () => Promise<void>) {
  const originais = Object.fromEntries(Object.keys(trocas).map(nome => [nome, model[nome]]));
  Object.assign(model, trocas);
  try { await corpo(); } finally { Object.assign(model, originais); }
}

async function executar(acao: Function, id = "5") {
  const resposta = { status: 200, corpo: undefined as any };
  const res = {
    status(codigo: number) { resposta.status = codigo; return this; },
    json(corpo: unknown) { resposta.corpo = corpo; return this; },
    send() { return this; },
  };
  await acao({ params: { id } }, res);
  return resposta;
}

test("cancelamento de utilização: PENDENTE vira REPROVADA, APROVADA vira ESTORNADA", () => {
  assert.equal(statusAoCancelar("PENDENTE"), "REPROVADA");
  assert.equal(statusAoCancelar("APROVADA"), "ESTORNADA");
  assert.equal(statusAoCancelar("REPROVADA"), null);
  assert.equal(statusAoCancelar("ESTORNADA"), null);
  assert.equal(observacaoAoCancelar(null), "Cancelada pela FCV");
  assert.equal(observacaoAoCancelar("Receita vencida"), "Receita vencida\nCancelada pela FCV");
});

test("utilizações: o model não apaga, só atualiza o status conferindo o status lido", () => {
  assert.equal("excluir" in utilizacaoModel, false);
  const consulta = utilizacaoModel.cancelar(5, "PENDENTE", "REPROVADA", "Cancelada pela FCV").toSQL();
  assert.ok(!Array.isArray(consulta));
  assert.match(consulta.sql, /^update `utilizacao` set `status` = \?, `observacoes` = \? where `id` = \? and `status` = \?$/);
  assert.doesNotMatch(consulta.sql, /delete/i);
  assert.deepEqual(consulta.bindings, ["REPROVADA", "Cancelada pela FCV", 5, "PENDENTE"]);
});

test("DELETE /utilizacoes/:id cancela e devolve o registro, que continua existindo", async () => {
  let registro: any = { id: 5, status: "APROVADA", observacoes: null };
  let chamada: unknown[] = [];
  await comModel(utilizacaoModel, {
    buscarPorId: async () => registro,
    cancelar: async (...args: unknown[]) => { chamada = args; registro = { ...registro, status: args[2], observacoes: args[3] }; return 1; },
  }, async () => {
    const resposta = await executar(utilizacaoController.cancelar);
    assert.equal(resposta.status, 200);
    assert.deepEqual(chamada, [5, "APROVADA", "ESTORNADA", "Cancelada pela FCV"]);
    assert.equal(resposta.corpo.status, "ESTORNADA");
  });
});

test("DELETE /utilizacoes/:id: 404 sem registro, 409 se já encerrada ou se o status mudou no meio", async () => {
  await comModel(utilizacaoModel, { buscarPorId: async () => undefined }, async () => {
    assert.equal((await executar(utilizacaoController.cancelar)).status, 404);
  });
  for (const status of ["REPROVADA", "ESTORNADA"]) {
    await comModel(utilizacaoModel, {
      buscarPorId: async () => ({ id: 5, status }),
      cancelar: async () => assert.fail("não deveria alterar utilização encerrada"),
    }, async () => {
      const resposta = await executar(utilizacaoController.cancelar);
      assert.equal(resposta.status, 409);
      assert.match(resposta.corpo.erro, new RegExp(status));
    });
  }
  await comModel(utilizacaoModel, {
    buscarPorId: async () => ({ id: 5, status: "PENDENTE" }),
    cancelar: async () => 0,
  }, async () => {
    assert.equal((await executar(utilizacaoController.cancelar)).status, 409);
  });
});

test("contagem de utilizações separa oferta comum de oferta de campanha", () => {
  const banco = knex({ client: "mysql2" });
  const sql = (cadastro: CadastroComHistorico) => {
    const consulta = consultaUtilizacoesVinculadas(banco, cadastro, 7).toSQL();
    assert.ok(!Array.isArray(consulta));
    assert.match(consulta.sql, /^select count\(\*\) as `total` from `utilizacao`/);
    assert.ok(consulta.bindings.includes(7));
    return consulta.sql;
  };
  try {
    assert.match(sql("oferta"), /where `utilizacao`\.`beneficio_conveniado_id` = \?/);
    assert.match(sql("beneficio"), /join `beneficio_conveniado` as `oferta` on `oferta`\.`id` = `utilizacao`\.`beneficio_conveniado_id` where `oferta`\.`beneficio_id` = \?/);
    assert.match(sql("oferta-campanha"), /where `utilizacao`\.`beneficio_campanha_conveniado_id` = \?/);
    assert.match(sql("item-campanha"), /join `beneficio_campanha_conveniado` as `oferta_campanha` on `oferta_campanha`\.`id` = `utilizacao`\.`beneficio_campanha_conveniado_id` where `oferta_campanha`\.`beneficio_campanha_id` = \?/);
    assert.match(sql("campanha"), /join `beneficio_campanha` as `item` on `item`\.`id` = `oferta_campanha`\.`beneficio_campanha_id` where `item`\.`campanha_id` = \?/);
    for (const cadastro of ["oferta", "beneficio"] as const) assert.doesNotMatch(sql(cadastro), /campanha/);
    for (const cadastro of ["oferta-campanha", "item-campanha", "campanha"] as const) assert.doesNotMatch(sql(cadastro), /`beneficio_conveniado_id`/);
  } finally { banco.destroy(); }
});

const catalogo: [string, any, any, CadastroComHistorico, RegExp][] = [
  ["benefício", beneficioModel, beneficioController, "beneficio", /INATIVO ou DESCONTINUADO/],
  ["oferta", beneficioConveniadoModel, beneficioConveniadoController, "oferta", /INATIVO/],
  ["campanha", campanhaEventoModel, campanhaEventoController, "campanha", /ENCERRADA ou CANCELADA/],
  ["item de campanha", beneficioCampanhaModel, beneficioCampanhaController, "item-campanha", /INATIVO/],
  ["oferta de campanha", beneficioCampanhaConveniadoModel, beneficioCampanhaConveniadoController, "oferta-campanha", /INATIVO/],
];

for (const [nome, model, controller, cadastro, sugestao] of catalogo) {
  test(`${nome}: exclusão com utilizações vinculadas responde 409 sem apagar`, async () => {
    let contou: unknown;
    await comModel(model, {
      contarUtilizacoes: async (id: number) => { contou = id; return 2; },
      excluir: async () => assert.fail("não deveria apagar cadastro com histórico"),
    }, async () => {
      const resposta = await executar(controller.excluir);
      assert.equal(resposta.status, 409);
      assert.equal(contou, 5);
      assert.equal(resposta.corpo.erro, mensagemExclusaoBloqueada(cadastro));
      assert.match(resposta.corpo.erro, sugestao);
    });
  });

  test(`${nome}: sem utilizações, exclui (204) ou responde 404`, async () => {
    await comModel(model, { contarUtilizacoes: async () => 0, excluir: async () => 1 }, async () => {
      assert.equal((await executar(controller.excluir)).status, 204);
    });
    await comModel(model, { contarUtilizacoes: async () => 0, excluir: async () => 0 }, async () => {
      assert.equal((await executar(controller.excluir)).status, 404);
    });
  });
}
