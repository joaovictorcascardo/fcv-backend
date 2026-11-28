"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalogoModel = void 0;
const db_1 = __importDefault(require("../database/db"));
const conveniadoModel_1 = require("./conveniadoModel");
function textoDaBusca(busca) {
    return `%${busca.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
function ofertasAtivas(conexao = db_1.default) {
    return conexao("beneficio_conveniado")
        .join("beneficio", "beneficio.id", "beneficio_conveniado.beneficio_id")
        .join("conveniado", "conveniado.id", "beneficio_conveniado.conveniado_id")
        .where({
        "beneficio_conveniado.status": "ATIVO",
        "beneficio.status": "ATIVO",
        "conveniado.status": "ATIVO",
    });
}
function filtrarCategoria(consulta, categoriaId) {
    if (!categoriaId)
        return;
    consulta.whereExists(function () {
        this.select(1)
            .from("conveniado_categoria")
            .whereRaw("conveniado_categoria.conveniado_id = conveniado.id")
            .where("conveniado_categoria.categoria_id", categoriaId);
    });
}
const CAMPOS_BENEFICIO = [
    "beneficio.id",
    "beneficio.nome",
    "beneficio.descricao",
    "beneficio.tipo_beneficio",
    "beneficio.valor",
    "beneficio.quantidade_maxima_utilizacoes",
    "beneficio.tipo_janela",
    "beneficio.unidade_ciclo",
    "beneficio.intervalo_valor",
    "beneficio.intervalo_unidade",
];
function apenasAtivas(categorias = []) {
    return categorias
        .filter((c) => c.status === "ATIVO")
        .map(({ id, nome }) => ({ id, nome }));
}
async function categoriasDosLocais(conveniadoIds) {
    const mapa = await (0, conveniadoModel_1.categoriasDe)(conveniadoIds);
    const unicas = new Map();
    for (const id of conveniadoIds) {
        for (const categoria of apenasAtivas(mapa.get(id))) {
            unicas.set(categoria.id, categoria);
        }
    }
    return [...unicas.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}
exports.catalogoModel = {
    async resumo() {
        const beneficios = await ofertasAtivas()
            .countDistinct("beneficio.id as total")
            .first();
        const conveniados = await ofertasAtivas()
            .countDistinct("conveniado.id as total")
            .first();
        return {
            beneficios_disponiveis: Number(beneficios?.total ?? 0),
            conveniados: Number(conveniados?.total ?? 0),
        };
    },
    async listarBeneficios({ busca, categoriaId, }) {
        const consulta = ofertasAtivas()
            .select(CAMPOS_BENEFICIO)
            .countDistinct("conveniado.id as total_locais")
            .groupBy(CAMPOS_BENEFICIO)
            .orderBy("beneficio.nome");
        if (busca) {
            consulta.where(function () {
                this.whereRaw("beneficio.nome LIKE ? ESCAPE '\\\\'", [textoDaBusca(busca)]).orWhereRaw("beneficio.descricao LIKE ? ESCAPE '\\\\'", [textoDaBusca(busca)]);
            });
        }
        filtrarCategoria(consulta, categoriaId);
        const beneficios = await consulta;
        const locais = await ofertasAtivas()
            .whereIn("beneficio.id", beneficios.map((b) => b.id))
            .select("beneficio.id as beneficio_id", "conveniado.id as conveniado_id");
        return Promise.all(beneficios.map(async (b) => ({
            ...b,
            total_locais: Number(b.total_locais),
            categorias: await categoriasDosLocais(locais
                .filter((l) => l.beneficio_id === b.id)
                .map((l) => l.conveniado_id)),
        })));
    },
    async buscarBeneficio(id) {
        const beneficio = await (0, db_1.default)("beneficio")
            .where({ id, status: "ATIVO" })
            .first(CAMPOS_BENEFICIO);
        if (!beneficio)
            return null;
        const locais = await ofertasAtivas()
            .where("beneficio.id", id)
            .orderBy("conveniado.nome_fantasia")
            .select("conveniado.id", "conveniado.nome_fantasia", "conveniado.endereco");
        const mapa = await (0, conveniadoModel_1.categoriasDe)(locais.map((l) => l.id));
        return {
            ...beneficio,
            categorias: await categoriasDosLocais(locais.map((l) => l.id)),
            locais: locais.map((l) => ({
                ...l,
                categorias: apenasAtivas(mapa.get(l.id)),
            })),
        };
    },
    async listarLocais({ busca, categoriaId, }) {
        const consulta = ofertasAtivas()
            .select("conveniado.id", "conveniado.nome_fantasia", "conveniado.endereco")
            .countDistinct("beneficio.id as total_beneficios")
            .groupBy("conveniado.id", "conveniado.nome_fantasia", "conveniado.endereco")
            .orderBy("conveniado.nome_fantasia");
        if (busca) {
            consulta.whereRaw("conveniado.nome_fantasia LIKE ? ESCAPE '\\\\'", [textoDaBusca(busca)]);
        }
        filtrarCategoria(consulta, categoriaId);
        const locais = await consulta;
        const mapa = await (0, conveniadoModel_1.categoriasDe)(locais.map((l) => l.id));
        return locais.map((l) => ({
            ...l,
            total_beneficios: Number(l.total_beneficios),
            categorias: apenasAtivas(mapa.get(l.id)),
        }));
    },
    async buscarLocal(id) {
        const local = await (0, db_1.default)("conveniado")
            .where({
            id,
            status: "ATIVO",
        })
            .first("id", "nome_fantasia", "razao_social", "endereco");
        if (!local)
            return null;
        const beneficios = await ofertasAtivas()
            .where("conveniado.id", id)
            .orderBy("beneficio.nome")
            .select(CAMPOS_BENEFICIO);
        const mapa = await (0, conveniadoModel_1.categoriasDe)([id]);
        return {
            ...local,
            categorias: apenasAtivas(mapa.get(id)),
            beneficios,
        };
    },
};
