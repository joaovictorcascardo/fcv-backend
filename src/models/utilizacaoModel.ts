import { randomUUID } from "crypto";
import db from "../database/db";
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

  // Só muda o status se ele ainda for o mesmo que foi lido (evita cancelar duas vezes).
  cancelar(id: number, statusAtual: string, novoStatus: string, observacoes: string) {
    return db(TABELA)
      .where({ id, status: statusAtual })
      .update({ status: novoStatus, observacoes });
  },
};

// Utilização nunca é apagada: o DELETE encerra o uso mudando o status.
const statusDoCancelamento: Record<string, string> = {
  PENDENTE: "REPROVADA",
  APROVADA: "ESTORNADA",
};

export const OBSERVACAO_CANCELAMENTO = "Cancelada pela FCV";

export function statusAoCancelar(status: string): string | null {
  return statusDoCancelamento[status] ?? null;
}

export function observacaoAoCancelar(observacoes?: string | null) {
  return observacoes ? `${observacoes}\n${OBSERVACAO_CANCELAMENTO}` : OBSERVACAO_CANCELAMENTO;
}
