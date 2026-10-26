import assert from "node:assert/strict";
import test from "node:test";
import db from "../src/database/db";
import { perfilAcessoController } from "../src/controllers/perfilAcessoController";
import { perfilAcessoModel } from "../src/models/perfilAcessoModel";
import { validarDataAdmissao, validarDescricaoPerfil, validarId, validarPermissoesPerfil } from "../src/utils/validacoes";
import { validarId as validarIdCatalogo, validarOferta, validarUtilizacao } from "../src/utils/validacoesCatalogo";

test.after(() => db.destroy());

test("IDs de cadastros e catálogo aceitam somente inteiros seguros positivos e strings decimais", () => {
  const valoresInvalidos: unknown[] = [
    true, false, [1], ["42"], [], {}, { valueOf() { throw new Error("Não deve tentar coerção"); } },
    null, undefined, Symbol("1"), 1n, "", " ", 0, -1, 1.5, NaN, Infinity,
    Number.MAX_SAFE_INTEGER + 1, "9007199254740992", "0x10", "1e3", "1.0", "+1",
  ];
  for (const validar of [validarId, validarIdCatalogo]) {
    for (const valor of valoresInvalidos) assert.equal(validar(valor), null, `Rejeita o tipo ${typeof valor}`);
    for (const [valor, esperado] of [[1, 1], ["42", 42], ["001", 1], [" 42 ", 42], [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]] as const) {
      assert.equal(validar(valor), esperado);
    }
  }
});

test("IDs booleanos ou arrays em ofertas e utilizações respondem validação 400", () => {
  assert.equal(validarOferta({ beneficio_id: true, conveniado_id: 1 }, true).status, 400);
  assert.equal(validarOferta({ beneficio_id: 1, conveniado_id: [1] }, true).status, 400);
  assert.equal(validarUtilizacao({ colaborador_id: { id: 1 }, beneficio_conveniado_id: 1 }, true).status, 400);
});

test("data de admissão rejeita dias normalizados pelo JavaScript e datas fora do MySQL", () => {
  for (const data of ["2026-02-30", "2026-02-29", "2026-04-31", "1900-02-29", "0000-01-01", "0999-12-31", "2026-00-15", "2026-12-00"]) {
    assert.equal(validarDataAdmissao(data).status, 400, data);
  }
  for (const data of ["2024-02-29", "2000-02-29", "1000-01-01", "9999-12-31"]) {
    assert.deepEqual(validarDataAdmissao(data), { valor: data });
  }
});

test("campos opcionais de perfil seguem os tipos documentados e aceitam limpeza com null", () => {
  assert.deepEqual(validarDescricaoPerfil(undefined), {});
  assert.deepEqual(validarDescricaoPerfil(null), { valor: null });
  assert.deepEqual(validarDescricaoPerfil("Consulta de dados"), { valor: "Consulta de dados" });
  for (const valor of [{ texto: "consulta" }, [], false, 1, "x".repeat(256)]) assert.equal(validarDescricaoPerfil(valor).status, 400);
  assert.deepEqual(validarPermissoesPerfil(null), { valor: null });
  assert.deepEqual(validarPermissoesPerfil([]), { valor: [] });
  assert.deepEqual(validarPermissoesPerfil(["consultar"]), { valor: ["consultar"] });
  for (const valor of ["consultar", { consultar: true }, [1], [null], ["consultar", {}]]) assert.equal(validarPermissoesPerfil(valor).status, 400);
});

function resposta() {
  return {
    codigo: 0, corpo: undefined as any,
    status(codigo: number) { this.codigo = codigo; return this; },
    json(corpo: unknown) { this.corpo = corpo; return this; },
  };
}

test("perfil: POST rejeita tipos inválidos antes de consultar ou persistir no banco", async (t) => {
  const buscar = t.mock.method(perfilAcessoModel, "buscarPorNome", async () => { assert.fail("Não deve consultar o banco"); });
  const criar = t.mock.method(perfilAcessoModel, "criar", async () => { assert.fail("Não deve criar registro"); });
  for (const campos of [{ descricao: {} }, { permissoes: "consultar" }, { status: false }]) {
    const res = resposta();
    await perfilAcessoController.criar({ body: { nome: "OPERADOR", escopo: "FCV", ...campos } } as any, res as any);
    assert.equal(res.codigo, 400);
  }
  assert.equal(buscar.mock.callCount(), 0);
  assert.equal(criar.mock.callCount(), 0);
});

test("perfil: PUT rejeita tipos inválidos sem chamar a atualização", async (t) => {
  t.mock.method(perfilAcessoModel, "buscarPorId", async () => ({ id: 1, nome: "OPERADOR" }));
  const atualizar = t.mock.method(perfilAcessoModel, "atualizar", async () => { assert.fail("Não deve atualizar registro"); });
  for (const body of [{ descricao: {} }, { permissoes: [1] }]) {
    const res = resposta();
    await perfilAcessoController.atualizar({ params: { id: "1" }, body } as any, res as any);
    assert.equal(res.codigo, 400);
  }
  assert.equal(atualizar.mock.callCount(), 0);
});
