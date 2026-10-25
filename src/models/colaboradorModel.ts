import db from "../database/db";
import { listarRecurso } from "../queries/recursos";

const TABELA = "colaborador";

export const colaboradorModel = {
  listar(consulta: unknown = {}) {
    return listarRecurso(db, "colaboradores", consulta);
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
