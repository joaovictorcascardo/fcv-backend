"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beneficioController = void 0;
const beneficioModel_1 = require("../models/beneficioModel");
const historicoModel_1 = require("../models/historicoModel");
const validacoesCatalogo_1 = require("../utils/validacoesCatalogo");
exports.beneficioController = {
    async listar(req, res) {
        const lista = await beneficioModel_1.beneficioModel.listar(req.query);
        res.json(lista);
    },
    async buscar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const item = await beneficioModel_1.beneficioModel.buscarPorId(id);
        if (!item) {
            res.status(404).json({ erro: "Benefício não encontrado" });
            return;
        }
        res.json(item);
    },
    async criar(req, res) {
        const validacao = (0, validacoesCatalogo_1.validarBeneficio)(req.body);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        const id = await beneficioModel_1.beneficioModel.criar(validacao.dados);
        const novo = await beneficioModel_1.beneficioModel.buscarPorId(id);
        res.status(201).json(novo);
    },
    async atualizar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const atual = await beneficioModel_1.beneficioModel.buscarPorId(id);
        if (!atual) {
            res.status(404).json({ erro: "Benefício não encontrado" });
            return;
        }
        const validacao = (0, validacoesCatalogo_1.validarBeneficio)(req.body, atual);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        await beneficioModel_1.beneficioModel.atualizar(id, validacao.dados);
        const atualizado = await beneficioModel_1.beneficioModel.buscarPorId(id);
        res.json(atualizado);
    },
    async excluir(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        if (await beneficioModel_1.beneficioModel.contarUtilizacoes(id)) {
            res.status(409).json({ erro: (0, historicoModel_1.mensagemExclusaoBloqueada)("beneficio") });
            return;
        }
        const excluidos = await beneficioModel_1.beneficioModel.excluir(id);
        if (!excluidos) {
            res.status(404).json({ erro: "Benefício não encontrado" });
            return;
        }
        res.status(204).send();
    },
};
