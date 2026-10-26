import db from "../database/db";
import { listarRecurso } from "../queries/recursos";

const TABELA = "conveniado";

export const conveniadoModel = {
  listar(consulta: unknown = {}) {
    return listarRecurso(db, "conveniados", consulta);
  },

  buscarPorId(id: number) {
    return db(TABELA).where({ id }).first();
  },

  buscarPorCnpj(cnpj: string) {
    return db(TABELA).where({ cnpj }).first();
  },

  buscarPorUsuarioId(usuarioId: number) {
    return db(TABELA).where({ usuario_id: usuarioId }).first();
  },

  async contarVinculos(conveniadoId: number): Promise<{ beneficios: number; campanhas: number }> {
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
