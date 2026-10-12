import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("utilizacao").insert([
    {
      id: 1, colaborador_id: 1, beneficio_conveniado_id: 1, token_qrcode: "seed-token-0001",
      data_solicitacao: "2026-10-01 09:12:00", data_confirmacao: "2026-10-01 09:13:10",
      valor_aplicado: 12.6, canal_validacao: "APP_CONVENIADO", status: "APROVADA",
    },
    {
      id: 2, colaborador_id: 2, beneficio_conveniado_id: 2, token_qrcode: "seed-token-0002",
      data_solicitacao: "2026-10-02 18:40:00", valor_aplicado: 50,
    },
    {
      id: 3, colaborador_id: 1, beneficio_campanha_conveniado_id: 1, token_qrcode: "seed-token-0003",
      data_solicitacao: "2026-10-02 07:05:00", data_confirmacao: "2026-10-02 07:05:40",
      valor_aplicado: 80, canal_validacao: "TERMINAL_IOT", status: "APROVADA",
    },
    {
      id: 4, colaborador_id: 2, beneficio_conveniado_id: 1, token_qrcode: "seed-token-0004",
      data_solicitacao: "2026-10-03 10:20:00", data_confirmacao: "2026-10-03 10:21:00",
      valor_aplicado: 9.9, canal_validacao: "APP_CONVENIADO", status: "REPROVADA",
      observacoes: "Receita médica vencida",
    },
  ]);
}
