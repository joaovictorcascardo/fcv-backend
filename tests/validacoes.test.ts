import assert from "node:assert/strict";
import test from "node:test";
import {
  validarCargo,
  validarCategoria,
  validarCNPJConveniado,
  validarDataAdmissao,
  validarEmailUsuario,
  validarEndereco,
  validarEscopo,
  validarId,
  validarMatricula,
  validarNomeFantasia,
  validarNomePerfil,
  validarNomeUsuario,
  validarRazaoSocial,
  validarSenha,
  validarSetor,
  validarStatusColaborador,
  validarStatusConveniado,
  validarStatusPerfil,
  validarStatusUsuario,
  validarTelefone,
} from "../src/utils/validacoes";

test("validarId aceita inteiros positivos e rejeita invalidos", () => {
  assert.equal(validarId(1), 1);
  assert.equal(validarId("42"), 42);
  assert.equal(validarId(0), null);
  assert.equal(validarId(-5), null);
  assert.equal(validarId("abc"), null);
  assert.equal(validarId(3.14), null);
  assert.equal(validarId(null), null);
  assert.equal(validarId(undefined), null);
});

test("validacoes de perfil de acesso", () => {
  assert.deepEqual(validarNomePerfil("  FCV_ADMIN  "), { valor: "FCV_ADMIN" });
  assert.equal(validarNomePerfil("")?.status, 400);
  assert.equal(validarNomePerfil("   ")?.status, 400);
  assert.equal(validarNomePerfil("A".repeat(51))?.status, 400);

  assert.deepEqual(validarEscopo("FCV"), { valor: "FCV" });
  assert.deepEqual(validarEscopo("COLABORADOR"), { valor: "COLABORADOR" });
  assert.deepEqual(validarEscopo("CONVENIADO"), { valor: "CONVENIADO" });
  assert.deepEqual(validarEscopo(undefined), {});
  assert.equal(validarEscopo("OUTRO")?.status, 400);

  assert.deepEqual(validarStatusPerfil("ATIVO"), { valor: "ATIVO" });
  assert.deepEqual(validarStatusPerfil("INATIVO"), { valor: "INATIVO" });
  assert.deepEqual(validarStatusPerfil(undefined), {});
  assert.equal(validarStatusPerfil("PENDENTE")?.status, 400);
});

test("validacoes de usuario", () => {
  assert.deepEqual(validarNomeUsuario("  Maria Silva  "), { valor: "Maria Silva" });
  assert.equal(validarNomeUsuario("")?.status, 400);
  assert.equal(validarNomeUsuario("A".repeat(151))?.status, 400);

  assert.deepEqual(validarEmailUsuario("  Teste@FCV.org.br "), { valor: "teste@fcv.org.br" });
  assert.equal(validarEmailUsuario("")?.status, 400);
  assert.equal(validarEmailUsuario("email-invalido")?.status, 400);
  assert.equal(validarEmailUsuario("sem-dominio@")?.status, 400);

  assert.deepEqual(validarSenha("123456"), { valor: "123456" });
  assert.equal(validarSenha("")?.status, 400);
  assert.equal(validarSenha("     ")?.status, 400);
  assert.equal(validarSenha("12345")?.status, 400);

  assert.deepEqual(validarStatusUsuario("ATIVO"), { valor: "ATIVO" });
  assert.deepEqual(validarStatusUsuario("INATIVO"), { valor: "INATIVO" });
  assert.equal(validarStatusUsuario("AFASTADO")?.status, 400);
});

test("validacoes de colaborador", () => {
  assert.deepEqual(validarMatricula("  FCV0100 "), { valor: "FCV0100" });
  assert.equal(validarMatricula("")?.status, 400);
  assert.equal(validarMatricula("M".repeat(31))?.status, 400);

  assert.deepEqual(validarSetor(" Farmacia "), { valor: "Farmacia" });
  assert.equal(validarSetor("")?.status, 400);
  assert.equal(validarSetor("S".repeat(101))?.status, 400);

  assert.deepEqual(validarCargo(" Farmaceutico "), { valor: "Farmaceutico" });
  assert.equal(validarCargo("")?.status, 400);
  assert.equal(validarCargo("C".repeat(101))?.status, 400);

  assert.deepEqual(validarDataAdmissao("2026-09-01"), { valor: "2026-09-01" });
  assert.equal(validarDataAdmissao("01/09/2026")?.status, 400);
  assert.equal(validarDataAdmissao("2026-13-45")?.status, 400);
  assert.equal(validarDataAdmissao("")?.status, 400);

  assert.deepEqual(validarStatusColaborador("ATIVO"), { valor: "ATIVO" });
  assert.deepEqual(validarStatusColaborador("INATIVO"), { valor: "INATIVO" });
  assert.deepEqual(validarStatusColaborador("AFASTADO"), { valor: "AFASTADO" });
  assert.equal(validarStatusColaborador("EM_ANALISE")?.status, 400);

  assert.deepEqual(validarTelefone(" 32988887777 "), { valor: "32988887777" });
  assert.deepEqual(validarTelefone(undefined), { valor: null });
  assert.deepEqual(validarTelefone(""), { valor: null });
  assert.equal(validarTelefone("1".repeat(21))?.status, 400);
});

test("validacoes de conveniado", () => {
  assert.deepEqual(validarNomeFantasia(" Padaria Pao Bom "), { valor: "Padaria Pao Bom" });
  assert.equal(validarNomeFantasia("")?.status, 400);
  assert.equal(validarNomeFantasia("N".repeat(151))?.status, 400);

  assert.deepEqual(validarRazaoSocial(" Pao Bom Ltda "), { valor: "Pao Bom Ltda" });
  assert.equal(validarRazaoSocial("")?.status, 400);
  assert.equal(validarRazaoSocial("R".repeat(151))?.status, 400);

  assert.deepEqual(validarCategoria(" Alimentacao "), { valor: "Alimentacao" });
  assert.equal(validarCategoria("")?.status, 400);
  assert.equal(validarCategoria("C".repeat(61))?.status, 400);

  assert.deepEqual(validarCNPJConveniado("44.555.666/0001-54"), { valor: "44555666000154" });
  assert.deepEqual(validarCNPJConveniado("44555666000154"), { valor: "44555666000154" });
  assert.equal(validarCNPJConveniado("123456")?.status, 400);
  assert.equal(validarCNPJConveniado("")?.status, 400);

  assert.deepEqual(validarEndereco(" Rua Principal, 100 "), { valor: "Rua Principal, 100" });
  assert.equal(validarEndereco("")?.status, 400);
  assert.equal(validarEndereco("E".repeat(256))?.status, 400);

  assert.deepEqual(validarStatusConveniado("ATIVO"), { valor: "ATIVO" });
  assert.deepEqual(validarStatusConveniado("INATIVO"), { valor: "INATIVO" });
  assert.deepEqual(validarStatusConveniado("EM_ANALISE"), { valor: "EM_ANALISE" });
  assert.equal(validarStatusConveniado("AFASTADO")?.status, 400);
});
