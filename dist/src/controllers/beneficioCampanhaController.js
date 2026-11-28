"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beneficioCampanhaController = void 0;
const beneficioCampanhaModel_1 = require("../models/beneficioCampanhaModel");
const campanhaEventoModel_1 = require("../models/campanhaEventoModel");
const historicoModel_1 = require("../models/historicoModel");
const validacoesCatalogo_1 = require("../utils/validacoesCatalogo");
// Confere a campanha enviada e impede mudar de campanha um item que já foi usado.
async function conferirVinculos(dados, atual) {
    if (dados.campanha_id === undefined || dados.campanha_id === atual?.campanha_id)
        return null;
    if (!(await campanhaEventoModel_1.campanhaEventoModel.buscarPorId(dados.campanha_id))) {
        return { status: 400, erro: "Campanha informada não existe" };
    }
    if (atual && (await beneficioCampanhaModel_1.beneficioCampanhaModel.contarUtilizacoes(atual.id))) {
        return {
            status: 409,
            erro: "Não é possível trocar a campanha de um item com utilizações registradas. Inative este item (status INATIVO) e crie outro",
        };
    }
    return null;
}
exports.beneficioCampanhaController = {
    async listar(req, res) {
        const lista = await beneficioCampanhaModel_1.beneficioCampanhaModel.listar(req.query);
        res.json(lista);
    },
    async buscar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const item = await beneficioCampanhaModel_1.beneficioCampanhaModel.buscarPorId(id);
        if (!item) {
            res.status(404).json({ erro: "Item de campanha não encontrado" });
            return;
        }
        res.json(item);
    },
    async criar(req, res) {
        const validacao = (0, validacoesCatalogo_1.validarItemCampanha)(req.body);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        const conflito = await conferirVinculos(validacao.dados);
        if (conflito) {
            res.status(conflito.status).json({ erro: conflito.erro });
            return;
        }
        const id = await beneficioCampanhaModel_1.beneficioCampanhaModel.criar(validacao.dados);
        const novo = await beneficioCampanhaModel_1.beneficioCampanhaModel.buscarPorId(id);
        res.status(201).json(novo);
    },
    async atualizar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const atual = await beneficioCampanhaModel_1.beneficioCampanhaModel.buscarPorId(id);
        if (!atual) {
            res.status(404).json({ erro: "Item de campanha não encontrado" });
            return;
        }
        const validacao = (0, validacoesCatalogo_1.validarItemCampanha)(req.body, atual);
        if (!validacao.dados) {
            res.status(validacao.status).json({ erro: validacao.erro });
            return;
        }
        const conflito = await conferirVinculos(validacao.dados, atual);
        if (conflito) {
            res.status(conflito.status).json({ erro: conflito.erro });
            return;
        }
        await beneficioCampanhaModel_1.beneficioCampanhaModel.atualizar(id, validacao.dados);
        const atualizado = await beneficioCampanhaModel_1.beneficioCampanhaModel.buscarPorId(id);
        res.json(atualizado);
    },
    async excluir(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        if (await beneficioCampanhaModel_1.beneficioCampanhaModel.contarUtilizacoes(id)) {
            res.status(409).json({ erro: (0, historicoModel_1.mensagemExclusaoBloqueada)("item-campanha") });
            return;
        }
        const excluidos = await beneficioCampanhaModel_1.beneficioCampanhaModel.excluir(id);
        if (!excluidos) {
            res.status(404).json({ erro: "Item de campanha não encontrado" });
            return;
        }
        res.status(204).send();
    },
};
