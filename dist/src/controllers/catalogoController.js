"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalogoController = void 0;
const catalogoModel_1 = require("../models/catalogoModel");
const validacoes_1 = require("../utils/validacoes");
function lerFiltro(req, res) {
    const { busca, categoria_id } = req.query;
    if (busca !== undefined &&
        (typeof busca !== "string" || busca.length > 100)) {
        res.status(400).json({
            erro: "A busca deve ser um texto de até 100 caracteres",
        });
        return null;
    }
    const categoriaId = categoria_id === undefined || categoria_id === ""
        ? undefined
        : (0, validacoes_1.validarId)(categoria_id);
    if (categoriaId === null) {
        res.status(400).json({
            erro: "categoria_id deve ser um número inteiro positivo",
        });
        return null;
    }
    return {
        busca: busca?.trim() || undefined,
        categoriaId,
    };
}
exports.catalogoController = {
    async resumo(_req, res) {
        res.json(await catalogoModel_1.catalogoModel.resumo());
    },
    async beneficios(req, res) {
        const filtro = lerFiltro(req, res);
        if (!filtro)
            return;
        res.json(await catalogoModel_1.catalogoModel.listarBeneficios(filtro));
    },
    async beneficio(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({
                erro: "ID inválido. Informe um número inteiro positivo",
            });
            return;
        }
        const beneficio = await catalogoModel_1.catalogoModel.buscarBeneficio(id);
        if (!beneficio) {
            res.status(404).json({
                erro: "Benefício não encontrado ou inativo",
            });
            return;
        }
        res.json(beneficio);
    },
    async locais(req, res) {
        const filtro = lerFiltro(req, res);
        if (!filtro)
            return;
        res.json(await catalogoModel_1.catalogoModel.listarLocais(filtro));
    },
    async local(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({
                erro: "ID inválido. Informe um número inteiro positivo",
            });
            return;
        }
        const local = await catalogoModel_1.catalogoModel.buscarLocal(id);
        if (!local) {
            res.status(404).json({
                erro: "Local não encontrado ou inativo",
            });
            return;
        }
        res.json(local);
    },
};
