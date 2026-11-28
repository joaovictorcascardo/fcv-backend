"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beneficioConveniadoController = void 0;
const beneficioConveniadoModel_1 = require("../models/beneficioConveniadoModel");
const beneficioModel_1 = require("../models/beneficioModel");
const conveniadoModel_1 = require("../models/conveniadoModel");
const historicoModel_1 = require("../models/historicoModel");
const validacoesCatalogo_1 = require("../utils/validacoesCatalogo");
// Confere os ids enviados (só os que vieram) e se o par benefício + conveniado já existe em outra oferta.
async function conferirVinculos(dados, atual) {
    if (dados.beneficio_id !== undefined && !(await beneficioModel_1.beneficioModel.buscarPorId(dados.beneficio_id))) {
        return { status: 400, erro: "Benefício informado não existe" };
    }
    if (dados.conveniado_id !== undefined && !(await conveniadoModel_1.conveniadoModel.buscarPorId(dados.conveniado_id))) {
        return { status: 400, erro: "Conveniado informado não existe" };
    }
    const final = { ...atual, ...dados };
    const trocouVinculo = !atual || final.beneficio_id !== atual.beneficio_id || final.conveniado_id !== atual.conveniado_id;
    if (!trocouVinculo)
        return null;
    if (atual && (await beneficioConveniadoModel_1.beneficioConveniadoModel.contarUtilizacoes(atual.id))) {
        return {
            status: 409,
            erro: "Não é possível trocar o benefício ou o conveniado de uma oferta com utilizações registradas. Inative esta oferta (status INATIVO) e crie outra",
        };
    }
    const repetida = await beneficioConveniadoModel_1.beneficioConveniadoModel.buscarPorPar(final.beneficio_id, final.conveniado_id);
    if (repetida && repetida.id !== atual?.id) {
        return { status: 409, erro: "Este conveniado já oferece este benefício" };
    }
    return null;
}
exports.beneficioConveniadoController = {
    async listar(req, res) {
        const lista = await beneficioConveniadoModel_1.beneficioConveniadoModel.listar(req.query);
        res.json(lista);
    },
    async buscar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const item = await beneficioConveniadoModel_1.beneficioConveniadoModel.buscarPorId(id);
        if (!item) {
            res.status(404).json({
                erro: "Oferta não encontrada"
            });
            return;
        }
        res.json(item);
    },
    async criar(req, res) {
        const validacao = (0, validacoesCatalogo_1.validarOferta)(req.body, true);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        const conflito = await conferirVinculos(validacao.dados);
        if (conflito) {
            res.status(conflito.status).json({ erro: conflito.erro });
            return;
        }
        const id = await beneficioConveniadoModel_1.beneficioConveniadoModel.criar(validacao.dados);
        const novo = await beneficioConveniadoModel_1.beneficioConveniadoModel.buscarPorId(id);
        res.status(201).json(novo);
    },
    async atualizar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const atual = await beneficioConveniadoModel_1.beneficioConveniadoModel.buscarPorId(id);
        if (!atual) {
            res.status(404).json({
                erro: "Oferta não encontrada"
            });
            return;
        }
        const validacao = (0, validacoesCatalogo_1.validarOferta)(req.body, false);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        const conflito = await conferirVinculos(validacao.dados, atual);
        if (conflito) {
            res.status(conflito.status).json({ erro: conflito.erro });
            return;
        }
        await beneficioConveniadoModel_1.beneficioConveniadoModel.atualizar(id, validacao.dados);
        const atualizado = await beneficioConveniadoModel_1.beneficioConveniadoModel.buscarPorId(id);
        res.json(atualizado);
    },
    async excluir(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        if (await beneficioConveniadoModel_1.beneficioConveniadoModel.contarUtilizacoes(id)) {
            res.status(409).json({ erro: (0, historicoModel_1.mensagemExclusaoBloqueada)("oferta") });
            return;
        }
        const excluidos = await beneficioConveniadoModel_1.beneficioConveniadoModel.excluir(id);
        if (!excluidos) {
            res.status(404).json({
                erro: "Oferta não encontrada"
            });
            return;
        }
        res.status(204).send();
    },
};
