import type { Knex } from "knex";

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function codigoAleatorio() {
  let codigo = "";
  for (let i = 0; i < 6; i++) codigo += LETRAS[Math.floor(Math.random() * LETRAS.length)];
  return codigo;
}

export async function up(knex: Knex): Promise<void> {
  await knex.raw("ALTER TABLE utilizacao DROP CHECK ck_utilizacao_origem");

  await knex.schema.alterTable("utilizacao", (t) => {
    t.integer("beneficio_id").unsigned().nullable().references("id").inTable("beneficio").after("colaborador_id");
    t.string("codigo_validacao", 6).nullable().after("token_qrcode");
    t.dateTime("data_expiracao").nullable().after("data_solicitacao");
    t.renameColumn("data_confirmacao", "data_validacao");
  });

  await knex.raw(`
    UPDATE utilizacao u
    JOIN beneficio_conveniado bc ON bc.id = u.beneficio_conveniado_id
    SET u.beneficio_id = bc.beneficio_id
  `);
  await knex.raw("UPDATE utilizacao SET data_expiracao = DATE_ADD(data_solicitacao, INTERVAL 3 HOUR)");

  const usados = new Set<string>();
  const linhas: { id: number }[] = await knex("utilizacao").select("id");
  for (const { id } of linhas) {
    let codigo = codigoAleatorio();
    while (usados.has(codigo)) codigo = codigoAleatorio();
    usados.add(codigo);
    await knex("utilizacao").where({ id }).update({ codigo_validacao: codigo });
  }

  await knex.raw(`
    ALTER TABLE utilizacao
      MODIFY codigo_validacao VARCHAR(6) NOT NULL,
      MODIFY data_expiracao DATETIME NOT NULL,
      MODIFY status ENUM('PENDENTE', 'APROVADA', 'REPROVADA', 'ESTORNADA', 'EXPIRADA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
      ADD UNIQUE INDEX utilizacao_codigo_validacao_unique (codigo_validacao),
      ADD INDEX utilizacao_status_data_expiracao_index (status, data_expiracao),
      ADD INDEX utilizacao_colaborador_beneficio_index (colaborador_id, beneficio_id, status),
      ADD CONSTRAINT ck_utilizacao_uma_oferta CHECK (
        beneficio_conveniado_id IS NULL OR beneficio_campanha_conveniado_id IS NULL
      ),
      ADD CONSTRAINT ck_utilizacao_origem CHECK (
        beneficio_id IS NOT NULL OR beneficio_campanha_conveniado_id IS NOT NULL
      ),
      ADD CONSTRAINT ck_utilizacao_local_validado CHECK (
        status IN ('PENDENTE', 'EXPIRADA', 'CANCELADA')
        OR beneficio_conveniado_id IS NOT NULL
        OR beneficio_campanha_conveniado_id IS NOT NULL
      )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE utilizacao
      DROP CHECK ck_utilizacao_uma_oferta,
      DROP CHECK ck_utilizacao_origem,
      DROP CHECK ck_utilizacao_local_validado,
      DROP INDEX utilizacao_codigo_validacao_unique,
      DROP INDEX utilizacao_status_data_expiracao_index
  `);
  await knex("utilizacao").whereIn("status", ["EXPIRADA", "CANCELADA"]).update({ status: "REPROVADA" });
  await knex("utilizacao").whereNull("beneficio_conveniado_id").whereNull("beneficio_campanha_conveniado_id").del();
  await knex.raw(
    "ALTER TABLE utilizacao MODIFY status ENUM('PENDENTE', 'APROVADA', 'REPROVADA', 'ESTORNADA') NOT NULL DEFAULT 'PENDENTE'"
  );
  await knex.schema.alterTable("utilizacao", (t) => {
    t.dropForeign(["beneficio_id"]);
  });
  await knex.raw("ALTER TABLE utilizacao DROP INDEX utilizacao_colaborador_beneficio_index");
  await knex.schema.alterTable("utilizacao", (t) => {
    t.dropColumn("beneficio_id");
    t.dropColumn("codigo_validacao");
    t.dropColumn("data_expiracao");
    t.renameColumn("data_validacao", "data_confirmacao");
  });
  await knex.raw(`
    ALTER TABLE utilizacao
      ADD CONSTRAINT ck_utilizacao_origem CHECK (
        (beneficio_conveniado_id IS NOT NULL) + (beneficio_campanha_conveniado_id IS NOT NULL) = 1
      )
  `);
}
