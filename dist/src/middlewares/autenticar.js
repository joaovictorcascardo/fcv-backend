"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autenticar = autenticar;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const acessoModel_1 = require("../models/acessoModel");
async function autenticar(req, res, next) {
    const cabecalho = req.headers.authorization;
    if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
        res.status(401).json({ erro: "Token não enviado" });
        return;
    }
    const token = cabecalho.slice(7);
    let dados;
    try {
        dados = jsonwebtoken_1.default.verify(token, process.env.JWT_SEGREDO);
    }
    catch {
        res.status(401).json({ erro: "Token inválido ou expirado" });
        return;
    }
    const usuario = await acessoModel_1.acessoModel.buscarPorId(Number(dados.id));
    if (!usuario) {
        res.status(401).json({ erro: "Token inválido ou expirado" });
        return;
    }
    const bloqueio = (0, acessoModel_1.motivoBloqueio)(usuario);
    if (bloqueio) {
        res.status(403).json({ erro: bloqueio });
        return;
    }
    res.locals.usuario = {
        id: usuario.id,
        perfil_id: usuario.perfil_id,
        perfil: usuario.perfil,
        escopo: usuario.escopo,
    };
    next();
}
