
import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("beneficio", (t) => {
    t.increments("id");
    t.string("nome", 150).notNullable();
    t.text("descricao").nullable();

    t.enu("status", ["ATIVO", "INATIVO", "DESCONTINUADO"])
      .notNullable().defaultTo("ATIVO");

    t.enu("tipo_beneficio", ["PERCENTUAL", "VALOR_FIXO"])
      .notNullable();

    t.decimal("valor", 10, 2).notNullable();
    t.integer("quantidade_maxima_utilizacoes").notNullable();

    t.enu("tipo_janela", ["CALENDARIO_FIXO", "JANELA_MOVEL"])
      .notNullable();

    t.enu("unidade_ciclo", ["ANO", "MES", "SEMANA"])
      .nullable();

    t.date("dia_reset").nullable();
    t.integer("intervalo_valor").nullable();

    t.enu("intervalo_unidade", ["DIA", "MES"])
      .nullable();

    t.enu("referencia_contagem",
      ["ULTIMA_UTILIZACAO", "DATA_ADMISSAO_COLABORADOR"]
    ).nullable();
  });

  await knex.raw(`
    ALTER TABLE beneficio
      ADD CONSTRAINT ck_beneficio_valor CHECK (valor > 0),
      ADD CONSTRAINT ck_beneficio_qtd CHECK (quantidade_maxima_utilizacoes > 0),
      ADD CONSTRAINT ck_beneficio_percentual CHECK (tipo_beneficio <> 'PERCENTUAL' OR valor <= 100),
      ADD CONSTRAINT ck_beneficio_janela CHECK (
        (tipo_janela = 'CALENDARIO_FIXO' AND unidade_ciclo IS NOT NULL)
        OR
        (tipo_janela = 'JANELA_MOVEL' AND intervalo_valor IS NOT NULL
          AND intervalo_unidade IS NOT NULL AND referencia_contagem IS NOT NULL)
      )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("beneficio");
}
