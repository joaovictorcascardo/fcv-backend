import { randomUUID } from "crypto";
import db from "../database/db";
import { listarRecurso } from "../queries/recursos";

const TABELA = "utilizacao";

export const utilizacaoModel = {
  listar(consulta: unknown = {}) {
    return listarRecurso(db, "utilizacoes", consulta);
  },

  listarDoDono(filtros: {
    colaborador_id?: number;
    conveniado_id?: number;
    status?: string;
    de?: string;
    ate?: string;
  }) {
    const consulta = db(TABELA)
      .leftJoin("beneficio_conveniado as bc", "bc.id", "utilizacao.beneficio_conveniado_id")
      .leftJoin("beneficio", "beneficio.id", "bc.beneficio_id")
      .leftJoin(
        "beneficio_campanha_conveniado as bcc",
        "bcc.id",
        "utilizacao.beneficio_campanha_conveniado_id",
      )
      .leftJoin("beneficio_campanha as item", "item.id", "bcc.beneficio_campanha_id")
      .leftJoin("conveniado", function () {
        this.on("conveniado.id", "=", db.raw("COALESCE(bc.conveniado_id, bcc.conveniado_id)"));
      })
      .join("colaborador", "colaborador.id", "utilizacao.colaborador_id")
      .join("usuario", "usuario.id", "colaborador.usuario_id")
      .select(
        "utilizacao.id",
        "utilizacao.status",
        "utilizacao.valor_aplicado",
        "utilizacao.canal_validacao",
        "utilizacao.data_solicitacao",
        "utilizacao.data_confirmacao",
        "utilizacao.observacoes",
        "beneficio.id as beneficio_id",
        "item.id as item_campanha_id",
        db.raw("COALESCE(beneficio.nome, item.nome) as beneficio_nome"),
        db.raw("IF(beneficio.id IS NULL, 'CAMPANHA', 'BENEFICIO') as origem"),
        "conveniado.id as conveniado_id",
        "conveniado.nome_fantasia as conveniado_nome_fantasia",
        "conveniado.categoria as conveniado_categoria",
        "conveniado.endereco as conveniado_endereco",
        "usuario.nome as colaborador_nome",
      )
      .orderBy("utilizacao.data_solicitacao", "desc");

    if (filtros.colaborador_id) {
      consulta.where("utilizacao.colaborador_id", filtros.colaborador_id);
    }
    if (filtros.conveniado_id) {
      consulta.where("conveniado.id", filtros.conveniado_id);
    }
    if (filtros.status) {
      consulta.where("utilizacao.status", filtros.status);
    }
    if (filtros.de) {
      consulta.where("utilizacao.data_solicitacao", ">=", filtros.de);
    }
    if (filtros.ate) {
      consulta.where(
        "utilizacao.data_solicitacao",
        "<",
        db.raw("DATE_ADD(?, INTERVAL 1 DAY)", [filtros.ate]),
      );
    }
    return consulta;
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
