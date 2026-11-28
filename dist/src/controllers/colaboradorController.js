"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.colaboradorController = void 0;
const colaboradorModel_1 = require("../models/colaboradorModel");
const usuarioModel_1 = require("../models/usuarioModel");
const validacoes_1 = require("../utils/validacoes");
exports.colaboradorController = {
    async listar(req, res) {
        const lista = await colaboradorModel_1.colaboradorModel.listar(req.query);
        res.json(lista);
    },
    async buscar(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
            return;
        }
        const item = await colaboradorModel_1.colaboradorModel.buscarPorId(id);
        if (!item) {
            res.status(404).json({ erro: "Colaborador não encontrado" });
            return;
        }
        res.json(item);
    },
    async criar(req, res) {
        const { usuario_id, matricula, setor, cargo, data_admissao, status, telefone } = req.body ?? {};
        const idUsuario = (0, validacoes_1.validarId)(usuario_id);
        if (!idUsuario) {
            res.status(400).json({ erro: "Informe um usuario_id válido (número inteiro positivo)" });
            return;
        }
        const usuarioExiste = await usuarioModel_1.usuarioModel.buscarPorId(idUsuario);
        if (!usuarioExiste) {
            res.status(400).json({ erro: "Usuário informado não existe" });
            return;
        }
        const usuarioJaVinculado = await colaboradorModel_1.colaboradorModel.buscarPorUsuarioId(idUsuario);
        if (usuarioJaVinculado) {
            res.status(409).json({ erro: "Este usuário já possui um colaborador vinculado" });
            return;
        }
        const valMatricula = (0, validacoes_1.validarMatricula)(matricula);
        if (valMatricula.erro) {
            res.status(valMatricula.status).json({ erro: valMatricula.erro });
            return;
        }
        const matriculaEmUso = await colaboradorModel_1.colaboradorModel.buscarPorMatricula(valMatricula.valor);
        if (matriculaEmUso) {
            res.status(409).json({ erro: "Já existe um colaborador com essa matrícula" });
            return;
        }
        const valSetor = (0, validacoes_1.validarSetor)(setor);
        if (valSetor.erro) {
            res.status(valSetor.status).json({ erro: valSetor.erro });
            return;
        }
        const valCargo = (0, validacoes_1.validarCargo)(cargo);
        if (valCargo.erro) {
            res.status(valCargo.status).json({ erro: valCargo.erro });
            return;
        }
        const valData = (0, validacoes_1.validarDataAdmissao)(data_admissao);
        if (valData.erro) {
            res.status(valData.status).json({ erro: valData.erro });
            return;
        }
        const valStatus = (0, validacoes_1.validarStatusColaborador)(status);
        if (valStatus.erro) {
            res.status(valStatus.status).json({ erro: valStatus.erro });
            return;
        }
        const valTelefone = (0, validacoes_1.validarTelefone)(telefone);
        if (valTelefone.erro) {
            res.status(valTelefone.status).json({ erro: valTelefone.erro });
            return;
        }
        const id = await colaboradorModel_1.colaboradorModel.criar({
            usuario_id: idUsuario,
            matricula: valMatricula.valor,
            setor: valSetor.valor,
            cargo: valCargo.valor,
            data_admissao: valData.valor,
            status: valStatus.valor ?? "ATIVO",
            telefone: valTelefone.valor ?? null,
        });
        const novo = await colaboradorModel_1.colaboradorModel.buscarPorId(id);
        res.status(201).json(novo);
    },
    async atualizar(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
            return;
        }
        const colaboradorAtual = await colaboradorModel_1.colaboradorModel.buscarPorId(id);
        if (!colaboradorAtual) {
            res.status(404).json({ erro: "Colaborador não encontrado" });
            return;
        }
        const dadosAtualizar = {};
        if (req.body?.matricula !== undefined) {
            const valMatricula = (0, validacoes_1.validarMatricula)(req.body.matricula);
            if (valMatricula.erro) {
                res.status(valMatricula.status).json({ erro: valMatricula.erro });
                return;
            }
            if (valMatricula.valor !== colaboradorAtual.matricula) {
                const matriculaEmUso = await colaboradorModel_1.colaboradorModel.buscarPorMatricula(valMatricula.valor);
                if (matriculaEmUso) {
                    res.status(409).json({ erro: "Já existe um colaborador com essa matrícula" });
                    return;
                }
            }
            dadosAtualizar.matricula = valMatricula.valor;
        }
        if (req.body?.setor !== undefined) {
            const valSetor = (0, validacoes_1.validarSetor)(req.body.setor);
            if (valSetor.erro) {
                res.status(valSetor.status).json({ erro: valSetor.erro });
                return;
            }
            dadosAtualizar.setor = valSetor.valor;
        }
        if (req.body?.cargo !== undefined) {
            const valCargo = (0, validacoes_1.validarCargo)(req.body.cargo);
            if (valCargo.erro) {
                res.status(valCargo.status).json({ erro: valCargo.erro });
                return;
            }
            dadosAtualizar.cargo = valCargo.valor;
        }
        if (req.body?.data_admissao !== undefined) {
            const valData = (0, validacoes_1.validarDataAdmissao)(req.body.data_admissao);
            if (valData.erro) {
                res.status(valData.status).json({ erro: valData.erro });
                return;
            }
            dadosAtualizar.data_admissao = valData.valor;
        }
        if (req.body?.status !== undefined) {
            const valStatus = (0, validacoes_1.validarStatusColaborador)(req.body.status);
            if (valStatus.erro) {
                res.status(valStatus.status).json({ erro: valStatus.erro });
                return;
            }
            dadosAtualizar.status = valStatus.valor;
        }
        if (req.body?.telefone !== undefined) {
            const valTelefone = (0, validacoes_1.validarTelefone)(req.body.telefone);
            if (valTelefone.erro) {
                res.status(valTelefone.status).json({ erro: valTelefone.erro });
                return;
            }
            dadosAtualizar.telefone = valTelefone.valor;
        }
        if (Object.keys(dadosAtualizar).length === 0) {
            res.status(400).json({ erro: "Nenhum dado válido fornecido para atualização" });
            return;
        }
        await colaboradorModel_1.colaboradorModel.atualizar(id, dadosAtualizar);
        const atualizado = await colaboradorModel_1.colaboradorModel.buscarPorId(id);
        res.json(atualizado);
    },
    async excluir(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
            return;
        }
        const colaborador = await colaboradorModel_1.colaboradorModel.buscarPorId(id);
        if (!colaborador) {
            res.status(404).json({ erro: "Colaborador não encontrado" });
            return;
        }
        const totalUtilizacoes = await colaboradorModel_1.colaboradorModel.contarUtilizacoes(id);
        if (totalUtilizacoes > 0) {
            res.status(409).json({
                erro: "Não é possível excluir colaborador com histórico de utilizações vinculado. Inative o colaborador alterando seu status para INATIVO",
            });
            return;
        }
        await colaboradorModel_1.colaboradorModel.excluir(id);
        res.status(204).send();
    },
};
