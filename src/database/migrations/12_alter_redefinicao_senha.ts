import type { Knex } from "knex";
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("redefinicao_senha", (t) => {
        t.integer("tentativas").unsigned().notNullable().defaultTo(0);
    });
}
export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("redefinicao_senha", (t) => {
        t.dropColumn("tentativas");
    });
}