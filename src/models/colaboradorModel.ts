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

  buscarPorMatricula(matricula: string) {
    return db(TABELA).where({ matricula }).first();
  },

  buscarPorUsuarioId(usuarioId: number) {
    return db(TABELA).where({ usuario_id: usuarioId }).first();
  },

  async contarUtilizacoes(colaboradorId: number): Promise<number> {
    const res = await db("utilizacao")
      .where({ colaborador_id: colaboradorId })
      .count<{ total: number }>("id as total")
      .first();
    return Number(res?.total ?? 0);
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
