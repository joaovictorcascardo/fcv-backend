"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
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
async function down(knex) {
    await knex.schema.dropTable("usuario");
}
