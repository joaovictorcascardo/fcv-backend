import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { authController } from "../src/controllers/authController";
import { acessoModel } from "../src/models/acessoModel";
import { redefinicaoSenhaModel } from "../src/models/redefinicaoSenhaModel";
import db from "../src/database/db";

test.after(() => db.destroy());

async function comModel(model: any, trocas: Record<string, Function>, corpo: () => Promise<void>) {
  const originais = Object.fromEntries(Object.keys(trocas).map(nome => [nome, model[nome]]));
  Object.assign(model, trocas);
  try { await corpo(); } finally { Object.assign(model, originais); }
}

async function executar(acao: Function, body: unknown = {}, usuario: object = { id: 7, escopo: "FCV" }) {
  const resposta = { status: 200, corpo: undefined as any };
  const res = {
    locals: { usuario },
    status(codigo: number) { resposta.status = codigo; return this; },
    json(corpo: unknown) { resposta.corpo = corpo; return this; },
  };
  await acao({ body }, res);
  return resposta;
}

test("dados do usuário FCV não consultam nem devolvem vínculos de outros escopos", async () => {
  assert.deepEqual(await acessoModel.buscarDados(7, "FCV"), { colaborador: null, conveniado: null });
  assert.deepEqual(await acessoModel.buscarDados(7, "DESCONHECIDO"), { colaborador: null, conveniado: null });
});

test("/auth/eu mantém os campos existentes e usa o escopo atual do banco para os vínculos", async () => {
  for (const escopo of ["FCV", "COLABORADOR", "CONVENIADO"]) {
    const usuario = { id: 7, nome: "Ana", email: "ana@teste.invalid", senha: "hash-privado", perfil_id: 1, perfil: "PERFIL_ATUAL", escopo, status: "ATIVO" };
    const dados = { colaborador: escopo === "COLABORADOR" ? { id: 3, matricula: "M3" } : null, conveniado: escopo === "CONVENIADO" ? { id: 4, nome_fantasia: "Loja" } : null };
    await comModel(acessoModel, {
      buscarPorId: async () => ({ ...usuario }),
      buscarDados: async (id: number, escopoAtual: string) => {
        assert.equal(id, 7);
        assert.equal(escopoAtual, escopo);
        return dados;
      },
    }, async () => {
      const resposta = await executar(authController.eu, {}, { id: 7, escopo: "ESCOPO_ANTIGO_DO_TOKEN" });
      const { senha, ...publico } = usuario;
      assert.equal(resposta.status, 200);
      assert.deepEqual(resposta.corpo, { ...publico, ...dados });
      assert.ok(!("senha" in resposta.corpo));
    });
  }
});

test("/auth/eu responde 404 sem buscar vínculos quando o usuário não existe", async () => {
  await comModel(acessoModel, {
    buscarPorId: async () => undefined,
    buscarDados: async () => assert.fail("não consultar dados sem usuário"),
  }, async () => assert.equal((await executar(authController.eu)).status, 404));
});

test("login usa o mesmo contrato de vínculos e não devolve o hash da senha", async () => {
  const segredoAnterior = process.env.JWT_SEGREDO;
  process.env.JWT_SEGREDO = "segredo-exclusivo-do-teste-unitario";
  try {
    const usuario = { id: 7, nome: "Ana", email: "ana@teste.invalid", senha: await bcrypt.hash("senha-teste", 4), perfil_id: 1, perfil: "FCV_ADMINISTRADOR", escopo: "FCV", status: "ATIVO", perfil_status: "ATIVO" };
    await comModel(acessoModel, {
      buscarPorEmail: async () => ({ ...usuario }),
      buscarDados: async (id: number, escopo: string) => {
        assert.equal(id, 7);
        assert.equal(escopo, "FCV");
        return { colaborador: null, conveniado: null };
      },
    }, async () => {
      const resposta = await executar(authController.login, { email: usuario.email, senha: "senha-teste" });
      assert.equal(resposta.status, 200);
      assert.equal(typeof resposta.corpo.token, "string");
      assert.equal(resposta.corpo.usuario.nome, "Ana");
      assert.equal(resposta.corpo.usuario.colaborador, null);
      assert.equal(resposta.corpo.usuario.conveniado, null);
      assert.ok(!("senha" in resposta.corpo.usuario));
    });
  } finally {
    if (segredoAnterior === undefined) delete process.env.JWT_SEGREDO;
    else process.env.JWT_SEGREDO = segredoAnterior;
  }
});

test("redefinição só responde sucesso depois que o consumo transacional terminou", async () => {
  let terminou = false;
  await comModel(redefinicaoSenhaModel, {
    redefinir: async (email: string, codigo: string, novaSenha: string) => {
      assert.deepEqual([email, codigo, novaSenha], ["ana@teste.invalid", "123456", "nova-senha"]);
      await Promise.resolve();
      terminou = true;
      return true;
    },
  }, async () => {
    const resposta = await executar(authController.redefinirSenha, { email: "ana@teste.invalid", codigo: "123456", nova_senha: "nova-senha" });
    assert.equal(terminou, true);
    assert.equal(resposta.status, 200);
    assert.deepEqual(resposta.corpo, { mensagem: "Senha alterada" });
  });
});

test("código já consumido, expirado ou inválido mantém erro público genérico", async () => {
  await comModel(redefinicaoSenhaModel, { redefinir: async () => false }, async () => {
    const resposta = await executar(authController.redefinirSenha, { email: "ana@teste.invalid", codigo: "123456", nova_senha: "nova-senha" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(resposta.corpo, { erro: "Código inválido ou expirado" });
  });
});

test("redefinição sem campos obrigatórios não inicia transação", async () => {
  await comModel(redefinicaoSenhaModel, { redefinir: async () => assert.fail("não consumir código sem entrada completa") }, async () => {
    for (const body of [{}, { email: "ana@teste.invalid", codigo: "123456" }, { email: "ana@teste.invalid", nova_senha: "nova-senha" }]) {
      assert.equal((await executar(authController.redefinirSenha, body)).status, 400);
    }
  });
});
