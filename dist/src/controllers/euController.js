"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.euController = void 0;
const db_1 = __importDefault(require("../database/db"));
const acessoModel_1 = require("../models/acessoModel");
const utilizacaoModel_1 = require("../models/utilizacaoModel");
const aguardando_1 = require("../queries/aguardando");
const tempo_1 = require("../utils/tempo");
function statusPelaData(registro, momento) {
    if (registro.status === "PENDENTE" && registro.data_expiracao <= momento) {
        return { ...registro, status: "EXPIRADA" };
    }
    return registro;
}
exports.euController = {
    async utilizacoes(req, res) {
        const { colaborador, conveniado } = await acessoModel_1.acessoModel.buscarDados(res.locals.usuario.id, res.locals.usuario.escopo);
        const dono = res.locals.usuario.escopo === "COLABORADOR"
            ? colaborador && { colaborador_id: colaborador.id }
            : conveniado && { conveniado_id: conveniado.id };
        if (!dono) {
            res.status(404).json({ erro: "Cadastro de colaborador ou conveniado não encontrado" });
            return;
        }
        const momento = (0, tempo_1.agora)();
        const consulta = { ...req.query };
        if (dono.colaborador_id && consulta.de === undefined && consulta.ate === undefined) {
            consulta.de = (0, tempo_1.mesesAtras)(momento, 6).slice(0, 10);
        }
        const lista = await utilizacaoModel_1.utilizacaoModel.listarDoDono(dono, consulta);
        if (Array.isArray(lista)) {
            res.json(lista.map((item) => statusPelaData(item, momento)));
            return;
        }
        res.json({ ...lista, dados: lista.dados.map((item) => statusPelaData(item, momento)) });
    },
    async aguardando(_req, res) {
        const { colaborador } = await acessoModel_1.acessoModel.buscarDados(res.locals.usuario.id, "COLABORADOR");
        if (!colaborador) {
            res.status(404).json({ erro: "Cadastro de colaborador não encontrado" });
            return;
        }
        const momento = (0, tempo_1.agora)();
        const lista = await (0, aguardando_1.listarAguardando)(db_1.default, colaborador.id, momento);
        res.json(lista.map((item) => ({ ...item, segundos_restantes: Math.max(0, (0, tempo_1.segundosEntre)(momento, item.data_expiracao)) })));
    },
};
