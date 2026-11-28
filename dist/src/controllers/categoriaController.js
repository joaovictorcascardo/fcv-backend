"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriaController = void 0;
const categoriaModel_1 = require("../models/categoriaModel");
const validacoes_1 = require("../utils/validacoes");
exports.categoriaController = {
    async listar(req, res) {
        const status = req.query.status;
        if (status !== undefined &&
            (0, validacoes_1.validarStatusCategoria)(status).erro) {
            res.status(400).json({
                erro: "Status inválido. Use ATIVO ou INATIVO",
            });
            return;
        }
        res.json(await categoriaModel_1.categoriaModel.listar(status));
    },
    async buscar(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({
                erro: "ID inválido. Informe um número inteiro positivo",
            });
            return;
        }
        const categoria = await categoriaModel_1.categoriaModel.buscarPorId(id);
        if (!categoria) {
            res.status(404).json({
                erro: "Categoria não encontrada",
            });
            return;
        }
        res.json(categoria);
    },
    async criar(req, res) {
        const nome = (0, validacoes_1.validarNomeCategoria)(req.body?.nome);
        if (nome.erro) {
            res.status(nome.status).json({
                erro: nome.erro,
            });
            return;
        }
        const status = (0, validacoes_1.validarStatusCategoria)(req.body?.status);
        if (status.erro) {
            res.status(status.status).json({
                erro: status.erro,
            });
            return;
        }
        if (await categoriaModel_1.categoriaModel.buscarPorNome(nome.valor)) {
            res.status(409).json({
                erro: "Já existe uma categoria com esse nome",
            });
            return;
        }
        const id = await categoriaModel_1.categoriaModel.criar({
            nome: nome.valor,
            status: status.valor ?? "ATIVO",
        });
        res.status(201).json(await categoriaModel_1.categoriaModel.buscarPorId(id));
    },
    async atualizar(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({
                erro: "ID inválido. Informe um número inteiro positivo",
            });
            return;
        }
        const atual = await categoriaModel_1.categoriaModel.buscarPorId(id);
        if (!atual) {
            res.status(404).json({
                erro: "Categoria não encontrada",
            });
            return;
        }
        const dados = {};
        if (req.body?.nome !== undefined) {
            const nome = (0, validacoes_1.validarNomeCategoria)(req.body.nome);
            if (nome.erro) {
                res.status(nome.status).json({
                    erro: nome.erro,
                });
                return;
            }
            const repetida = await categoriaModel_1.categoriaModel.buscarPorNome(nome.valor);
            if (repetida && repetida.id !== id) {
                res.status(409).json({
                    erro: "Já existe uma categoria com esse nome",
                });
                return;
            }
            dados.nome = nome.valor;
        }
        if (req.body?.status !== undefined) {
            const status = (0, validacoes_1.validarStatusCategoria)(req.body.status);
            if (status.erro) {
                res.status(status.status).json({
                    erro: status.erro,
                });
                return;
            }
            dados.status = status.valor;
        }
        if (Object.keys(dados).length === 0) {
            res.status(400).json({
                erro: "Nenhum dado válido fornecido para atualização",
            });
            return;
        }
        await categoriaModel_1.categoriaModel.atualizar(id, dados);
        res.json(await categoriaModel_1.categoriaModel.buscarPorId(id));
    },
    async excluir(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({
                erro: "ID inválido. Informe um número inteiro positivo",
            });
            return;
        }
        if (!(await categoriaModel_1.categoriaModel.buscarPorId(id))) {
            res.status(404).json({
                erro: "Categoria não encontrada",
            });
            return;
        }
        const vinculados = await categoriaModel_1.categoriaModel.contarConveniados(id);
        if (vinculados > 0) {
            res.status(409).json({
                erro: `Esta categoria tem ${vinculados} conveniado(s) vinculado(s). Inative a categoria alterando o status para INATIVO`,
            });
            return;
        }
        await categoriaModel_1.categoriaModel.excluir(id);
        res.status(204).send();
    },
};
