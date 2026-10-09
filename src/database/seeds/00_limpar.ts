import type { Knex } from "knex";

const tabelas = [
  "utilizacao",
  "beneficio_campanha_conveniado",
  "beneficio_campanha",
  "campanha_evento",
  "beneficio_conveniado",
  "beneficio",
  "conveniado",
  "colaborador",
  "usuario",
  "conveniado",
  "colaborador",
  "usuario",
  "perfil_acesso",
];

export async function seed(knex: Knex): Promise<void> {
  for (const tabela of tabelas) {
    if (await knex.schema.hasTable(tabela)) {
      await knex(tabela).del();
    }
  }
}
