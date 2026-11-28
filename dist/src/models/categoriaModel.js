"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriaModel = void 0;
const db_1 = __importDefault(require("../database/db"));
const TABELA = "categoria_conveniado";
exports.categoriaModel = {
    listar(status) {
        const consulta = (0, db_1.default)(TABELA)
            .select("*")
            .orderBy("nome");
        if (status) {
            consulta.where({ status });
        }
        return consulta;
    },
    buscarPorId(id) {
        return (0, db_1.default)(TABELA)
            .where({ id })
            .first();
    },
    buscarPorNome(nome) {
        return (0, db_1.default)(TABELA)
            .where({ nome })
            .first();
    },
    async contarConveniados(id) {
        const linha = await (0, db_1.default)("conveniado_categoria")
            .where({ categoria_id: id })
            .count("* as total")
            .first();
        return Number(linha?.total ?? 0);
    },
    async criar(dados) {
        const [id] = await (0, db_1.default)(TABELA).insert(dados);
        return id;
    },
    atualizar(id, dados) {
        return (0, db_1.default)(TABELA)
            .where({ id })
            .update(dados);
    },
    excluir(id) {
        return (0, db_1.default)(TABELA)
            .where({ id })
            .del();
    },
};
