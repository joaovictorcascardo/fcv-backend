import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("redefinicao_senha", (t) => {
    t.increments("id");
    t.integer("usuario_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("usuario")
      .onDelete("CASCADE");
    t.string("codigo", 255).notNullable();
    t.dateTime("expira_em").notNullable();
    t.boolean("usado").notNullable().defaultTo(false);
    t.dateTime("data_criacao").notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("redefinicao_senha");
}
