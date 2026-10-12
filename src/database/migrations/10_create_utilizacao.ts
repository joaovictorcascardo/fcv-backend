import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("utilizacao", (t) => {
    t.increments("id");
    t.integer("colaborador_id").unsigned().notNullable()
      .references("id").inTable("colaborador");
    t.integer("beneficio_conveniado_id").unsigned().nullable()
      .references("id").inTable("beneficio_conveniado");
    t.integer("beneficio_campanha_conveniado_id").unsigned().nullable()
      .references("id").inTable("beneficio_campanha_conveniado");
    t.string("token_qrcode", 64).notNullable().unique();
    t.dateTime("data_solicitacao").notNullable().defaultTo(knex.fn.now());
    t.dateTime("data_confirmacao").nullable();
    t.decimal("valor_aplicado", 10, 2).notNullable();
    t.enu("canal_validacao", ["APP_CONVENIADO", "TERMINAL_IOT"]).nullable();
    t.enu("status", ["PENDENTE", "APROVADA", "REPROVADA", "ESTORNADA"]).notNullable().defaultTo("PENDENTE");
    t.text("observacoes").nullable();
    t.index(["colaborador_id", "data_solicitacao"]);
    t.index(["status"]);
  });

  await knex.raw(`
    ALTER TABLE utilizacao
      ADD CONSTRAINT ck_utilizacao_origem CHECK (
        (beneficio_conveniado_id IS NOT NULL) + (beneficio_campanha_conveniado_id IS NOT NULL) = 1
      )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("utilizacao");
}
