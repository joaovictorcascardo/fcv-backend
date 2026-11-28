"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.createTable("perfil_acesso", (t) => {
        t.increments("id");
        t.string("nome", 50).notNullable().unique();
        t.enu("escopo", ["FCV", "COLABORADOR", "CONVENIADO"]).notNullable();
        t.string("descricao", 255).nullable();
        t.json("permissoes").nullable();
        t.enu("status", ["ATIVO", "INATIVO"]).notNullable().defaultTo("ATIVO");
    });
}
async function down(knex) {
    await knex.schema.dropTable("perfil_acesso");
}
