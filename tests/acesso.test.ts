import assert from "node:assert/strict";
import test from "node:test";
import { motivoBloqueio } from "../src/models/acessoModel";
import { permitir, permitirPerfil } from "../src/middlewares/permitir";
import db from "../src/database/db";
test.after(() => db.destroy());
const ativo = { status: "ATIVO", perfil_status: "ATIVO" };
test("libera usuário ativo com perfil e vínculo ativos", () => {
    assert.equal(motivoBloqueio({ ...ativo, escopo: "FCV" }), null);
    assert.equal(motivoBloqueio({ ...ativo, escopo: "COLABORADOR", colaborador_status: "ATIVO" }), null);
    assert.equal(motivoBloqueio({ ...ativo, escopo: "CONVENIADO", conveniado_status: "ATIVO" }), null);
});
test("bloqueia usuário ou perfil inativo", () => {
    assert.equal(motivoBloqueio({ ...ativo, escopo: "FCV", status: "INATIVO" }), "Usuário inativo");
    assert.equal(motivoBloqueio({ ...ativo, escopo: "FCV", perfil_status: "INATIVO" }), "Perfil de acesso inativo");
});
test("bloqueia colaborador inativo, afastado ou sem cadastro", () => {
    for (const colaborador_status of ["INATIVO", "AFASTADO", null]) {
        assert.equal(motivoBloqueio({ ...ativo, escopo: "COLABORADOR", colaborador_status }), "Colaborador inativo ou afastado");
    }
});
test("bloqueia conveniado em análise ou inativo", () => {
    assert.equal(motivoBloqueio({ ...ativo, escopo: "CONVENIADO", conveniado_status: "EM_ANALISE" }), "Cadastro do estabelecimento 
em análise");
assert.equal(motivoBloqueio({ ...ativo, escopo: "CONVENIADO", conveniado_status: "INATIVO" }), "Estabelecimento inativo");
});
function executar(middleware: Function, usuario: object) {
    let status = 200;
    let chamouNext = false;
    const res = { locals: { usuario }, status(codigo: number) { status = codigo; return this; }, json() { return this; } };
    middleware({}, res, () => { chamouNext = true; });
    return { status, chamouNext };
}
test("permitirPerfil separa administrador e operador", () => {
    const soAdministrador = permitirPerfil("FCV_ADMINISTRADOR");
    assert.deepEqual(executar(soAdministrador, { perfil: "FCV_ADMINISTRADOR", escopo: "FCV" }), {
        status: 200, chamouNext: true
    });
    assert.deepEqual(executar(soAdministrador, { perfil: "FCV_OPERADOR", escopo: "FCV" }), { status: 403, chamouNext: false });
});
test("permitir continua olhando só o escopo", () => {
    assert.deepEqual(executar(permitir("FCV"), { perfil: "FCV_OPERADOR", escopo: "FCV" }), { status: 200, chamouNext: true });
    assert.deepEqual(executar(permitir("FCV"), { perfil: "COLABORADOR", escopo: "COLABORADOR" }), {
        status: 403, chamouNext: false
    });
});