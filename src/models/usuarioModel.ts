import bcrypt from "bcryptjs";
import db from "../database/db";
import { listarRecurso } from "../queries/recursos";

const TABELA = "usuario";
const COLUNAS = ["id", "nome", "email", "perfil_id", "status", "data_criacao"];

export const usuarioModel = {
  listar(consulta: unknown = {}) {
    return listarRecurso(db, "usuarios", consulta);
  },

  buscarPorId(id: number) {
    return db(TABELA).select(COLUNAS).where({ id }).first();
  },

  buscarPorEmail(email: string) {
    return db(TABELA).select(COLUNAS).where({ email }).first();
  },

  async contarVinculos(usuarioId: number): Promise<{ colaboradores: number; conveniados: number }> {
    const colab = await db("colaborador")
      .where({ usuario_id: usuarioId })
      .count<{ total: number }>("id as total")
      .first();

    const conv = await db("conveniado")
      .where({ usuario_id: usuarioId })
      .count<{ total: number }>("id as total")
      .first();

    return {
      colaboradores: Number(colab?.total ?? 0),
      conveniados: Number(conv?.total ?? 0),
    };
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
