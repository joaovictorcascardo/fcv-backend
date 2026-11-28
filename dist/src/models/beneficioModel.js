"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.beneficioModel = void 0;
const db_1 = __importDefault(require("../database/db"));
const recursos_1 = require("../queries/recursos");
const historicoModel_1 = require("./historicoModel");
const TABELA = "beneficio";
exports.beneficioModel = {
    listar(consulta = {}) {
        return (0, recursos_1.listarRecurso)(db_1.default, "beneficios", consulta);
    },
    buscarPorId(id) {
        return (0, db_1.default)(TABELA).where({ id }).first();
    },
    async criar(dados) {
        const [id] = await (0, db_1.default)(TABELA).insert(dados);
        return id;
    },
    atualizar(id, dados) {
        return (0, db_1.default)(TABELA).where({ id }).update(dados);
    },
    contarUtilizacoes(id) {
        return (0, historicoModel_1.contarUtilizacoes)("beneficio", id);
    },
    excluir(id) {
        return (0, db_1.default)(TABELA).where({ id }).del();
    },
};
