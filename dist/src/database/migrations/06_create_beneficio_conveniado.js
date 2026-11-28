"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.createTable("beneficio_conveniado", (t) => {
        t.increments("id");
        t.integer("beneficio_id")
            .unsigned()
            .notNullable()
            .references("id")
            .inTable("beneficio");
        t.integer("conveniado_id")
            .unsigned()
            .notNullable()
            .references("id")
            .inTable("conveniado");
        t.enu("status", ["ATIVO", "INATIVO"])
            .notNullable()
            .defaultTo("ATIVO");
        t.unique(["beneficio_id", "conveniado_id"], { indexName: "uq_beneficio_conveniado" });
    });
}
async function down(knex) {
    await knex.schema.dropTable("beneficio_conveniado");
}
