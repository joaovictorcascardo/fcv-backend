import assert from "node:assert/strict";
import test from "node:test";
import db from "../src/database/db";
import {
  dataValida,
  validarBeneficio,
  validarCampanha,
  validarItemCampanha,
  validarOferta,
  validarOfertaCampanha,
  validarUtilizacao,
} from "../src/utils/validacoesCatalogo";
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
import { conveniadoModel } from "../src/models/conveniadoModel";
import { colaboradorModel } from "../src/models/colaboradorModel";
import { utilizacaoModel } from "../src/models/utilizacaoModel";
import { utilizacaoController } from "../src/controllers/utilizacaoController";

test.after(() => db.destroy());

const beneficioValido = {
  nome: "Ingresso de cinema", tipo_beneficio: "VALOR_FIXO", valor: 20,
  quantidade_maxima_utilizacoes: 2, tipo_janela: "CALENDARIO_FIXO", unidade_ciclo: "MES",
};
const campanhaValida = { nome: "Novembro Azul", tipo: "CAMPANHA", data_inicio: "2026-11-01", data_fim: "2026-11-30" };

const erroDe = (resultado: { erro?: string }) => resultado.erro;

// --- Validações puras (sem banco) ---

test("datas: aceita só dias que existem no calendário e na faixa do MySQL", () => {
  assert.equal(dataValida("2024-02-29"), true);
  assert.equal(dataValida("2026-02-29"), false);
  assert.equal(dataValida("2026-13-01"), false);
  assert.equal(dataValida("0999-01-01"), false);
  assert.equal(dataValida("01/11/2026"), false);
});

test("benefício: limpa os textos e ignora campos desconhecidos, inclusive id", () => {
  assert.deepEqual(validarBeneficio({ ...beneficioValido, nome: "  Cinema  ", valor: "20", id: 99, lixo: true }), {
    dados: { ...beneficioValido, nome: "Cinema" },
  });
});

test("benefício: obrigatórios, tipos e enums respondem 400 com mensagem clara", () => {
  const sem = (campo: string) => { const corpo: any = { ...beneficioValido }; delete corpo[campo]; return validarBeneficio(corpo); };
  assert.equal(erroDe(sem("nome")), "Informe o nome do benefício");
  assert.match(erroDe(sem("tipo_beneficio"))!, /^Informe o tipo_beneficio\. Opções permitidas: PERCENTUAL, VALOR_FIXO$/);
  assert.equal(erroDe(sem("valor")), "Informe o valor do benefício");
  assert.equal(erroDe(validarBeneficio({ ...beneficioValido, valor: 0 })), "O valor do benefício deve ser um número maior que zero");
  assert.equal(erroDe(validarBeneficio({ ...beneficioValido, valor: "abc" })), "O valor do benefício deve ser um número maior que zero");
  assert.match(erroDe(validarBeneficio({ ...beneficioValido, quantidade_maxima_utilizacoes: 1.5 }))!, /inteiro maior que zero/);
  assert.equal(erroDe(validarBeneficio({ ...beneficioValido, status: "APAGADO" })), "Status inválido. Opções permitidas: ATIVO, INATIVO, DESCONTINUADO");
  assert.equal(erroDe(validarBeneficio({ ...beneficioValido, nome: "x".repeat(151) })), "O nome do benefício não pode ter mais de 150 caracteres");
  for (const resultado of [sem("nome"), validarBeneficio({ ...beneficioValido, valor: 0 })]) assert.equal(resultado.status, 400);
});

test("benefício: repete as regras da tabela (percentual até 100 e campos da janela)", () => {
  assert.equal(erroDe(validarBeneficio({ ...beneficioValido, tipo_beneficio: "PERCENTUAL", valor: 150 })), "Benefício PERCENTUAL não pode ter valor maior que 100");
  assert.match(erroDe(validarBeneficio({ ...beneficioValido, unidade_ciclo: undefined }))!, /CALENDARIO_FIXO, informe unidade_ciclo/);
  assert.match(erroDe(validarBeneficio({ ...beneficioValido, tipo_janela: "JANELA_MOVEL", intervalo_valor: 30 }))!, /JANELA_MOVEL, informe intervalo_valor, intervalo_unidade e referencia_contagem/);
});

