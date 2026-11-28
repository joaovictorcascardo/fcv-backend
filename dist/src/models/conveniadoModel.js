"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conveniadoModel = void 0;
exports.categoriasDe = categoriasDe;
const db_1 = __importDefault(require("../database/db"));
const recursos_1 = require("../queries/recursos");
const TABELA = "conveniado";
async function categoriasDe(ids) {
    const mapa = new Map();
    if (ids.length === 0)
        return mapa;
    const linhas = await (0, db_1.default)("conveniado_categoria")
        .join("categoria_conveniado", "categoria_conveniado.id", "conveniado_categoria.categoria_id")
        .whereIn("conveniado_categoria.conveniado_id", ids)
        .orderBy("categoria_conveniado.nome")
        .select("conveniado_categoria.conveniado_id", "categoria_conveniado.id", "categoria_conveniado.nome", "categoria_conveniado.status");
    for (const { conveniado_id, ...categoria } of linhas) {
        mapa.set(conveniado_id, [
            ...(mapa.get(conveniado_id) ?? []),
            categoria,
        ]);
    }
    return mapa;
}
async function comCategorias(lista) {
    const mapa = await categoriasDe(lista.map((c) => c.id));
    return lista.map((c) => ({
        ...c,
        categorias: mapa.get(c.id) ?? [],
    }));
}
exports.conveniadoModel = {
    async listar(consulta = {}) {
        const resultado = await (0, recursos_1.listarRecurso)(db_1.default, "conveniados", consulta);
        if (Array.isArray(resultado)) {
            return comCategorias(resultado);
        }
        return {
            ...resultado,
            dados: await comCategorias(resultado.dados),
        };
    },
    async buscarPorId(id) {
        const conveniado = await (0, db_1.default)(TABELA)
            .where({ id })
            .first();
        if (!conveniado)
            return conveniado;
        const [completo] = await comCategorias([conveniado]);
        return completo;
    },
    async categoriasInexistentes(ids) {
        const ativas = await (0, db_1.default)("categoria_conveniado")
            .whereIn("id", ids)
            .where({ status: "ATIVO" })
            .pluck("id");
        return ids.filter((id) => !ativas.includes(id));
    },
    buscarPorCnpj(cnpj) {
        return (0, db_1.default)(TABELA).where({ cnpj }).first();
    },
    buscarPorUsuarioId(usuarioId) {
        return (0, db_1.default)(TABELA)
            .where({ usuario_id: usuarioId })
            .first();
    },
    async contarVinculos(conveniadoId) {
        const ben = await (0, db_1.default)("beneficio_conveniado")
            .where({ conveniado_id: conveniadoId })
            .count("id as total")
            .first();
        const camp = await (0, db_1.default)("beneficio_campanha_conveniado")
            .where({ conveniado_id: conveniadoId })
            .count("id as total")
            .first();
        return {
            beneficios: Number(ben?.total ?? 0),
            campanhas: Number(camp?.total ?? 0),
        };
    },
    criar(dados, categorias) {
        return db_1.default.transaction(async (trx) => {
            const [id] = await trx(TABELA).insert(dados);
            await trx("conveniado_categoria").insert(categorias.map((categoria_id) => ({
                conveniado_id: id,
                categoria_id,
            })));
            return id;
        });
    },
    atualizar(id, dados, categorias) {
        return db_1.default.transaction(async (trx) => {
            if (Object.keys(dados).length > 0) {
                await trx(TABELA).where({ id }).update(dados);
            }
            if (categorias) {
                await trx("conveniado_categoria")
                    .where({ conveniado_id: id })
                    .del();
                await trx("conveniado_categoria").insert(categorias.map((categoria_id) => ({
                    conveniado_id: id,
                    categoria_id,
                })));
            }
        });
    },
    excluir(id) {
        return (0, db_1.default)(TABELA).where({ id }).del();
    },
};
