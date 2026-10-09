import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("perfil_acesso", (t) => {
    t.increments("id");
    t.string("nome", 50).notNullable().unique();
    t.enu("escopo", ["FCV", "COLABORADOR", "CONVENIADO"]).notNullable();
    t.string("descricao", 255).nullable();
    t.json("permissoes").nullable();
    t.enu("status", ["ATIVO", "INATIVO"]).notNullable().defaultTo("ATIVO");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("perfil_acesso");
}
