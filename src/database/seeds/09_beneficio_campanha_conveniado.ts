import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("beneficio_campanha_conveniado").insert([
    {
      id: 1,
      beneficio_campanha_id: 1,
      conveniado_id: 2,
    },
    {
      id: 2,
      beneficio_campanha_id: 2,
      conveniado_id: 1,
    },
    {
      id: 3,
      beneficio_campanha_id: 3,
      conveniado_id: 2,
    },
  ]);
}