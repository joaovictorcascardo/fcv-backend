"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.createTable("categoria_conveniado", (t) => {
        t.increments("id");
        t.string("nome", 60).notNullable().unique();
        t.enu("status", ["ATIVO", "INATIVO"])
            .notNullable()
            .defaultTo("ATIVO");
    });
}
async function down(knex) {
    await knex.schema.dropTable("categoria_conveniado");
}
