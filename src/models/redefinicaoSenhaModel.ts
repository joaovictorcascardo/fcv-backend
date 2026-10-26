import bcrypt from "bcryptjs";
import db from "../database/db";

const MAXIMO_TENTATIVAS = 5;
const MAXIMO_CODIGOS_POR_HORA = 3;

export const redefinicaoSenhaModel = {
  async gerarCodigo(usuarioId: number, codigoCriptografado: string): Promise<boolean> {
    return db.transaction(async (trx) => {
      // Geração e consumo usam a mesma ordem de bloqueio por usuário.
      const usuario = await trx("usuario").select("id").where({ id: usuarioId }).forUpdate().first();
      if (!usuario) return false;

      const recentes = await trx("redefinicao_senha")
        .where({ usuario_id: usuarioId })
        .where("data_criacao", ">", trx.raw("DATE_SUB(NOW(), INTERVAL 1 HOUR)"))
        .count({ total: "*" })
        .first();
      if (Number(recentes?.total) >= MAXIMO_CODIGOS_POR_HORA) return false;

      await trx("redefinicao_senha")
        .where({ usuario_id: usuarioId, usado: false })
        .update({ usado: true });
      await trx("redefinicao_senha").insert({
        usuario_id: usuarioId,
        codigo: codigoCriptografado,
        expira_em: trx.raw("DATE_ADD(NOW(), INTERVAL 15 MINUTE)"),
      });
      return true;
    });
  },

  async redefinir(email: string, codigo: string, novaSenha: string): Promise<boolean> {
    return db.transaction(async (trx) => {
      // O segundo pedido aguarda a transação vencedora e relê o estado atual.
      const usuario = await trx("usuario").select("id").where({ email }).forUpdate().first();
      if (!usuario) return false;

      const pedido = await trx("redefinicao_senha")
        .where({ usuario_id: usuario.id, usado: false })
        .where("expira_em", ">", trx.fn.now())
        .where("tentativas", "<", MAXIMO_TENTATIVAS)
        .orderBy("id", "desc")
        .forUpdate()
        .first();
      if (!pedido) return false;

      await trx("redefinicao_senha").where({ id: pedido.id }).increment("tentativas", 1);
      if (!(await bcrypt.compare(codigo, pedido.codigo))) {
        // Retornar, em vez de lançar, confirma a tentativa inválida no banco.
        return false;
      }

      await trx("usuario").where({ id: usuario.id }).update({ senha: await bcrypt.hash(novaSenha, 10) });
      await trx("redefinicao_senha").where({ usuario_id: usuario.id }).update({ usado: true });
      return true;
    });
  },
};
