import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("beneficio_conveniado", (t) => {
    t.increments("id");

    t.integer("beneficio_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("beneficio");

    t.integer("conveniado_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("conveniado");

    t.enu("status", ["ATIVO", "INATIVO"])
      .notNullable()
      .defaultTo("ATIVO");

    t.unique(
      ["beneficio_id", "conveniado_id"],
      { indexName: "uq_beneficio_conveniado" }
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("beneficio_conveniado");
}