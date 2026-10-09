import db from "../database/db";

const TABELA = "perfil_acesso";

function prepararPermissoes(dados: any) {
  if (dados.permissoes !== undefined && dados.permissoes !== null) {
    dados.permissoes = JSON.stringify(dados.permissoes);
  }
  return dados;
}

export const perfilAcessoModel = {
  listar() {
    return db(TABELA).select("*");
  },

  buscarPorId(id: number) {
    return db(TABELA).where({ id }).first();
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