test("benefício: na alteração, valida só o que veio e confere as regras com o registro atual", () => {
  const atual = { id: 1, ...beneficioValido, valor: 150 };
  assert.deepEqual(validarBeneficio({ nome: "Cinema 2D" }, atual), { dados: { nome: "Cinema 2D" } });
  assert.equal(erroDe(validarBeneficio({ tipo_beneficio: "PERCENTUAL" }, atual)), "Benefício PERCENTUAL não pode ter valor maior que 100");
  assert.equal(erroDe(validarBeneficio({ lixo: 1 }, atual)), "Nenhum dado válido fornecido para atualização");
  assert.equal(erroDe(validarBeneficio({ nome: "" }, atual)), "Informe o nome do benefício");
});

test("campanha: datas válidas e data_fim não pode ser antes de data_inicio", () => {
  assert.deepEqual(validarCampanha(campanhaValida), { dados: campanhaValida });
  assert.equal(erroDe(validarCampanha({ ...campanhaValida, data_fim: "2026-10-31" })), "A data_fim não pode ser anterior à data_inicio");
  assert.match(erroDe(validarCampanha({ ...campanhaValida, data_inicio: "2026-02-30" }))!, /^data_inicio inválida/);
  assert.match(erroDe(validarCampanha({ ...campanhaValida, tipo: "FESTA" }))!, /^Tipo inválido\. Opções permitidas: CAMPANHA/);
  // Alterando só uma data, a outra vem do registro atual.
  assert.equal(erroDe(validarCampanha({ data_fim: "2026-10-01" }, { id: 1, ...campanhaValida })), "A data_fim não pode ser anterior à data_inicio");
  assert.deepEqual(validarCampanha({ data_fim: "2026-12-15" }, { id: 1, ...campanhaValida }), { dados: { data_fim: "2026-12-15" } });
});

test("item de campanha: obrigatórios, percentual até 100 e quantidade opcional", () => {
  const item = { campanha_id: 1, nome: "Check-up", tipo_beneficio: "PERCENTUAL", valor: 30 };
  assert.deepEqual(validarItemCampanha({ ...item, quantidade_maxima_utilizacoes: null }), { dados: { ...item, quantidade_maxima_utilizacoes: null } });
  assert.equal(erroDe(validarItemCampanha({ ...item, valor: 101 })), "Item PERCENTUAL não pode ter valor maior que 100");
  assert.equal(erroDe(validarItemCampanha({ ...item, campanha_id: "abc" })), "Informe um campanha_id válido (número inteiro positivo)");
});

test("oferta comum e oferta de campanha não se misturam", () => {
  assert.deepEqual(validarOferta({ beneficio_id: "1", conveniado_id: 2 }, true), { dados: { beneficio_id: 1, conveniado_id: 2 } });
  assert.equal(erroDe(validarOferta({ beneficio_id: 1, conveniado_id: 2, beneficio_campanha_id: 3 }, true)),
    "Oferta comum não usa beneficio_campanha_id. Para itens de campanha use /ofertas-campanha");
  assert.equal(erroDe(validarOferta({ conveniado_id: 2 }, true)), "Informe um beneficio_id válido (número inteiro positivo)");
  assert.equal(erroDe(validarOfertaCampanha({ beneficio_campanha_id: 1, conveniado_id: 2, beneficio_id: 1 }, true)),
    "Oferta de campanha não usa beneficio_id. Para benefícios permanentes use /ofertas");
  assert.equal(erroDe(validarOfertaCampanha({ status: "PAUSADO" }, false)), "Status inválido. Opções permitidas: ATIVO, INATIVO");
});

