import db from "../database/db";
import { listarRecurso } from "../queries/recursos";

const TABELA = "conveniado";

type Registro = Record<string, any>;

export async function categoriasDe(ids: number[]) {
  const mapa = new Map<
    number,
    { id: number; nome: string; status: string }[]
  >();

  if (ids.length === 0) return mapa;

  const linhas = await db("conveniado_categoria")
    .join(
      "categoria_conveniado",
      "categoria_conveniado.id",
      "conveniado_categoria.categoria_id"
    )
    .whereIn("conveniado_categoria.conveniado_id", ids)
    .orderBy("categoria_conveniado.nome")
    .select(
      "conveniado_categoria.conveniado_id",
      "categoria_conveniado.id",
      "categoria_conveniado.nome",
      "categoria_conveniado.status"
    );

  for (const { conveniado_id, ...categoria } of linhas) {
    mapa.set(conveniado_id, [
      ...(mapa.get(conveniado_id) ?? []),
      categoria,
    ]);
  }

  return mapa;
}

async function comCategorias(lista: Registro[]) {
  const mapa = await categoriasDe(lista.map((c) => c.id));

  return lista.map((c) => ({
    ...c,
    categorias: mapa.get(c.id) ?? [],
  }));
}

export const conveniadoModel = {
  async listar(consulta: unknown = {}) {
    const resultado = await listarRecurso(
      db,
      "conveniados",
      consulta
    );

    if (Array.isArray(resultado)) {
      return comCategorias(resultado);
    }

    return {
      ...resultado,
      dados: await comCategorias(resultado.dados),
    };
  },

  async buscarPorId(id: number) {
    const conveniado = await db(TABELA)
      .where({ id })
      .first();

    if (!conveniado) return conveniado;

    const [completo] = await comCategorias([conveniado]);
    return completo;
  },

  async categoriasInexistentes(ids: number[]) {
    const ativas = await db("categoria_conveniado")
      .whereIn("id", ids)
      .where({ status: "ATIVO" })
      .pluck("id");

    return ids.filter((id) => !ativas.includes(id));
  },

  buscarPorCnpj(cnpj: string) {
    return db(TABELA).where({ cnpj }).first();
  },

  buscarPorUsuarioId(usuarioId: number) {
    return db(TABELA)
      .where({ usuario_id: usuarioId })
      .first();
  },

  async contarVinculos(
    conveniadoId: number
  ): Promise<{ beneficios: number; campanhas: number }> {
    const ben = await db("beneficio_conveniado")
      .where({ conveniado_id: conveniadoId })
      .count<{ total: number }>("id as total")
      .first();

    const camp = await db("beneficio_campanha_conveniado")
      .where({ conveniado_id: conveniadoId })
      .count<{ total: number }>("id as total")
      .first();

    return {
      beneficios: Number(ben?.total ?? 0),
      campanhas: Number(camp?.total ?? 0),
    };
  },

  criar(dados: any, categorias: number[]) {
    return db.transaction(async (trx) => {
      const [id] = await trx(TABELA).insert(dados);

      await trx("conveniado_categoria").insert(
        categorias.map((categoria_id) => ({
          conveniado_id: id,
          categoria_id,
        }))
      );

      return id;
    });
  },

  atualizar(
    id: number,
    dados: any,
    categorias?: number[]
  ) {
    return db.transaction(async (trx) => {
      if (Object.keys(dados).length > 0) {
        await trx(TABELA).where({ id }).update(dados);
      }

      if (categorias) {
        await trx("conveniado_categoria")
          .where({ conveniado_id: id })
          .del();

        await trx("conveniado_categoria").insert(
          categorias.map((categoria_id) => ({
            conveniado_id: id,
            categoria_id,
          }))
        );
      }
    });
  },

  excluir(id: number) {
    return db(TABELA).where({ id }).del();
  },
};