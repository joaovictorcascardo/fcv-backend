"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campanhaEventoController = void 0;
const campanhaEventoModel_1 = require("../models/campanhaEventoModel");
const historicoModel_1 = require("../models/historicoModel");
const validacoesCatalogo_1 = require("../utils/validacoesCatalogo");
exports.campanhaEventoController = {
    async listar(req, res) {
        const lista = await campanhaEventoModel_1.campanhaEventoModel.listar(req.query);
        res.json(lista);
    },
    async buscar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const item = await campanhaEventoModel_1.campanhaEventoModel.buscarPorId(id);
        if (!item) {
            res.status(404).json({ erro: "Campanha/evento não encontrado" });
            return;
        }
        res.json(item);
    },
    async criar(req, res) {
        const validacao = (0, validacoesCatalogo_1.validarCampanha)(req.body);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        const id = await campanhaEventoModel_1.campanhaEventoModel.criar(validacao.dados);
        const novo = await campanhaEventoModel_1.campanhaEventoModel.buscarPorId(id);
        res.status(201).json(novo);
    },
    async atualizar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const atual = await campanhaEventoModel_1.campanhaEventoModel.buscarPorId(id);
        if (!atual) {
            res.status(404).json({ erro: "Campanha/evento não encontrado" });
            return;
        }
        const validacao = (0, validacoesCatalogo_1.validarCampanha)(req.body, atual);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        await campanhaEventoModel_1.campanhaEventoModel.atualizar(id, validacao.dados);
        const atualizado = await campanhaEventoModel_1.campanhaEventoModel.buscarPorId(id);
        res.json(atualizado);
    },
    async excluir(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        if (await campanhaEventoModel_1.campanhaEventoModel.contarUtilizacoes(id)) {
            res.status(409).json({ erro: (0, historicoModel_1.mensagemExclusaoBloqueada)("campanha") });
            return;
        }
        const excluidos = await campanhaEventoModel_1.campanhaEventoModel.excluir(id);
        if (!excluidos) {
            res.status(404).json({ erro: "Campanha/evento não encontrado" });
            return;
        }
        res.status(204).send();
    },
};
