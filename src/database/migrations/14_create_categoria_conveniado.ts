import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("categoria_conveniado", (t) => {
    t.increments("id");
    t.string("nome", 60).notNullable().unique();
    t.enu("status", ["ATIVO", "INATIVO"])
      .notNullable()
      .defaultTo("ATIVO");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("categoria_conveniado");
}