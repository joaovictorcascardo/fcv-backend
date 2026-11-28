"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beneficioCampanhaConveniadoController = void 0;
const beneficioCampanhaConveniadoModel_1 = require("../models/beneficioCampanhaConveniadoModel");
const beneficioCampanhaModel_1 = require("../models/beneficioCampanhaModel");
const conveniadoModel_1 = require("../models/conveniadoModel");
const historicoModel_1 = require("../models/historicoModel");
const validacoesCatalogo_1 = require("../utils/validacoesCatalogo");
// Confere os ids enviados (só os que vieram) e se o par item + conveniado já existe em outra oferta de campanha.
async function conferirVinculos(dados, atual) {
    if (dados.beneficio_campanha_id !== undefined && !(await beneficioCampanhaModel_1.beneficioCampanhaModel.buscarPorId(dados.beneficio_campanha_id))) {
        return { status: 400, erro: "Item de campanha informado não existe" };
    }
    if (dados.conveniado_id !== undefined && !(await conveniadoModel_1.conveniadoModel.buscarPorId(dados.conveniado_id))) {
        return { status: 400, erro: "Conveniado informado não existe" };
    }
    const final = { ...atual, ...dados };
    const trocouVinculo = !atual || final.beneficio_campanha_id !== atual.beneficio_campanha_id || final.conveniado_id !== atual.conveniado_id;
    if (!trocouVinculo)
        return null;
    if (atual && (await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.contarUtilizacoes(atual.id))) {
        return {
            status: 409,
            erro: "Não é possível trocar o item ou o conveniado de uma oferta de campanha com utilizações registradas. Inative esta oferta (status INATIVO) e crie outra",
        };
    }
    const repetida = await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.buscarPorPar(final.beneficio_campanha_id, final.conveniado_id);
    if (repetida && repetida.id !== atual?.id) {
        return { status: 409, erro: "Este conveniado já oferece este item de campanha" };
    }
    return null;
}
exports.beneficioCampanhaConveniadoController = {
    async listar(req, res) {
        const lista = await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.listar(req.query);
        res.json(lista);
    },
    async buscar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const item = await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.buscarPorId(id);
        if (!item) {
            res.status(404).json({
                erro: "Oferta do item de campanha não encontrada"
            });
            return;
        }
        res.json(item);
    },
    async criar(req, res) {
        const validacao = (0, validacoesCatalogo_1.validarOfertaCampanha)(req.body, true);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        const conflito = await conferirVinculos(validacao.dados);
        if (conflito) {
            res.status(conflito.status).json({ erro: conflito.erro });
            return;
        }
        const id = await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.criar(validacao.dados);
        const novo = await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.buscarPorId(id);
        res.status(201).json(novo);
    },
    async atualizar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const atual = await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.buscarPorId(id);
        if (!atual) {
            res.status(404).json({
                erro: "Oferta do item de campanha não encontrada"
            });
            return;
        }
        const validacao = (0, validacoesCatalogo_1.validarOfertaCampanha)(req.body, false);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        const conflito = await conferirVinculos(validacao.dados, atual);
        if (conflito) {
            res.status(conflito.status).json({ erro: conflito.erro });
            return;
        }
        await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.atualizar(id, validacao.dados);
        const atualizado = await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.buscarPorId(id);
        res.json(atualizado);
    },
    async excluir(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        if (await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.contarUtilizacoes(id)) {
            res.status(409).json({ erro: (0, historicoModel_1.mensagemExclusaoBloqueada)("oferta-campanha") });
            return;
        }
        const excluidos = await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.excluir(id);
        if (!excluidos) {
            res.status(404).json({
                erro: "Oferta do item de campanha não encontrada"
            });
            return;
        }
        res.status(204).send();
    },
};
