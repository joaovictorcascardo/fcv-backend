import bcrypt from "bcryptjs";
import db from "../database/db";

const TABELA = "usuario";
const COLUNAS = ["id", "nome", "email", "perfil_id", "status", "data_criacao"];

export const usuarioModel = {
  listar() {
    return db(TABELA).select(COLUNAS);
  },

  buscarPorId(id: number) {
    return db(TABELA).select(COLUNAS).where({ id }).first();
  },

  async criar(dados: any) {
    if (dados.senha) {
      dados.senha = await bcrypt.hash(String(dados.senha), 10);
    }
    const [id] = await db(TABELA).insert(dados);
    return id;
  },

  async atualizar(id: number, dados: any) {
    if (dados.senha) {
      dados.senha = await bcrypt.hash(String(dados.senha), 10);
    }
    return db(TABELA).where({ id }).update(dados);
  },

  excluir(id: number) {
    return db(TABELA).where({ id }).del();
  },
};
