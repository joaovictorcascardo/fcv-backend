import db from "../database/db";
import { listarRecurso } from "../queries/recursos";

const TABELA = "campanha_evento";

export const campanhaEventoModel = {
  listar(consulta: unknown = {}) {
    return listarRecurso(db, "campanhas", consulta);
  },

  buscarPorId(id: number) {
    return db(TABELA).where({ id }).first();
  },

  async criar(dados: any) {
    const [id] = await db(TABELA).insert(dados);
    return id;
  },

  atualizar(id: number, dados: any) {
    return db(TABELA).where({ id }).update(dados);
  },

  excluir(id: number) {
    return db(TABELA).where({ id }).del();
  },
};
