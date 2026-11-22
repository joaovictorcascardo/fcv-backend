import type { Knex } from "knex";

export function listarAguardando(conexao: Knex, colaboradorId: number, momento: string) {
  return conexao("utilizacao")
    .join("beneficio", "beneficio.id", "utilizacao.beneficio_id")
    .where("utilizacao.colaborador_id", colaboradorId)
    .where("utilizacao.status", "PENDENTE")
    .where("utilizacao.data_expiracao", ">", momento)
    .orderBy("utilizacao.data_expiracao", "asc")
    .select(
      "utilizacao.id",
      "utilizacao.status",
      "utilizacao.token_qrcode",
      "utilizacao.codigo_validacao",
      "utilizacao.data_solicitacao",
      "utilizacao.data_expiracao",
      "utilizacao.valor_aplicado",
      "beneficio.id as beneficio_id",
      "beneficio.nome as beneficio_nome",
      "beneficio.tipo_beneficio",
      "beneficio.valor as beneficio_valor",
    );
}
