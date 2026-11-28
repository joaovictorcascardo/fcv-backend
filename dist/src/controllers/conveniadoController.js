"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conveniadoController = void 0;
const conveniadoModel_1 = require("../models/conveniadoModel");
const usuarioModel_1 = require("../models/usuarioModel");
const validacoes_1 = require("../utils/validacoes");
exports.conveniadoController = {
    async listar(req, res) {
        const lista = await conveniadoModel_1.conveniadoModel.listar(req.query);
        res.json(lista);
    },
    async buscar(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({
                erro: "ID inválido. Informe um número inteiro positivo",
            });
            return;
        }
        const item = await conveniadoModel_1.conveniadoModel.buscarPorId(id);
        if (!item) {
            res.status(404).json({
                erro: "Conveniado não encontrado",
            });
            return;
        }
        res.json(item);
    },
    async criar(req, res) {
        const { usuario_id, nome_fantasia, razao_social, categorias, cnpj, endereco, status, } = req.body ?? {};
        const idUsuario = (0, validacoes_1.validarId)(usuario_id);
        if (!idUsuario) {
            res.status(400).json({
                erro: "Informe um usuario_id válido (número inteiro positivo)",
            });
            return;
        }
        const usuarioExiste = await usuarioModel_1.usuarioModel.buscarPorId(idUsuario);
        if (!usuarioExiste) {
            res.status(400).json({
                erro: "Usuário informado não existe",
            });
            return;
        }
        const usuarioJaVinculado = await conveniadoModel_1.conveniadoModel.buscarPorUsuarioId(idUsuario);
        if (usuarioJaVinculado) {
            res.status(409).json({
                erro: "Este usuário já possui um conveniado vinculado",
            });
            return;
        }
        const valNomeFantasia = (0, validacoes_1.validarNomeFantasia)(nome_fantasia);
        if (valNomeFantasia.erro) {
            res.status(valNomeFantasia.status).json({
                erro: valNomeFantasia.erro,
            });
            return;
        }
        const valRazaoSocial = (0, validacoes_1.validarRazaoSocial)(razao_social);
        if (valRazaoSocial.erro) {
            res.status(valRazaoSocial.status).json({
                erro: valRazaoSocial.erro,
            });
            return;
        }
        const valCategorias = (0, validacoes_1.validarCategorias)(categorias);
        if (valCategorias.erro) {
            res.status(valCategorias.status).json({
                erro: valCategorias.erro,
            });
            return;
        }
        const faltando = await conveniadoModel_1.conveniadoModel.categoriasInexistentes(valCategorias.valor);
        if (faltando.length > 0) {
            res.status(400).json({
                erro: `Categoria inexistente ou inativa: ${faltando.join(", ")}`,
            });
            return;
        }
        const valCNPJ = (0, validacoes_1.validarCNPJConveniado)(cnpj);
        if (valCNPJ.erro) {
            res.status(valCNPJ.status).json({
                erro: valCNPJ.erro,
            });
            return;
        }
        const cnpjEmUso = await conveniadoModel_1.conveniadoModel.buscarPorCnpj(valCNPJ.valor);
        if (cnpjEmUso) {
            res.status(409).json({
                erro: "Já existe um conveniado com esse CNPJ",
            });
            return;
        }
        const valEndereco = (0, validacoes_1.validarEndereco)(endereco);
        if (valEndereco.erro) {
            res.status(valEndereco.status).json({
                erro: valEndereco.erro,
            });
            return;
        }
        const valStatus = (0, validacoes_1.validarStatusConveniado)(status);
        if (valStatus.erro) {
            res.status(valStatus.status).json({
                erro: valStatus.erro,
            });
            return;
        }
        const id = await conveniadoModel_1.conveniadoModel.criar({
            usuario_id: idUsuario,
            nome_fantasia: valNomeFantasia.valor,
            razao_social: valRazaoSocial.valor,
            cnpj: valCNPJ.valor,
            endereco: valEndereco.valor,
            status: valStatus.valor ?? "EM_ANALISE",
        }, valCategorias.valor);
        const novo = await conveniadoModel_1.conveniadoModel.buscarPorId(id);
        res.status(201).json(novo);
    },
    async atualizar(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({
                erro: "ID inválido. Informe um número inteiro positivo",
            });
            return;
        }
        const conveniadoAtual = await conveniadoModel_1.conveniadoModel.buscarPorId(id);
        if (!conveniadoAtual) {
            res.status(404).json({
                erro: "Conveniado não encontrado",
            });
            return;
        }
        const dadosAtualizar = {};
        if (req.body?.nome_fantasia !== undefined) {
            const valNomeFantasia = (0, validacoes_1.validarNomeFantasia)(req.body.nome_fantasia);
            if (valNomeFantasia.erro) {
                res.status(valNomeFantasia.status).json({
                    erro: valNomeFantasia.erro,
                });
                return;
            }
            dadosAtualizar.nome_fantasia = valNomeFantasia.valor;
        }
        if (req.body?.razao_social !== undefined) {
            const valRazaoSocial = (0, validacoes_1.validarRazaoSocial)(req.body.razao_social);
            if (valRazaoSocial.erro) {
                res.status(valRazaoSocial.status).json({
                    erro: valRazaoSocial.erro,
                });
                return;
            }
            dadosAtualizar.razao_social = valRazaoSocial.valor;
        }
        let novasCategorias;
        if (req.body?.categorias !== undefined) {
            const valCategorias = (0, validacoes_1.validarCategorias)(req.body.categorias);
            if (valCategorias.erro) {
                res.status(valCategorias.status).json({
                    erro: valCategorias.erro,
                });
                return;
            }
            const faltando = await conveniadoModel_1.conveniadoModel.categoriasInexistentes(valCategorias.valor);
            if (faltando.length > 0) {
                res.status(400).json({
                    erro: `Categoria inexistente ou inativa: ${faltando.join(", ")}`,
                });
                return;
            }
            novasCategorias = valCategorias.valor;
        }
        if (req.body?.cnpj !== undefined) {
            const valCNPJ = (0, validacoes_1.validarCNPJConveniado)(req.body.cnpj);
            if (valCNPJ.erro) {
                res.status(valCNPJ.status).json({
                    erro: valCNPJ.erro,
                });
                return;
            }
            if (valCNPJ.valor !== conveniadoAtual.cnpj) {
                const cnpjEmUso = await conveniadoModel_1.conveniadoModel.buscarPorCnpj(valCNPJ.valor);
                if (cnpjEmUso) {
                    res.status(409).json({
                        erro: "Já existe um conveniado com esse CNPJ",
                    });
                    return;
                }
            }
            dadosAtualizar.cnpj = valCNPJ.valor;
        }
        if (req.body?.endereco !== undefined) {
            const valEndereco = (0, validacoes_1.validarEndereco)(req.body.endereco);
            if (valEndereco.erro) {
                res.status(valEndereco.status).json({
                    erro: valEndereco.erro,
                });
                return;
            }
            dadosAtualizar.endereco = valEndereco.valor;
        }
        if (req.body?.status !== undefined) {
            const valStatus = (0, validacoes_1.validarStatusConveniado)(req.body.status);
            if (valStatus.erro) {
                res.status(valStatus.status).json({
                    erro: valStatus.erro,
                });
                return;
            }
            dadosAtualizar.status = valStatus.valor;
        }
        if (Object.keys(dadosAtualizar).length === 0 &&
            !novasCategorias) {
            res.status(400).json({
                erro: "Nenhum dado válido fornecido para atualização",
            });
            return;
        }
        await conveniadoModel_1.conveniadoModel.atualizar(id, dadosAtualizar, novasCategorias);
        const atualizado = await conveniadoModel_1.conveniadoModel.buscarPorId(id);
        res.json(atualizado);
    },
    async excluir(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({
                erro: "ID inválido. Informe um número inteiro positivo",
            });
            return;
        }
        const conveniado = await conveniadoModel_1.conveniadoModel.buscarPorId(id);
        if (!conveniado) {
            res.status(404).json({
                erro: "Conveniado não encontrado",
            });
            return;
        }
        const vinculos = await conveniadoModel_1.conveniadoModel.contarVinculos(id);
        if (vinculos.beneficios > 0 ||
            vinculos.campanhas > 0) {
            res.status(409).json({
                erro: "Não é possível excluir conveniado com benefícios ou campanhas vinculados. Inative o conveniado alterando seu status para INATIVO",
            });
            return;
        }
        await conveniadoModel_1.conveniadoModel.excluir(id);
        res.status(204).send();
    },
};
