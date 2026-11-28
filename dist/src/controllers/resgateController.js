"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resgateController = void 0;
const resgateModel_1 = require("../models/resgateModel");
const codigo_1 = require("../utils/codigo");
const validacoesCatalogo_1 = require("../utils/validacoesCatalogo");
function responderErro(res, erro) {
    if (!(erro instanceof resgateModel_1.ErroResgate))
        throw erro;
    res.status(erro.status).json({ erro: erro.message, ...erro.extra });
}
function lerCanal(valor) {
    if (valor === undefined || valor === null || valor === "")
        return "APP_CONVENIADO";
    return validacoesCatalogo_1.CANAIS_VALIDACAO_VALIDOS.includes(String(valor)) ? String(valor) : null;
}
function lerMotivo(valor) {
    if (valor === undefined || valor === null || valor === "")
        return undefined;
    if (typeof valor !== "string" || valor.trim().length > 500)
        return null;
    return valor.trim() || undefined;
}
async function decidir(req, res, aprovar) {
    const codigo = (0, codigo_1.normalizarCodigo)(req.params.codigo);
    if (!codigo) {
        res.status(400).json({ erro: "Informe o código do QR ou o código de 6 letras" });
        return;
    }
    const canal = lerCanal(req.body?.canal_validacao);
    if (!canal) {
        res.status(400).json({ erro: "canal_validacao inválido. Use APP_CONVENIADO ou TERMINAL_IOT" });
        return;
    }
    const motivo = lerMotivo(req.body?.motivo);
    if (motivo === null) {
        res.status(400).json({ erro: "O motivo deve ser um texto de até 500 caracteres" });
        return;
    }
    try {
        res.json(await resgateModel_1.resgateModel.decidir(res.locals.usuario.id, codigo, aprovar, canal, motivo));
    }
    catch (erro) {
        responderErro(res, erro);
    }
}
exports.resgateController = {
    async solicitar(req, res) {
        const beneficioId = (0, validacoesCatalogo_1.validarId)(req.body?.beneficio_id);
        if (!beneficioId) {
            res.status(400).json({ erro: "Informe o beneficio_id (número inteiro positivo)" });
            return;
        }
        try {
            res.status(201).json(await resgateModel_1.resgateModel.solicitar(res.locals.usuario.id, beneficioId));
        }
        catch (erro) {
            responderErro(res, erro);
        }
    },
    async buscar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        const resgate = await resgateModel_1.resgateModel.buscarDoColaborador(res.locals.usuario.id, id);
        if (!resgate) {
            res.status(404).json({ erro: "Resgate não encontrado" });
            return;
        }
        res.json(resgate);
    },
    async cancelar(req, res) {
        const id = (0, validacoesCatalogo_1.validarId)(req.params.id);
        if (!id) {
            res.status(400).json({ erro: validacoesCatalogo_1.MENSAGEM_ID_INVALIDO });
            return;
        }
        try {
            res.json(await resgateModel_1.resgateModel.cancelar(res.locals.usuario.id, id));
        }
        catch (erro) {
            responderErro(res, erro);
        }
    },
    async consultar(req, res) {
        const codigo = (0, codigo_1.normalizarCodigo)(req.params.codigo);
        if (!codigo) {
            res.status(400).json({ erro: "Informe o código do QR ou o código de 6 letras" });
            return;
        }
        try {
            const { resgate } = await resgateModel_1.resgateModel.conferirParaValidar(res.locals.usuario.id, codigo);
            res.json(resgate);
        }
        catch (erro) {
            responderErro(res, erro);
        }
    },
    aprovar(req, res) {
        return decidir(req, res, true);
    },
    reprovar(req, res) {
        return decidir(req, res, false);
    },
};
