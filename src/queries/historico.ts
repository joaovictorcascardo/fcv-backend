import type { Knex } from "knex";
import { listarComConsulta, type ConfiguracaoListagem } from "./listagem";

export type DonoHistorico =
  | { colaborador_id: number; conveniado_id?: never }
  | { conveniado_id: number; colaborador_id?: never };

export const configuracaoHistorico: ConfiguracaoListagem = {
  ordenarPor: {
    id: "utilizacao.id",
    data_solicitacao: "utilizacao.data_solicitacao",
    data_confirmacao: "utilizacao.data_confirmacao",
    valor_aplicado: "utilizacao.valor_aplicado",
    status: "utilizacao.status",
  },
  padrao: { ordenarPor: "data_solicitacao", ordem: "desc" },
  intervalo: ["de", "ate"],
  filtros: {
    status: { tipo: "enum", coluna: "utilizacao.status", valores: ["PENDENTE", "APROVADA", "REPROVADA", "ESTORNADA"] },
    de: { tipo: "data", coluna: "utilizacao.data_solicitacao", operador: ">=", dataHora: true },
    ate: { tipo: "data", coluna: "utilizacao.data_solicitacao", operador: "<=", dataHora: true },
  },
};

export function criarBaseHistorico(conexao: Knex, dono: DonoHistorico) {
  const consulta = conexao("utilizacao")
    .leftJoin("beneficio_conveniado as bc", "bc.id", "utilizacao.beneficio_conveniado_id")
    .leftJoin("beneficio", "beneficio.id", "bc.beneficio_id")
    .leftJoin("beneficio_campanha_conveniado as bcc", "bcc.id", "utilizacao.beneficio_campanha_conveniado_id")
    .leftJoin("beneficio_campanha as item", "item.id", "bcc.beneficio_campanha_id")
    .leftJoin("conveniado", function () {
      this.on("conveniado.id", "=", conexao.raw("COALESCE(bc.conveniado_id, bcc.conveniado_id)"));
    })
    .join("colaborador", "colaborador.id", "utilizacao.colaborador_id")
    .join("usuario", "usuario.id", "colaborador.usuario_id")
    .select(
      "utilizacao.id", "utilizacao.status", "utilizacao.valor_aplicado", "utilizacao.canal_validacao",
      "utilizacao.data_solicitacao", "utilizacao.data_confirmacao", "utilizacao.observacoes",
      "beneficio.id as beneficio_id", "item.id as item_campanha_id",
      conexao.raw("COALESCE(beneficio.nome, item.nome) as beneficio_nome"),
      conexao.raw("IF(beneficio.id IS NULL, 'CAMPANHA', 'BENEFICIO') as origem"),
      "conveniado.id as conveniado_id", "conveniado.nome_fantasia as conveniado_nome_fantasia",
      "conveniado.categoria as conveniado_categoria", "conveniado.endereco as conveniado_endereco",
      "usuario.nome as colaborador_nome",
    );

  // O dono vem do usuário autenticado, antes de filtrar, contar ou paginar.
  if (dono.colaborador_id !== undefined) {
    consulta.where("utilizacao.colaborador_id", dono.colaborador_id);
  } else {
    consulta.where("conveniado.id", dono.conveniado_id);
  }
  return consulta;
}

export function listarHistorico(conexao: Knex, dono: DonoHistorico, consulta: unknown = {}) {
  return listarComConsulta(criarBaseHistorico(conexao, dono), consulta, configuracaoHistorico);
}