test("utilização: exige exatamente uma origem e datas no formato do banco", () => {
  const base = { colaborador_id: 1, valor_aplicado: 25 };
  assert.deepEqual(validarUtilizacao({ ...base, beneficio_conveniado_id: 1 }, true), { dados: { ...base, beneficio_conveniado_id: 1 } });
  for (const corpo of [base, { ...base, beneficio_conveniado_id: 1, beneficio_campanha_conveniado_id: 1 }]) {
    assert.match(erroDe(validarUtilizacao(corpo, true))!, /^Informe uma única origem/);
  }
  assert.match(erroDe(validarUtilizacao({ ...base, beneficio_conveniado_id: 1, data_solicitacao: "2026-10-01" }, true))!, /AAAA-MM-DD HH:MM:SS/);
  assert.match(erroDe(validarUtilizacao({ ...base, beneficio_conveniado_id: 1, canal_validacao: "WHATSAPP" }, true))!, /^canal_validacao inválido/);
});

test("utilização: na alteração, colaborador e origem não mudam (fazem parte do histórico)", () => {
  for (const campo of ["colaborador_id", "beneficio_conveniado_id", "beneficio_campanha_conveniado_id"]) {
    assert.match(erroDe(validarUtilizacao({ [campo]: 2 }, false))!, new RegExp(`^${campo} não pode ser alterado`));
  }
  assert.deepEqual(validarUtilizacao({ status: "APROVADA", data_confirmacao: "2026-10-05 14:30:00" }, false), {
    dados: { status: "APROVADA", data_confirmacao: "2026-10-05 14:30:00" },
  });
});

// --- Controllers com os models trocados (sem banco) ---

async function comModels(trocas: [any, Record<string, Function>][], corpo: () => Promise<void>) {
  const originais = trocas.map(([model, metodos]) => [model, Object.fromEntries(Object.keys(metodos).map(nome => [nome, model[nome]]))] as const);
  for (const [model, metodos] of trocas) Object.assign(model, metodos);
  try { await corpo(); } finally { for (const [model, metodos] of originais) Object.assign(model, metodos); }
}

async function executar(acao: Function, { id, body }: { id?: string; body?: unknown } = {}) {
  const resposta = { status: 200, corpo: undefined as any };
  const res = {
    status(codigo: number) { resposta.status = codigo; return this; },
    json(corpo: unknown) { resposta.corpo = corpo; return this; },
    send() { return this; },
  };
  await acao({ params: { id }, body }, res);
  return resposta;
}

const naoChamar = (nome: string) => async () => assert.fail(`não deveria chamar ${nome}`);

test("id inválido na rota responde 400 antes de consultar o banco", async () => {
  const acoes = [
    beneficioController.buscar, beneficioConveniadoController.atualizar, campanhaEventoController.excluir,
    beneficioCampanhaController.buscar, beneficioCampanhaConveniadoController.atualizar, utilizacaoController.cancelar,
  ];
  await comModels([
    [beneficioModel, { buscarPorId: naoChamar("buscarPorId") }],
    [beneficioConveniadoModel, { buscarPorId: naoChamar("buscarPorId") }],
    [campanhaEventoModel, { contarUtilizacoes: naoChamar("contarUtilizacoes") }],
    [beneficioCampanhaModel, { buscarPorId: naoChamar("buscarPorId") }],
    [beneficioCampanhaConveniadoModel, { buscarPorId: naoChamar("buscarPorId") }],
    [utilizacaoModel, { buscarPorId: naoChamar("buscarPorId") }],
  ], async () => {
    for (const acao of acoes) {
      for (const id of ["abc", "0", "-1", "1.5"]) {
        const resposta = await executar(acao, { id, body: { status: "ATIVO" } });
        assert.equal(resposta.status, 400);
        assert.equal(resposta.corpo.erro, "ID inválido. Informe um número inteiro positivo");
      }
    }
  });
});

test("benefício: criar com dado inválido não chega no banco; alterar inexistente é 404", async () => {
  await comModels([[beneficioModel, { criar: naoChamar("criar"), buscarPorId: async () => undefined }]], async () => {
    assert.equal((await executar(beneficioController.criar, { body: { ...beneficioValido, valor: -1 } })).status, 400);
    assert.equal((await executar(beneficioController.atualizar, { id: "9", body: { nome: "X" } })).status, 404);
  });
});

