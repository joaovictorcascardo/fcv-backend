"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
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
async function down(knex) {
    await knex.schema.dropTable("redefinicao_senha");
}
