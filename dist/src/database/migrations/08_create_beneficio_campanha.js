"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.createTable("beneficio_campanha", (t) => {
        t.increments("id");
        t.integer("campanha_id")
            .unsigned()
            .notNullable()
            .references("id")
            .inTable("campanha_evento")
            .onDelete("CASCADE");
        t.string("nome", 150).notNullable();
        t.text("descricao").nullable();
        t.enu("tipo_beneficio", [
            "PERCENTUAL",
            "VALOR_FIXO"
        ]).notNullable();
        t.decimal("valor", 10, 2).notNullable();
        t.integer("quantidade_maxima_utilizacoes").nullable();
        t.enu("status", ["ATIVO", "INATIVO"])
            .notNullable().defaultTo("ATIVO");
    });
    await knex.raw(`
    ALTER TABLE beneficio_campanha
      ADD CONSTRAINT ck_bcamp_valor
      CHECK (valor > 0)
  `);
}
async function down(knex) {
    await knex.schema.dropTable("beneficio_campanha");
}
