import { randomUUID } from "crypto";
import db from "../database/db";

const TABELA = "utilizacao";

export const utilizacaoModel = {
  listar() {
    return db(TABELA).select("*");
  },

  buscarPorId(id: number) {
    return db(TABELA).where({ id }).first();
  },

  async criar(dados: any) {
    if (!dados.token_qrcode) {
      dados.token_qrcode = randomUUID();
    }
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
