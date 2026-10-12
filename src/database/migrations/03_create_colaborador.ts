import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("colaborador", (t) => {
    t.increments("id");
    t.integer("usuario_id").unsigned().notNullable().unique()
      .references("id").inTable("usuario");
    t.string("matricula", 30).notNullable().unique();
    t.string("setor", 100).notNullable();
    t.string("cargo", 100).notNullable();
    t.date("data_admissao").notNullable();
    t.enu("status", ["ATIVO", "INATIVO", "AFASTADO"]).notNullable().defaultTo("ATIVO");
    t.string("telefone", 20).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("colaborador");
}
