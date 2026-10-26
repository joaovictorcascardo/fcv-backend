import db from "../database/db";
import { listarRecurso } from "../queries/recursos";

const TABELA = "perfil_acesso";

function prepararPermissoes(dados: any) {
  if (dados.permissoes !== undefined && dados.permissoes !== null) {
    dados.permissoes = JSON.stringify(dados.permissoes);
  }
  return dados;
}

export const perfilAcessoModel = {
  listar(consulta: unknown = {}) {
    return listarRecurso(db, "perfis", consulta);
  },

  buscarPorId(id: number) {
    return db(TABELA).where({ id }).first();
  },

  buscarPorNome(nome: string) {
    return db(TABELA).where({ nome }).first();
  },

  async contarUsuariosVinculados(perfilId: number): Promise<number> {
    const resultado = await db("usuario")
      .where({ perfil_id: perfilId })
      .count<{ total: number }>("id as total")
      .first();
    return Number(resultado?.total ?? 0);
  },

  async criar(dados: any) {
    const [id] = await db(TABELA).insert(prepararPermissoes(dados));
    return id;
  },

  atualizar(id: number, dados: any) {
    return db(TABELA).where({ id }).update(prepararPermissoes(dados));
  },

  excluir(id: number) {
    return db(TABELA).where({ id }).del();
  },
};
