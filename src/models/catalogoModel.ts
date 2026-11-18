import type { Knex } from "knex";
import db from "../database/db";
import { categoriasDe } from "./conveniadoModel";

type Filtro = {
  busca?: string;
  categoriaId?: number;
};

function textoDaBusca(busca: string) {
  return `%${busca.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function ofertasAtivas(conexao: Knex = db) {
  return conexao("beneficio_conveniado")
    .join(
      "beneficio",
      "beneficio.id",
      "beneficio_conveniado.beneficio_id"
    )
    .join(
      "conveniado",
      "conveniado.id",
      "beneficio_conveniado.conveniado_id"
    )
    .where({
      "beneficio_conveniado.status": "ATIVO",
      "beneficio.status": "ATIVO",
      "conveniado.status": "ATIVO",
    });
}

function filtrarCategoria(
  consulta: Knex.QueryBuilder,
  categoriaId?: number
) {
  if (!categoriaId) return;

  consulta.whereExists(function () {
    this.select(1)
      .from("conveniado_categoria")
      .whereRaw(
        "conveniado_categoria.conveniado_id = conveniado.id"
      )
      .where(
        "conveniado_categoria.categoria_id",
        categoriaId
      );
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

function apenasAtivas(
  categorias: {
    id: number;
    nome: string;
    status: string;
  }[] = []
) {
  return categorias
    .filter((c) => c.status === "ATIVO")
    .map(({ id, nome }) => ({ id, nome }));
}

async function categoriasDosLocais(
  conveniadoIds: number[]
) {
  const mapa = await categoriasDe(conveniadoIds);

  const unicas = new Map<
    number,
    { id: number; nome: string }
  >();

  for (const id of conveniadoIds) {
    for (const categoria of apenasAtivas(mapa.get(id))) {
      unicas.set(categoria.id, categoria);
    }
  }

  return [...unicas.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome)
  );
}

export const catalogoModel = {
  async resumo() {
    const beneficios = await ofertasAtivas()
      .countDistinct<{ total: number }>(
        "beneficio.id as total"
      )
      .first();

    const conveniados = await ofertasAtivas()
      .countDistinct<{ total: number }>(
        "conveniado.id as total"
      )
      .first();

    return {
      beneficios_disponiveis: Number(
        beneficios?.total ?? 0
      ),
      conveniados: Number(
        conveniados?.total ?? 0
      ),
    };
  },

  async listarBeneficios({
    busca,
    categoriaId,
  }: Filtro) {
    const consulta = ofertasAtivas()
      .select(CAMPOS_BENEFICIO)
      .countDistinct(
        "conveniado.id as total_locais"
      )
      .groupBy(CAMPOS_BENEFICIO)
      .orderBy("beneficio.nome");

    if (busca) {
      consulta.where(function () {
        this.whereRaw(
          "beneficio.nome LIKE ? ESCAPE '\\\\'",
          [textoDaBusca(busca)]
        ).orWhereRaw(
          "beneficio.descricao LIKE ? ESCAPE '\\\\'",
          [textoDaBusca(busca)]
        );
      });
    }

    filtrarCategoria(consulta, categoriaId);

    const beneficios = await consulta;

    const locais = await ofertasAtivas()
      .whereIn(
        "beneficio.id",
        beneficios.map((b) => b.id)
      )
      .select(
        "beneficio.id as beneficio_id",
        "conveniado.id as conveniado_id"
      );

    return Promise.all(
      beneficios.map(async (b) => ({
        ...b,
        total_locais: Number(b.total_locais),
        categorias: await categoriasDosLocais(
          locais
            .filter((l) => l.beneficio_id === b.id)
            .map((l) => l.conveniado_id)
        ),
      }))
    );
  },

  async buscarBeneficio(id: number) {
    const beneficio = await db("beneficio")
      .where({ id, status: "ATIVO" })
      .first(CAMPOS_BENEFICIO);

    if (!beneficio) return null;

    const locais = await ofertasAtivas()
      .where("beneficio.id", id)
      .orderBy("conveniado.nome_fantasia")
      .select(
        "conveniado.id",
        "conveniado.nome_fantasia",
        "conveniado.endereco"
      );

    const mapa = await categoriasDe(
      locais.map((l) => l.id)
    );

    return {
      ...beneficio,
      categorias: await categoriasDosLocais(
        locais.map((l) => l.id)
      ),
      locais: locais.map((l) => ({
        ...l,
        categorias: apenasAtivas(mapa.get(l.id)),
      })),
    };
  },

  async listarLocais({
    busca,
    categoriaId,
  }: Filtro) {
    const consulta = ofertasAtivas()
      .select(
        "conveniado.id",
        "conveniado.nome_fantasia",
        "conveniado.endereco"
      )
      .countDistinct(
        "beneficio.id as total_beneficios"
      )
      .groupBy(
        "conveniado.id",
        "conveniado.nome_fantasia",
        "conveniado.endereco"
      )
      .orderBy("conveniado.nome_fantasia");

    if (busca) {
      consulta.whereRaw(
        "conveniado.nome_fantasia LIKE ? ESCAPE '\\\\'",
        [textoDaBusca(busca)]
      );
    }

    filtrarCategoria(consulta, categoriaId);

    const locais: Record<string, any>[] =
      await consulta;

    const mapa = await categoriasDe(
      locais.map((l) => l.id)
    );

    return locais.map((l) => ({
      ...l,
      total_beneficios: Number(l.total_beneficios),
      categorias: apenasAtivas(mapa.get(l.id)),
    }));
  },

  async buscarLocal(id: number) {
    const local = await db("conveniado")
      .where({
        id,
        status: "ATIVO",
      })
      .first(
        "id",
        "nome_fantasia",
        "razao_social",
        "endereco"
      );

    if (!local) return null;

    const beneficios = await ofertasAtivas()
      .where("conveniado.id", id)
      .orderBy("beneficio.nome")
      .select(CAMPOS_BENEFICIO);

    const mapa = await categoriasDe([id]);

    return {
      ...local,
      categorias: apenasAtivas(mapa.get(id)),
      beneficios,
    };
  },
};