test("campanha: criar com data_fim antes de data_inicio responde 400", async () => {
  await comModels([[campanhaEventoModel, { criar: naoChamar("criar") }]], async () => {
    const resposta = await executar(campanhaEventoController.criar, { body: { ...campanhaValida, data_fim: "2026-01-01" } });
    assert.equal(resposta.status, 400);
    assert.equal(resposta.corpo.erro, "A data_fim não pode ser anterior à data_inicio");
  });
});

test("oferta: benefício ou conveniado inexistente é 400; par repetido é 409; válido grava só os campos conhecidos", async () => {
  let gravado: unknown;
  const existe = async (id: number) => (id === 404 ? undefined : { id });
  await comModels([
    [beneficioModel, { buscarPorId: existe }],
    [conveniadoModel, { buscarPorId: existe }],
    [beneficioConveniadoModel, {
      buscarPorPar: async (beneficio: number, conveniado: number) => (beneficio === 1 && conveniado === 1 ? { id: 7 } : undefined),
      criar: async (dados: unknown) => { gravado = dados; return 10; },
      buscarPorId: async (id: number) => ({ id }),
    }],
  ], async () => {
    let resposta = await executar(beneficioConveniadoController.criar, { body: { beneficio_id: 404, conveniado_id: 1 } });
    assert.deepEqual([resposta.status, resposta.corpo.erro], [400, "Benefício informado não existe"]);
    resposta = await executar(beneficioConveniadoController.criar, { body: { beneficio_id: 1, conveniado_id: 404 } });
    assert.deepEqual([resposta.status, resposta.corpo.erro], [400, "Conveniado informado não existe"]);
    resposta = await executar(beneficioConveniadoController.criar, { body: { beneficio_id: 1, conveniado_id: 1 } });
    assert.deepEqual([resposta.status, resposta.corpo.erro], [409, "Este conveniado já oferece este benefício"]);
    resposta = await executar(beneficioConveniadoController.criar, { body: { beneficio_id: 1, conveniado_id: 2, id: 50 } });
    assert.equal(resposta.status, 201);
    assert.deepEqual(gravado, { beneficio_id: 1, conveniado_id: 2 });
  });
});

test("oferta com utilizações: não troca benefício nem conveniado, mas pode ser inativada", async () => {
  const atual = { id: 3, beneficio_id: 1, conveniado_id: 1, status: "ATIVO" };
  let alterado: unknown;
  await comModels([
    [conveniadoModel, { buscarPorId: async (id: number) => ({ id }) }],
    [beneficioConveniadoModel, {
      buscarPorId: async () => atual,
      contarUtilizacoes: async () => 4,
      buscarPorPar: async () => undefined,
      atualizar: async (_id: number, dados: unknown) => { alterado = dados; return 1; },
    }],
  ], async () => {
    const trocar = await executar(beneficioConveniadoController.atualizar, { id: "3", body: { conveniado_id: 2 } });
    assert.equal(trocar.status, 409);
    assert.match(trocar.corpo.erro, /^Não é possível trocar o benefício ou o conveniado/);
    assert.equal(alterado, undefined);

    const inativar = await executar(beneficioConveniadoController.atualizar, { id: "3", body: { status: "INATIVO" } });
    assert.equal(inativar.status, 200);
    assert.deepEqual(alterado, { status: "INATIVO" });
  });
});

