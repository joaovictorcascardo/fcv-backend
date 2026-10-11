import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("conveniado", (t) => {
    t.increments("id");

    t.integer("usuario_id")
      .unsigned()
      .notNullable()
      .unique()
      .references("id")
      .inTable("usuario");

    t.string("nome_fantasia", 150).notNullable();
    t.string("razao_social", 150).notNullable();
    t.string("categoria", 60).notNullable();
    t.string("cnpj", 14).notNullable().unique();
    t.string("endereco", 255).notNullable();

    t.enu("status", [
      "ATIVO",
      "INATIVO",
      "EM_ANALISE"
    ])
      .notNullable()
      .defaultTo("EM_ANALISE");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("conveniado");
}