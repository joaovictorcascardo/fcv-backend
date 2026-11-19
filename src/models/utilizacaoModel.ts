import { randomUUID } from "crypto";
import db from "../database/db";
import { gerarCodigoValidacao } from "../utils/codigo";
import { agora, somarHoras } from "../utils/tempo";
import { listarRecurso } from "../queries/recursos";
import { listarHistorico, type DonoHistorico } from "../queries/historico";

const TABELA = "utilizacao";

export const utilizacaoModel = {
  listar(consulta: unknown = {}) {
    return listarRecurso(db, "utilizacoes", consulta);
  },

  listarDoDono(dono: DonoHistorico, consulta: unknown = {}) {
    return listarHistorico(db, dono, consulta);
  },

  buscarPorId(id: number) {
    return db(TABELA).where({ id }).first();
  },

  buscarPorToken(token: string) {
    return db(TABELA).where({ token_qrcode: token }).first();
  },

  buscarPorCodigo(codigo: string) {
    return db(TABELA).where({ token_qrcode: codigo }).orWhere({ codigo_validacao: codigo }).first();
  },

  async codigoLivre() {
    let codigo = gerarCodigoValidacao();
    while (await db(TABELA).where({ codigo_validacao: codigo }).first()) codigo = gerarCodigoValidacao();
    return codigo;
  },

  async criar(dados: any) {
    if (!dados.token_qrcode) {
      dados.token_qrcode = randomUUID();
    }
    if (!dados.codigo_validacao) {
      dados.codigo_validacao = await this.codigoLivre();
    }
    if (!dados.data_solicitacao) {
      dados.data_solicitacao = agora();
    }
    if (!dados.data_expiracao) {
      dados.data_expiracao = somarHoras(dados.data_solicitacao, 3);
    }
    if (!dados.beneficio_id && dados.beneficio_conveniado_id) {
      const oferta = await db("beneficio_conveniado").where({ id: dados.beneficio_conveniado_id }).first();
      dados.beneficio_id = oferta?.beneficio_id;
    }
    const [id] = await db(TABELA).insert(dados);
    return id;
  },

  atualizar(id: number, dados: any) {
    return db(TABELA).where({ id }).update(dados);
  },

    cancelar(id: number, statusAtual: string, novoStatus: string, observacoes: string) {
    return db(TABELA)
      .where({ id, status: statusAtual })
      .update({ status: novoStatus, observacoes });
  },
};

const statusDoCancelamento: Record<string, string> = {
  PENDENTE: "CANCELADA",
  APROVADA: "ESTORNADA",
};

export const OBSERVACAO_CANCELAMENTO = "Cancelada pela FCV";

export function statusAoCancelar(status: string): string | null {
  return statusDoCancelamento[status] ?? null;
}

export function observacaoAoCancelar(observacoes?: string | null) {
  return observacoes ? `${observacoes}\n${OBSERVACAO_CANCELAMENTO}` : OBSERVACAO_CANCELAMENTO;
}
