import db from "../database/db";

const TABELA = "categoria_conveniado";

export const categoriaModel = {
  listar(status?: string) {
    const consulta = db(TABELA)
      .select("*")
      .orderBy("nome");

    if (status) {
      consulta.where({ status });
    }

    return consulta;
  },

  buscarPorId(id: number) {
    return db(TABELA)
      .where({ id })
      .first();
  },

  buscarPorNome(nome: string) {
    return db(TABELA)
      .where({ nome })
      .first();
  },

  async contarConveniados(id: number) {
    const linha = await db("conveniado_categoria")
      .where({ categoria_id: id })
      .count<{ total: number }>("* as total")
      .first();

    return Number(linha?.total ?? 0);
  },

  async criar(dados: {
    nome: string;
    status?: string;
  }) {
    const [id] = await db(TABELA).insert(dados);
    return id;
  },

  atualizar(
    id: number,
    dados: {
      nome?: string;
      status?: string;
    }
  ) {
    return db(TABELA)
      .where({ id })
      .update(dados);
  },

  excluir(id: number) {
    return db(TABELA)
      .where({ id })
      .del();
  },
};