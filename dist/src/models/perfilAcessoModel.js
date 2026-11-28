"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.perfilAcessoModel = void 0;
const db_1 = __importDefault(require("../database/db"));
const recursos_1 = require("../queries/recursos");
const TABELA = "perfil_acesso";
function prepararPermissoes(dados) {
    if (dados.permissoes !== undefined && dados.permissoes !== null) {
        dados.permissoes = JSON.stringify(dados.permissoes);
    }
    return dados;
}
exports.perfilAcessoModel = {
    listar(consulta = {}) {
        return (0, recursos_1.listarRecurso)(db_1.default, "perfis", consulta);
    },
    buscarPorId(id) {
        return (0, db_1.default)(TABELA).where({ id }).first();
    },
    buscarPorNome(nome) {
        return (0, db_1.default)(TABELA).where({ nome }).first();
    },
    async contarUsuariosVinculados(perfilId) {
        const resultado = await (0, db_1.default)("usuario")
            .where({ perfil_id: perfilId })
            .count("id as total")
            .first();
        return Number(resultado?.total ?? 0);
    },
    async criar(dados) {
        const [id] = await (0, db_1.default)(TABELA).insert(prepararPermissoes(dados));
        return id;
    },
    atualizar(id, dados) {
        return (0, db_1.default)(TABELA).where({ id }).update(prepararPermissoes(dados));
    },
    excluir(id) {
        return (0, db_1.default)(TABELA).where({ id }).del();
    },
};
