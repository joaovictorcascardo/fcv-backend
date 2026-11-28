"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.createTable("colaborador", (t) => {
        t.increments("id");
        t.integer("usuario_id").unsigned().notNullable().unique()
            .references("id").inTable("usuario");
        t.string("matricula", 30).notNullable().unique();
        t.string("setor", 100).notNullable();
        t.string("cargo", 100).notNullable();
        t.date("data_admissao").notNullable();
        t.enu("status", ["ATIVO", "INATIVO", "AFASTADO"]).notNullable().defaultTo("ATIVO");
        t.string("telefone", 20).nullable();
    });
}
async function down(knex) {
    await knex.schema.dropTable("colaborador");
}
