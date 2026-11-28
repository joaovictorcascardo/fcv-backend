"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.alterTable("redefinicao_senha", (t) => {
        t.integer("tentativas").unsigned().notNullable().defaultTo(0);
    });
}
async function down(knex) {
    await knex.schema.alterTable("redefinicao_senha", (t) => {
        t.dropColumn("tentativas");
    });
}
