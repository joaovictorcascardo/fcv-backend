"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../database/db"));
const acessoModel_1 = require("../models/acessoModel");
const redefinicaoSenhaModel_1 = require("../models/redefinicaoSenhaModel");
exports.authController = {
    async login(req, res) {
        const { email, senha } = req.body ?? {};
        if (!email || !senha) {
            res.status(400).json({ erro: "Informe e-mail e senha" });
            return;
        }
        const usuario = await acessoModel_1.acessoModel.buscarPorEmail(email);
        const senhaConfere = usuario && (await bcryptjs_1.default.compare(String(senha), usuario.senha));
        if (!senhaConfere) {
            res.status(401).json({ erro: "E-mail ou senha incorretos" });
            return;
        }
        const bloqueio = (0, acessoModel_1.motivoBloqueio)(usuario);
        if (bloqueio) {
            res.status(403).json({ erro: bloqueio });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: usuario.id, perfil_id: usuario.perfil_id, escopo: usuario.escopo }, process.env.JWT_SEGREDO, {
            expiresIn: (process.env.JWT_EXPIRA_EM ||
                "8h"),
        });
        delete usuario.senha;
        const dados = await acessoModel_1.acessoModel.buscarDados(usuario.id, usuario.escopo);
        res.json({ token, usuario: { ...usuario, ...dados } });
    },
    async eu(req, res) {
        const usuario = await acessoModel_1.acessoModel.buscarPorId(res.locals.usuario.id);
        if (!usuario) {
            res.status(404).json({ erro: "Usuário não encontrado" });
            return;
        }
        delete usuario.senha;
        const dados = await acessoModel_1.acessoModel.buscarDados(usuario.id, usuario.escopo);
        res.json({ ...usuario, ...dados });
    },
    async esqueciSenha(req, res) {
        const { email } = req.body ?? {};
        if (!email) {
            res.status(400).json({ erro: "Informe o e-mail" });
            return;
        }
        const usuario = await (0, db_1.default)("usuario").where({ email }).first();
        if (usuario) {
            const codigo = String(crypto_1.default.randomInt(100000, 1000000));
            const gerado = await redefinicaoSenhaModel_1.redefinicaoSenhaModel.gerarCodigo(usuario.id, await bcryptjs_1.default.hash(codigo, 10));
            if (gerado && process.env.NODE_ENV !== "production") {
                console.log(`Código de redefinição para ${email}: ${codigo}`);
            }
        }
        res.json({
            mensagem: "Se o e-mail estiver cadastrado, um código foi enviado. Ele vale 15 minutos",
        });
    },
    async redefinirSenha(req, res) {
        const { email, codigo, nova_senha } = req.body ?? {};
        if (!email || !codigo || !nova_senha) {
            res.status(400).json({ erro: "Informe e-mail, código e nova senha" });
            return;
        }
        const alterada = await redefinicaoSenhaModel_1.redefinicaoSenhaModel.redefinir(email, String(codigo), String(nova_senha));
        if (!alterada) {
            res.status(400).json({ erro: "Código inválido ou expirado" });
            return;
        }
        res.json({ mensagem: "Senha alterada" });
    },
    async registrar(req, res) {
        const { nome, email, senha, matricula, setor, cargo, data_admissao, telefone, } = req.body ?? {};
        if (!nome ||
            !email ||
            !senha ||
            !matricula ||
            !setor ||
            !cargo ||
            !data_admissao) {
            res.status(400).json({
                erro: "Informe nome, e-mail, senha, matrícula, setor, cargo e data de admissão",
            });
            return;
        }
        const perfil = await (0, db_1.default)("perfil_acesso")
            .where({ escopo: "COLABORADOR" })
            .first();
        const senhaCriptografada = await bcryptjs_1.default.hash(String(senha), 10);
        const usuarioId = await db_1.default.transaction(async (trx) => {
            const [id] = await trx("usuario").insert({
                nome,
                email,
                senha: senhaCriptografada,
                perfil_id: perfil.id,
                status: "INATIVO",
            });
            await trx("colaborador").insert({
                usuario_id: id,
                matricula,
                setor,
                cargo,
                data_admissao,
                telefone,
            });
            return id;
        });
        const usuario = await acessoModel_1.acessoModel.buscarPorId(usuarioId);
        delete usuario.senha;
        res.status(201).json({
            mensagem: "Cadastro enviado. Aguarde a FCV liberar o acesso",
            usuario,
        });
    },
};
