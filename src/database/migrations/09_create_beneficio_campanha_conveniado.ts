import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(
    "beneficio_campanha_conveniado",
    (t) => {
      t.increments("id");

      t.integer("beneficio_campanha_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("beneficio_campanha")
        .onDelete("CASCADE");

      t.integer("conveniado_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("conveniado");

      t.enu("status", ["ATIVO", "INATIVO"])
        .notNullable()
        .defaultTo("ATIVO");

      t.unique(
        ["beneficio_campanha_id", "conveniado_id"],
        { indexName: "uq_bcc" }
      );
    }
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(
    "beneficio_campanha_conveniado"
  );
}