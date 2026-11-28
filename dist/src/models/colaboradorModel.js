"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.colaboradorModel = void 0;
const db_1 = __importDefault(require("../database/db"));
const recursos_1 = require("../queries/recursos");
const TABELA = "colaborador";
exports.colaboradorModel = {
    listar(consulta = {}) {
        return (0, recursos_1.listarRecurso)(db_1.default, "colaboradores", consulta);
    },
    buscarPorId(id) {
        return (0, db_1.default)(TABELA).where({ id }).first();
    },
    buscarPorMatricula(matricula) {
        return (0, db_1.default)(TABELA).where({ matricula }).first();
    },
    buscarPorUsuarioId(usuarioId) {
        return (0, db_1.default)(TABELA).where({ usuario_id: usuarioId }).first();
    },
    async contarUtilizacoes(colaboradorId) {
        const res = await (0, db_1.default)("utilizacao")
            .where({ colaborador_id: colaboradorId })
            .count("id as total")
            .first();
        return Number(res?.total ?? 0);
    },
    async criar(dados) {
        const [id] = await (0, db_1.default)(TABELA).insert(dados);
        return id;
    },
    atualizar(id, dados) {
        return (0, db_1.default)(TABELA).where({ id }).update(dados);
    },
    excluir(id) {
        return (0, db_1.default)(TABELA).where({ id }).del();
    },
};
