"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utilizacaoController = void 0;
const utilizacaoModel_1 = require("../models/utilizacaoModel");
const colaboradorModel_1 = require("../models/colaboradorModel");
const beneficioConveniadoModel_1 = require("../models/beneficioConveniadoModel");
const beneficioCampanhaConveniadoModel_1 = require("../models/beneficioCampanhaConveniadoModel");
const validacoesCatalogo_1 = require("../utils/validacoesCatalogo");
// Confere se colaborador e oferta existem (cada origem na sua tabela) e se o token já foi usado.
async function conferirVinculos(dados, atual) {
    if (dados.colaborador_id !== undefined && !(await colaboradorModel_1.colaboradorModel.buscarPorId(dados.colaborador_id))) {
        return { status: 400, erro: "Colaborador informado não existe" };
    }
    if (dados.beneficio_conveniado_id !== undefined && !(await beneficioConveniadoModel_1.beneficioConveniadoModel.buscarPorId(dados.beneficio_conveniado_id))) {
        return { status: 400, erro: "Oferta comum informada não existe (beneficio_conveniado_id)" };
    }
    if (dados.beneficio_campanha_conveniado_id !== undefined &&
        !(await beneficioCampanhaConveniadoModel_1.beneficioCampanhaConveniadoModel.buscarPorId(dados.beneficio_campanha_conveniado_id))) {
        return { status: 400, erro: "Oferta de campanha informada não existe (beneficio_campanha_conveniado_id)" };
    }
    if (dados.token_qrcode !== undefined && dados.token_qrcode !== atual?.token_qrcode) {
        const repetida = await utilizacaoModel_1.utilizacaoModel.buscarPorToken(dados.token_qrcode);
        if (repetida) {
            return { status: 409, erro: "Já existe uma utilização com esse token_qrcode" };
        }
    }
    return null;
}
exports.utilizacaoController = {
    async listar(req, res) {
        const lista = await utilizacaoModel_1.utilizacaoModel.listar(req.query);
        res.json(lista);
    },
    async buscar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const item = await utilizacaoModel_1.utilizacaoModel.buscarPorId(id);
        if (!item) {
            res.status(404).json({ erro: "Utilização não encontrada" });
            return;
        }
        res.json(item);
    },
    async criar(req, res) {
        const validacao = (0, validacoesCatalogo_1.validarUtilizacao)(req.body, true);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        const conflito = await conferirVinculos(validacao.dados);
        if (conflito) {
            res.status(conflito.status).json({ erro: conflito.erro });
            return;
        }
        const id = await utilizacaoModel_1.utilizacaoModel.criar(validacao.dados);
        const novo = await utilizacaoModel_1.utilizacaoModel.buscarPorId(id);
        res.status(201).json(novo);
    },
    async atualizar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const atual = await utilizacaoModel_1.utilizacaoModel.buscarPorId(id);
        if (!atual) {
            res.status(404).json({ erro: "Utilização não encontrada" });
            return;
        }
        const validacao = (0, validacoesCatalogo_1.validarUtilizacao)(req.body, false);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        const conflito = await conferirVinculos(validacao.dados, atual);
        if (conflito) {
            res.status(conflito.status).json({ erro: conflito.erro });
            return;
        }
        await utilizacaoModel_1.utilizacaoModel.atualizar(id, validacao.dados);
        const atualizado = await utilizacaoModel_1.utilizacaoModel.buscarPorId(id);
        res.json(atualizado);
    },
    async cancelar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const item = await utilizacaoModel_1.utilizacaoModel.buscarPorId(id);
        if (!item) {
            res.status(404).json({ erro: "Utilização não encontrada" });
            return;
        }
        const novoStatus = (0, utilizacaoModel_1.statusAoCancelar)(item.status);
        if (!novoStatus) {
            res.status(409).json({ erro: `Utilização já encerrada (status ${item.status}): não pode ser cancelada` });
            return;
        }
        const alterados = await utilizacaoModel_1.utilizacaoModel.cancelar(id, item.status, novoStatus, (0, utilizacaoModel_1.observacaoAoCancelar)(item.observacoes));
        if (!alterados) {
            res.status(409).json({ erro: "O status da utilização mudou durante o cancelamento. Consulte de novo" });
            return;
        }
        const cancelado = await utilizacaoModel_1.utilizacaoModel.buscarPorId(id);
        res.json(cancelado);
    },
};
