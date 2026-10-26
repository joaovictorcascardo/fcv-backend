import db from "../database/db";
import { listarRecurso } from "../queries/recursos";
import { contarUtilizacoes } from "./historicoModel";

const TABELA = "beneficio_campanha";

export const beneficioCampanhaModel = {
  listar(consulta: unknown = {}) {
    return listarRecurso(db, "itens-campanha", consulta);
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

  contarUtilizacoes(id: number) {
    return contarUtilizacoes("item-campanha", id);
  },

  excluir(id: number) {
    return db(TABELA).where({ id }).del();
  },
};
