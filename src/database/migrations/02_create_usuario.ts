import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("usuario", (t) => {
    t.increments("id");
    t.string("nome", 150).notNullable();
    t.string("email", 150).notNullable().unique();
    t.string("senha", 255).notNullable();
    t.integer("perfil_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("perfil_acesso");
    t.enu("status", ["ATIVO", "INATIVO"]).notNullable().defaultTo("ATIVO");
    t.dateTime("data_criacao").notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("usuario");
}
