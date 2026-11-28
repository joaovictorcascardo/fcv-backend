"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.perfilAcessoController = void 0;
const perfilAcessoModel_1 = require("../models/perfilAcessoModel");
const validacoes_1 = require("../utils/validacoes");
const ESCOPOS_VALIDOS = ["FCV", "COLABORADOR", "CONVENIADO"];
exports.perfilAcessoController = {
    async listar(req, res) {
        const lista = await perfilAcessoModel_1.perfilAcessoModel.listar(req.query);
        res.json(lista);
    },
    async buscar(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
            return;
        }
        const item = await perfilAcessoModel_1.perfilAcessoModel.buscarPorId(id);
        if (!item) {
            res.status(404).json({ erro: "Perfil de acesso não encontrado" });
            return;
        }
        res.json(item);
    },
    async criar(req, res) {
        const { nome, escopo, descricao, permissoes, status } = req.body ?? {};
        if (!nome || typeof nome !== "string" || !nome.trim()) {
            res.status(400).json({ erro: "Informe o nome do perfil" });
            return;
        }
        if (nome.trim().length > 50) {
            res.status(400).json({ erro: "O nome do perfil não pode ter mais de 50 caracteres" });
            return;
        }
        if (!escopo || !ESCOPOS_VALIDOS.includes(escopo)) {
            res.status(400).json({ erro: "Escopo inválido. Opções permitidas: FCV, COLABORADOR, CONVENIADO" });
            return;
        }
        const valStatus = (0, validacoes_1.validarStatusPerfil)(status);
        if (valStatus.erro) {
            res.status(valStatus.status).json({ erro: valStatus.erro });
            return;
        }
        const valDescricao = (0, validacoes_1.validarDescricaoPerfil)(descricao);
        if (valDescricao.erro) {
            res.status(valDescricao.status).json({ erro: valDescricao.erro });
            return;
        }
        const valPermissoes = (0, validacoes_1.validarPermissoesPerfil)(permissoes);
        if (valPermissoes.erro) {
            res.status(valPermissoes.status).json({ erro: valPermissoes.erro });
            return;
        }
        const nomeFormatado = nome.trim();
        const jaExiste = await perfilAcessoModel_1.perfilAcessoModel.buscarPorNome(nomeFormatado);
        if (jaExiste) {
            res.status(409).json({ erro: "Já existe um perfil com esse nome" });
            return;
        }
        // Whitelist estrita de campos permitidos
        const dadosCriacao = {
            nome: nomeFormatado,
            escopo,
            descricao: valDescricao.valor ?? null,
            permissoes: valPermissoes.valor ?? null,
            status: valStatus.valor ?? "ATIVO",
        };
        const id = await perfilAcessoModel_1.perfilAcessoModel.criar(dadosCriacao);
        const novo = await perfilAcessoModel_1.perfilAcessoModel.buscarPorId(id);
        res.status(201).json(novo);
    },
    async atualizar(req, res) {
        // Valida ID
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
            return;
        }
        // Checa se o perfil existe
        const perfilAtual = await perfilAcessoModel_1.perfilAcessoModel.buscarPorId(id);
        if (!perfilAtual) {
            res.status(404).json({ erro: "Perfil de acesso não encontrado" });
            return;
        }
        const { nome, escopo, status, descricao, permissoes } = req.body ?? {};
        const dadosAtualizar = {};
        // Se enviou nome, valida e checa conflito com outros perfis
        if (nome !== undefined) {
            const valNome = (0, validacoes_1.validarNomePerfil)(nome);
            if (valNome.erro) {
                res.status(valNome.status).json({ erro: valNome.erro });
                return;
            }
            if (valNome.valor !== perfilAtual.nome) {
                const jaExiste = await perfilAcessoModel_1.perfilAcessoModel.buscarPorNome(valNome.valor);
                if (jaExiste && jaExiste.id !== id) {
                    res.status(409).json({ erro: "Já existe outro perfil com esse nome" });
                    return;
                }
            }
            dadosAtualizar.nome = valNome.valor;
        }
        // Se enviou escopo, valida
        if (escopo !== undefined) {
            const valEscopo = (0, validacoes_1.validarEscopo)(escopo);
            if (valEscopo.erro) {
                res.status(valEscopo.status).json({ erro: valEscopo.erro });
                return;
            }
            dadosAtualizar.escopo = valEscopo.valor;
        }
        // Se enviou status, valida
        if (status !== undefined) {
            const valStatus = (0, validacoes_1.validarStatusPerfil)(status);
            if (valStatus.erro) {
                res.status(valStatus.status).json({ erro: valStatus.erro });
                return;
            }
            dadosAtualizar.status = valStatus.valor;
        }
        if (descricao !== undefined) {
            const valDescricao = (0, validacoes_1.validarDescricaoPerfil)(descricao);
            if (valDescricao.erro) {
                res.status(valDescricao.status).json({ erro: valDescricao.erro });
                return;
            }
            dadosAtualizar.descricao = valDescricao.valor;
        }
        if (permissoes !== undefined) {
            const valPermissoes = (0, validacoes_1.validarPermissoesPerfil)(permissoes);
            if (valPermissoes.erro) {
                res.status(valPermissoes.status).json({ erro: valPermissoes.erro });
                return;
            }
            dadosAtualizar.permissoes = valPermissoes.valor;
        }
        await perfilAcessoModel_1.perfilAcessoModel.atualizar(id, dadosAtualizar);
        const atualizado = await perfilAcessoModel_1.perfilAcessoModel.buscarPorId(id);
        res.json(atualizado);
    },
    async excluir(req, res) {
        const id = (0, validacoes_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
            return;
        }
        const perfil = await perfilAcessoModel_1.perfilAcessoModel.buscarPorId(id);
        if (!perfil) {
            res.status(404).json({ erro: "Perfil de acesso não encontrado" });
            return;
        }
        const totalUsuarios = await perfilAcessoModel_1.perfilAcessoModel.contarUsuariosVinculados(id);
        if (totalUsuarios > 0) {
            res.status(409).json({
                erro: "Não é possível excluir: existem usuários vinculados a este perfil. Inative o perfil alterando seu status para INATIVO.",
            });
            return;
        }
        await perfilAcessoModel_1.perfilAcessoModel.excluir(id);
        res.status(204).send();
    },
};