test("item de campanha: campanha inexistente é 400; com utilizações não troca de campanha", async () => {
  const atual = { id: 2, campanha_id: 1, nome: "Check-up", tipo_beneficio: "VALOR_FIXO", valor: 10 };
  await comModels([
    [campanhaEventoModel, { buscarPorId: async (id: number) => (id === 404 ? undefined : { id }) }],
    [beneficioCampanhaModel, { buscarPorId: async () => atual, contarUtilizacoes: async () => 1, atualizar: naoChamar("atualizar"), criar: naoChamar("criar") }],
  ], async () => {
    let resposta = await executar(beneficioCampanhaController.criar, { body: { ...atual, id: undefined, campanha_id: 404 } });
    assert.deepEqual([resposta.status, resposta.corpo.erro], [400, "Campanha informada não existe"]);
    resposta = await executar(beneficioCampanhaController.atualizar, { id: "2", body: { campanha_id: 5 } });
    assert.equal(resposta.status, 409);
    assert.match(resposta.corpo.erro, /^Não é possível trocar a campanha/);
  });
});

test("oferta de campanha: item inexistente é 400 e par repetido é 409", async () => {
  await comModels([
    [beneficioCampanhaModel, { buscarPorId: async (id: number) => (id === 404 ? undefined : { id }) }],
    [conveniadoModel, { buscarPorId: async (id: number) => ({ id }) }],
    [beneficioCampanhaConveniadoModel, { buscarPorPar: async () => ({ id: 1 }), criar: naoChamar("criar") }],
  ], async () => {
    let resposta = await executar(beneficioCampanhaConveniadoController.criar, { body: { beneficio_campanha_id: 404, conveniado_id: 1 } });
    assert.deepEqual([resposta.status, resposta.corpo.erro], [400, "Item de campanha informado não existe"]);
    resposta = await executar(beneficioCampanhaConveniadoController.criar, { body: { beneficio_campanha_id: 1, conveniado_id: 2 } });
    assert.deepEqual([resposta.status, resposta.corpo.erro], [409, "Este conveniado já oferece este item de campanha"]);
  });
});

test("utilização: confere colaborador e cada origem na sua própria tabela; token repetido é 409", async () => {
  const base = { colaborador_id: 1, valor_aplicado: 25 };
  await comModels([
    [colaboradorModel, { buscarPorId: async (id: number) => (id === 404 ? undefined : { id }) }],
    [beneficioConveniadoModel, { buscarPorId: async (id: number) => (id === 404 ? undefined : { id }) }],
    // A oferta de campanha 1 não existe: o id 1 da oferta comum não pode valer para ela.
    [beneficioCampanhaConveniadoModel, { buscarPorId: async () => undefined }],
    [utilizacaoModel, { buscarPorToken: async (token: string) => (token === "usado" ? { id: 1 } : undefined), criar: naoChamar("criar") }],
  ], async () => {
    let resposta = await executar(utilizacaoController.criar, { body: { ...base, colaborador_id: 404, beneficio_conveniado_id: 1 } });
    assert.deepEqual([resposta.status, resposta.corpo.erro], [400, "Colaborador informado não existe"]);
    resposta = await executar(utilizacaoController.criar, { body: { ...base, beneficio_conveniado_id: 404 } });
    assert.deepEqual([resposta.status, resposta.corpo.erro], [400, "Oferta comum informada não existe (beneficio_conveniado_id)"]);
    resposta = await executar(utilizacaoController.criar, { body: { ...base, beneficio_campanha_conveniado_id: 1 } });
    assert.deepEqual([resposta.status, resposta.corpo.erro], [400, "Oferta de campanha informada não existe (beneficio_campanha_conveniado_id)"]);
    resposta = await executar(utilizacaoController.criar, { body: { ...base, beneficio_conveniado_id: 1, token_qrcode: "usado" } });
    assert.deepEqual([resposta.status, resposta.corpo.erro], [409, "Já existe uma utilização com esse token_qrcode"]);
  });
});

test("utilização: PUT trocando colaborador responde 400 sem alterar nada", async () => {
  await comModels([[utilizacaoModel, { buscarPorId: async () => ({ id: 1, colaborador_id: 1 }), atualizar: naoChamar("atualizar") }]], async () => {
    const resposta = await executar(utilizacaoController.atualizar, { id: "1", body: { colaborador_id: 2 } });
    assert.equal(resposta.status, 400);
    assert.match(resposta.corpo.erro, /^colaborador_id não pode ser alterado/);
  });
});
