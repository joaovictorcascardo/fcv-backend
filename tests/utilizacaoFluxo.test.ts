import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { utilizacaoController } from "../src/controllers/utilizacaoController";
import { acessoModel } from "../src/models/acessoModel";
import { beneficioConveniadoModel } from "../src/models/beneficioConveniadoModel";
import { beneficioModel } from "../src/models/beneficioModel";
import { colaboradorModel } from "../src/models/colaboradorModel";
import { utilizacaoModel } from "../src/models/utilizacaoModel";

function resposta(usuario = { id: 1, escopo: "FCV" }) {
  const estado: { status?: number; corpo?: any } = {};
  const res = {
    locals: { usuario },
    status(codigo: number) { estado.status = codigo; return this; },
    json(corpo: unknown) { estado.corpo = corpo; return this; },
  } as unknown as Response;
  return { estado, res };
}

function requisicao(body: unknown) {
  return { body } as unknown as Request;
}

function assertErro(corpo: any) {
  assert.equal(typeof corpo?.erro, "string");
  assert.ok(corpo.erro.length > 0);
  assert.deepEqual(Object.keys(corpo), ["erro"]);
}

async function comCriarEspiao(
  corpo: (chamadas: () => number) => Promise<void>,
) {
  const criar = utilizacaoModel.criar;
  let chamadas = 0;
  try {
    utilizacaoModel.criar = async () => { chamadas++; return 1; };
    await corpo(() => chamadas);
  } finally {
    utilizacaoModel.criar = criar;
  }
}

test("criar bloqueia benefício comum que atingiu o limite de uso sem persistir", async () => {
  const buscarDados = acessoModel.buscarDados;
  const buscarOferta = beneficioConveniadoModel.buscarPorId;
  const contarHoje = beneficioModel.contarUsosHoje;
  const buscarConfiguracao = beneficioModel.buscarConfiguracao;
  const contarMes = beneficioModel.contarUsosMesAtual;
  try {
    acessoModel.buscarDados = async () => ({ colaborador: { id: 42 }, conveniado: null });
    beneficioConveniadoModel.buscarPorId = async () => ({ id: 8, beneficio_id: 5 });
    beneficioModel.contarUsosHoje = async () => 0;
    beneficioModel.buscarConfiguracao = async () => ({
      id: 5, nome: "Benefício teste", quantidade_maxima_utilizacoes: 4,
    } as any);
    beneficioModel.contarUsosMesAtual = async () => 4;
    await comCriarEspiao(async chamadas => {
      const { estado, res } = resposta({ id: 20, escopo: "COLABORADOR" });
      await utilizacaoController.criar(
        requisicao({ beneficio_conveniado_id: 8, valor_aplicado: 10 }), res,
      );
      assert.equal(estado.status, 400);
      assertErro(estado.corpo);
      assert.equal(chamadas(), 0);
    });
  } finally {
    acessoModel.buscarDados = buscarDados;
    beneficioConveniadoModel.buscarPorId = buscarOferta;
    beneficioModel.contarUsosHoje = contarHoje;
    beneficioModel.buscarConfiguracao = buscarConfiguracao;
    beneficioModel.contarUsosMesAtual = contarMes;
  }
});

test("criar retorna 404 para oferta de benefício inexistente sem persistir", async () => {
  const buscarOferta = beneficioConveniadoModel.buscarPorId;
  try {
    beneficioConveniadoModel.buscarPorId = async () => undefined;
    await comCriarEspiao(async chamadas => {
      const { estado, res } = resposta();
      await utilizacaoController.criar(
        requisicao({ colaborador_id: 42, beneficio_conveniado_id: 999, valor_aplicado: 10 }), res,
      );
      assert.equal(estado.status, 404);
      assert.deepEqual(estado.corpo, { erro: "Oferta de benefício não encontrada" });
      assert.equal(chamadas(), 0);
    });
  } finally {
    beneficioConveniadoModel.buscarPorId = buscarOferta;
  }
});

test("criar retorna 404 para colaborador inexistente (FCV) sem persistir", async () => {
  const buscarOferta = beneficioConveniadoModel.buscarPorId;
  const buscarColaborador = colaboradorModel.buscarPorId;
  try {
    beneficioConveniadoModel.buscarPorId = async () => ({ id: 8, beneficio_id: 5 });
    colaboradorModel.buscarPorId = (async () => undefined) as any;
    await comCriarEspiao(async chamadas => {
      const { estado, res } = resposta();
      await utilizacaoController.criar(
        requisicao({ colaborador_id: 999, beneficio_conveniado_id: 8, valor_aplicado: 10 }), res,
      );
      assert.equal(estado.status, 404);
      assert.deepEqual(estado.corpo, { erro: "Cadastro de colaborador não encontrado" });
      assert.equal(chamadas(), 0);
    });
  } finally {
    beneficioConveniadoModel.buscarPorId = buscarOferta;
    colaboradorModel.buscarPorId = buscarColaborador;
  }
});

test("criar retorna 400 para valor_aplicado ausente ou inválido sem persistir", async () => {
  const invalidos: Array<[string, unknown]> = [
    ["ausente", undefined],
    ["nulo", null],
    ["vazio", ""],
    ["espaços", "   "],
    ["texto", "abc"],
    ["infinito", Infinity],
  ];
  await comCriarEspiao(async chamadas => {
    for (const [descricao, valor] of invalidos) {
      const body: Record<string, unknown> = { colaborador_id: 42, beneficio_conveniado_id: 8 };
      if (valor !== undefined) body.valor_aplicado = valor;
      const { estado, res } = resposta();
      await utilizacaoController.criar(requisicao(body), res);
      assert.equal(estado.status, 400, descricao);
      assertErro(estado.corpo);
    }
    assert.equal(chamadas(), 0);
  });
});

test("criar retorna 400 quando nenhuma ou as duas origens são informadas sem persistir", async () => {
  const corpos = [
    { colaborador_id: 42, valor_aplicado: 10 },
    { colaborador_id: 42, valor_aplicado: 10, beneficio_conveniado_id: 8, beneficio_campanha_conveniado_id: 12 },
  ];
  await comCriarEspiao(async chamadas => {
    for (const body of corpos) {
      const { estado, res } = resposta();
      await utilizacaoController.criar(requisicao(body), res);
      assert.equal(estado.status, 400);
      assertErro(estado.corpo);
    }
    assert.equal(chamadas(), 0);
  });
});

