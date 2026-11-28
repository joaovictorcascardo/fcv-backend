"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.createTable("conveniado_categoria", (t) => {
        t.integer("conveniado_id")
            .unsigned()
            .notNullable()
            .references("id")
            .inTable("conveniado")
            .onDelete("CASCADE");
        t.integer("categoria_id")
            .unsigned()
            .notNullable()
            .references("id")
            .inTable("categoria_conveniado");
        t.primary(["conveniado_id", "categoria_id"]);
    });
    const conveniados = await knex("conveniado").select("id", "categoria");
    for (const { id, categoria } of conveniados) {
        const nome = categoria.trim();
        let existente = await knex("categoria_conveniado")
            .where({ nome })
            .first();
        if (!existente) {
            const [novoId] = await knex("categoria_conveniado")
                .insert({ nome });
            existente = { id: novoId };
        }
        await knex("conveniado_categoria").insert({
            conveniado_id: id,
            categoria_id: existente.id,
        });
    }
    await knex.schema.alterTable("conveniado", (t) => {
        t.dropColumn("categoria");
    });
}
async function down(knex) {
    await knex.schema.alterTable("conveniado", (t) => {
        t.string("categoria", 60).nullable();
    });
    await knex.raw(`
    UPDATE conveniado c
    SET c.categoria = (
      SELECT cat.nome
      FROM conveniado_categoria cc
      JOIN categoria_conveniado cat
        ON cat.id = cc.categoria_id
      WHERE cc.conveniado_id = c.id
      ORDER BY cat.nome
      LIMIT 1
    )
  `);
    await knex("conveniado")
        .whereNull("categoria")
        .update({ categoria: "Sem categoria" });
    await knex.raw("ALTER TABLE conveniado MODIFY categoria VARCHAR(60) NOT NULL");
    await knex.schema.dropTable("conveniado_categoria");
}
