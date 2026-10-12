import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("campanha_evento", (t) => {
    t.increments("id");

    t.string("nome", 150).notNullable();

    t.enu("tipo", [
      "CAMPANHA",
      "EVENTO_INTERNO",
      "EVENTO_PATROCINADO",
      "VOUCHER",
      "CORTESIA"
    ]).notNullable();

    t.text("descricao").nullable();
    t.date("data_inicio").notNullable();
    t.date("data_fim").notNullable();
    t.text("criterio_elegibilidade").nullable();
    t.string("patrocinador", 150).nullable();

    t.enu("status", [
      "PLANEJADA",
      "ATIVA",
      "ENCERRADA",
      "CANCELADA"
    ]).notNullable().defaultTo("PLANEJADA");
  });

  await knex.raw(`
    ALTER TABLE campanha_evento
      ADD CONSTRAINT ck_campanha_datas
      CHECK (data_fim >= data_inicio)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("campanha_evento");
}