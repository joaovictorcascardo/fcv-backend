"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usuarioModel = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../database/db"));
const recursos_1 = require("../queries/recursos");
const TABELA = "usuario";
const COLUNAS = ["id", "nome", "email", "perfil_id", "status", "data_criacao"];
exports.usuarioModel = {
    listar(consulta = {}) {
        return (0, recursos_1.listarRecurso)(db_1.default, "usuarios", consulta);
    },
    buscarPorId(id) {
        return (0, db_1.default)(TABELA).select(COLUNAS).where({ id }).first();
    },
    buscarPorEmail(email) {
        return (0, db_1.default)(TABELA).select(COLUNAS).where({ email }).first();
    },
    async contarVinculos(usuarioId) {
        const colab = await (0, db_1.default)("colaborador")
            .where({ usuario_id: usuarioId })
            .count("id as total")
            .first();
        const conv = await (0, db_1.default)("conveniado")
            .where({ usuario_id: usuarioId })
            .count("id as total")
            .first();
        return {
            colaboradores: Number(colab?.total ?? 0),
            conveniados: Number(conv?.total ?? 0),
        };
    },
    async criar(dados) {
        if (dados.senha) {
            dados.senha = await bcryptjs_1.default.hash(String(dados.senha), 10);
        }
        const [id] = await (0, db_1.default)(TABELA).insert(dados);
        return id;
    },
    async atualizar(id, dados) {
        if (dados.senha) {
            dados.senha = await bcryptjs_1.default.hash(String(dados.senha), 10);
        }
        return (0, db_1.default)(TABELA).where({ id }).update(dados);
    },
    excluir(id) {
        return (0, db_1.default)(TABELA).where({ id }).del();
    },
};
