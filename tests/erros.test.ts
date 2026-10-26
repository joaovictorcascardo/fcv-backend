import assert from "node:assert/strict";
import test from "node:test";
import { tratarErros } from "../src/middlewares/erros";
import { ConsultaInvalida } from "../src/queries/listagem";

function responder(erro: unknown) {
  const resposta = {
    codigo: 0,
    corpo: undefined as unknown,
    status(codigo: number) { this.codigo = codigo; return this; },
    json(corpo: unknown) { this.corpo = corpo; return this; },
  };
  tratarErros(erro, {} as any, resposta as any, () => assert.fail("Não deve propagar um erro já tratado"));
  return resposta;
}

test("duplicidade SQL retorna 409 sem expor query, valores, sqlMessage ou stack", (t) => {
  const log = t.mock.method(console, "error", () => {});
  const erro = {
    code: "ER_DUP_ENTRY", errno: 1062, sqlState: "23000",
    sqlMessage: "Duplicate entry 'segredo@exemplo.test' for key 'usuario.email'",
    sql: "insert into usuario values ('segredo@exemplo.test', 'senha-sigilosa')",
    stack: "Error: segredo@exemplo.test",
  };
  const resposta = responder(erro);
  assert.equal(resposta.codigo, 409);
  assert.deepEqual(resposta.corpo, { erro: "Já existe um registro com esse valor (campo único repetido)" });
  assert.deepEqual(log.mock.calls[0].arguments, ["Erro de banco de dados", { codigo: "ER_DUP_ENTRY", errno: 1062, sqlState: "23000" }]);
  assert.doesNotMatch(JSON.stringify([resposta.corpo, log.mock.calls.map((call) => call.arguments)]), /segredo@|senha-sigilosa|insert into|sqlMessage|stack/);
});

test("erros de referência preservam status e mensagem controlados, sem detalhes do banco", (t) => {
  t.mock.method(console, "error", () => {});
  for (const [code, status] of [["ER_NO_REFERENCED_ROW_2", 400], ["ER_ROW_IS_REFERENCED_2", 409], ["ER_DATA_TOO_LONG", 400]] as const) {
    const resposta = responder({ code, sqlMessage: "SQL com informação privada", sql: "query privada" });
    assert.equal(resposta.codigo, status);
    assert.deepEqual(Object.keys(resposta.corpo as object), ["erro"]);
    assert.doesNotMatch(JSON.stringify(resposta.corpo), /SQL|privada|detalhe/);
  }
});

test("consulta inválida e JSON malformado continuam retornando erros 400 legíveis", () => {
  const consulta = responder(new ConsultaInvalida("limite deve ser um inteiro positivo"));
  assert.equal(consulta.codigo, 400);
  assert.deepEqual(consulta.corpo, { erro: "limite deve ser um inteiro positivo" });
  const json = responder({ type: "entity.parse.failed", message: "corpo com dados privados" });
  assert.equal(json.codigo, 400);
  assert.deepEqual(json.corpo, { erro: "O JSON enviado está mal formatado" });
});

test("erro inesperado tem resposta genérica e diagnóstico sem objeto ou mensagem brutos", (t) => {
  const log = t.mock.method(console, "error", () => {});
  for (const erro of [new Error("mysql://usuario:senha@host/banco"), null, undefined]) {
    const resposta = responder(erro);
    assert.equal(resposta.codigo, 500);
    assert.deepEqual(resposta.corpo, { erro: "Erro interno no servidor" });
  }
  assert.doesNotMatch(JSON.stringify(log.mock.calls.map((call) => call.arguments)), /mysql:|usuario:senha|stack/);
  assert.equal(log.mock.callCount(), 3);
});
