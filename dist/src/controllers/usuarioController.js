"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usuarioController = void 0;
const usuarioModel_1 = require("../models/usuarioModel");
const validacoes_1 = require("../utils/validacoes");
const perfilAcessoModel_1 = require("../models/perfilAcessoModel");
exports.usuarioController = {
    async listar(req, res) {
        const lista = await usuarioModel_1.usuarioModel.listar(req.query);
        res.json(lista);
    },
    async buscar(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
            return;
        }
        const item = await usuarioModel_1.usuarioModel.buscarPorId(id);
        if (!item) {
            res.status(404).json({ erro: "Usuário não encontrado" });
            return;
        }
        res.json(item);
    },
    async criar(req, res) {
        const { nome, email, senha, perfil_id, status } = req.body ?? {};
        const valNome = (0, validacoes_1.validarNomeUsuario)(nome);
        if (valNome.erro) {
            res.status(valNome.status).json({ erro: valNome.erro });
            return;
        }
        const valEmail = (0, validacoes_1.validarEmailUsuario)(email);
        if (valEmail.erro) {
            res.status(valEmail.status).json({ erro: valEmail.erro });
            return;
        }
        const valSenha = (0, validacoes_1.validarSenha)(senha);
        if (valSenha.erro) {
            res.status(valSenha.status).json({ erro: valSenha.erro });
            return;
        }
        const idPerfil = (0, validacoes_1.validarId)(perfil_id);
        if (!idPerfil) {
            res.status(400).json({ erro: "Informe um perfil_id válido (número inteiro positivo)" });
            return;
        }
        const perfilExiste = await perfilAcessoModel_1.perfilAcessoModel.buscarPorId(idPerfil);
        if (!perfilExiste) {
            res.status(400).json({ erro: "Perfil de acesso informado não existe" });
            return;
        }
        const valStatus = (0, validacoes_1.validarStatusUsuario)(status);
        if (valStatus.erro) {
            res.status(valStatus.status).json({ erro: valStatus.erro });
            return;
        }
        const emailEmUso = await usuarioModel_1.usuarioModel.buscarPorEmail(valEmail.valor);
        if (emailEmUso) {
            res.status(409).json({ erro: "Já existe um usuário com esse e-mail" });
            return;
        }
        const id = await usuarioModel_1.usuarioModel.criar({
            nome: valNome.valor,
            email: valEmail.valor,
            senha: valSenha.valor,
            perfil_id: idPerfil,
            status: valStatus.valor ?? "ATIVO",
        });
        const novo = await usuarioModel_1.usuarioModel.buscarPorId(id);
        res.status(201).json(novo);
    },
    async atualizar(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
            return;
        }
        const usuarioAtual = await usuarioModel_1.usuarioModel.buscarPorId(id);
        if (!usuarioAtual) {
            res.status(404).json({ erro: "Usuário não encontrado" });
            return;
        }
        const dadosAtualizar = {};
        if (req.body?.nome !== undefined) {
            const valNome = (0, validacoes_1.validarNomeUsuario)(req.body.nome);
            if (valNome.erro) {
                res.status(valNome.status).json({ erro: valNome.erro });
                return;
            }
            dadosAtualizar.nome = valNome.valor;
        }
        if (req.body?.email !== undefined) {
            const valEmail = (0, validacoes_1.validarEmailUsuario)(req.body.email);
            if (valEmail.erro) {
                res.status(valEmail.status).json({ erro: valEmail.erro });
                return;
            }
            if (valEmail.valor !== usuarioAtual.email) {
                const emailEmUso = await usuarioModel_1.usuarioModel.buscarPorEmail(valEmail.valor);
                if (emailEmUso) {
                    res.status(409).json({ erro: "Já existe um usuário com esse e-mail" });
                    return;
                }
            }
            dadosAtualizar.email = valEmail.valor;
        }
        if (req.body?.senha !== undefined) {
            const valSenha = (0, validacoes_1.validarSenha)(req.body.senha);
            if (valSenha.erro) {
                res.status(valSenha.status).json({ erro: valSenha.erro });
                return;
            }
            dadosAtualizar.senha = valSenha.valor;
        }
        if (req.body?.perfil_id !== undefined) {
            const idPerfil = (0, validacoes_1.validarId)(req.body.perfil_id);
            if (!idPerfil) {
                res.status(400).json({ erro: "Informe um perfil_id válido (número inteiro positivo)" });
                return;
            }
            const perfilExiste = await perfilAcessoModel_1.perfilAcessoModel.buscarPorId(idPerfil);
            if (!perfilExiste) {
                res.status(400).json({ erro: "Perfil de acesso informado não existe" });
                return;
            }
            dadosAtualizar.perfil_id = idPerfil;
        }
        if (req.body?.status !== undefined) {
            const valStatus = (0, validacoes_1.validarStatusUsuario)(req.body.status);
            if (valStatus.erro) {
                res.status(valStatus.status).json({ erro: valStatus.erro });
                return;
            }
            dadosAtualizar.status = valStatus.valor;
        }
        if (Object.keys(dadosAtualizar).length === 0) {
            res.status(400).json({ erro: "Nenhum dado válido fornecido para atualização" });
            return;
        }
        await usuarioModel_1.usuarioModel.atualizar(id, dadosAtualizar);
        const atualizado = await usuarioModel_1.usuarioModel.buscarPorId(id);
        res.json(atualizado);
    },
    async excluir(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
            return;
        }
        const usuario = await usuarioModel_1.usuarioModel.buscarPorId(id);
        if (!usuario) {
            res.status(404).json({ erro: "Usuário não encontrado" });
            return;
        }
        const vinculos = await usuarioModel_1.usuarioModel.contarVinculos(id);
        if (vinculos.colaboradores > 0 || vinculos.conveniados > 0) {
            res.status(409).json({
                erro: "Não é possível excluir usuário com colaborador ou conveniado vinculado. Inative o usuário alterando seu status para INATIVO",
            });
            return;
        }
        await usuarioModel_1.usuarioModel.excluir(id);
        res.status(204).send();
    },
};
