import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("campanha_evento").insert([
    {
      id: 1,
      nome: "Outubro Rosa",
      tipo: "CAMPANHA",
      descricao: "Mês de cuidado com a saúde da mulher",
      data_inicio: "2026-10-01",
      data_fim: "2026-10-31",
      criterio_elegibilidade: "Todos os colaboradores ativos",
      status: "ATIVA",
    },
    {
      id: 2,
      nome: "Confraternização de fim de ano",
      tipo: "EVENTO_PATROCINADO",
      data_inicio: "2026-12-12",
      data_fim: "2026-12-12",
      patrocinador: "Academia Forma",
    },
  ]);
}