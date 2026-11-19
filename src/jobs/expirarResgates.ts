import type { Knex } from "knex";
import db from "../database/db";
import { agora } from "../utils/tempo";

const TRAVA = "fcv_expirar_resgates";

export async function expirarResgates(conexao: Knex = db, momento: string = agora()): Promise<number | null> {
  return conexao.transaction(async (trx): Promise<number | null> => {
    const [linhas] = await trx.raw("SELECT GET_LOCK(?, 0) AS livre", [TRAVA]);
    if (Number(linhas[0]?.livre) !== 1) return null;
    try {
      return await trx("utilizacao")
        .where("status", "PENDENTE")
        .where("data_expiracao", "<=", momento)
        .update({ status: "EXPIRADA" });
    } finally {
      await trx.raw("SELECT RELEASE_LOCK(?)", [TRAVA]);
    }
  });
}

export function iniciarRotinaExpiracao(minutos = Number(process.env.EXPIRACAO_MINUTOS) || 5) {
  const rodar = async () => {
    try {
      const total = await expirarResgates();
      if (total) console.log(`Rotina de expiração: ${total} resgate(s) marcados como EXPIRADA`);
    } catch (erro) {
      console.error("Rotina de expiração falhou:", erro instanceof Error ? erro.message : erro);
    }
  };
  void rodar();
  return setInterval(rodar, minutos * 60_000);
}
