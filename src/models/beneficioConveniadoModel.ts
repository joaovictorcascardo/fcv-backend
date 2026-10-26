import db from "../database/db";
import { listarRecurso } from "../queries/recursos";
import { contarUtilizacoes } from "./historicoModel";

const TABELA = "beneficio_conveniado";

export const beneficioConveniadoModel = {
  listar(consulta: unknown = {}) {
    return listarRecurso(db, "ofertas", consulta);
  },

  buscarPorId(id: number) {
    return db(TABELA).where({ id }).first();
  },

  buscarPorPar(beneficioId: number, conveniadoId: number) {
    return db(TABELA).where({ beneficio_id: beneficioId, conveniado_id: conveniadoId }).first();
  },

  async criar(dados: any) {
    const [id] = await db(TABELA).insert(dados);
    return id;
  },

  atualizar(id: number, dados: any) {
    return db(TABELA).where({ id }).update(dados);
  },

  contarUtilizacoes(id: number) {
    return contarUtilizacoes("oferta", id);
  },

  excluir(id: number) {
    return db(TABELA).where({ id }).del();
  },
};
