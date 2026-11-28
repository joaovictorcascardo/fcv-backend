"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
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
async function down(knex) {
    await knex.schema.dropTable("conveniado");
}
