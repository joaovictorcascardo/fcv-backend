import { randomUUID } from "crypto";
import type { Knex } from "knex";
import db from "../database/db";
import { calcularExpiracao, cicloAtual, type RegraCiclo } from "../utils/ciclo";
import { gerarCodigoValidacao } from "../utils/codigo";
import { agora, segundosEntre } from "../utils/tempo";

export class ErroResgate extends Error {
  constructor(public status: number, mensagem: string, public extra: Record<string, unknown> = {}) {
    super(mensagem);
  }
}

export function formatarDataHora(texto: string) {
  const [data, hora] = texto.slice(0, 16).split(" ");
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano} às ${hora}`;
}

const NAO_ENCONTRADO = "Resgate não encontrado neste estabelecimento. Confira o código e se o benefício é aceito aqui";

const MENSAGEM_ENCERRADO: Record<string, string> = {
  APROVADA: "Este resgate já foi aprovado",
  REPROVADA: "Este resgate já foi reprovado",
  ESTORNADA: "Este resgate foi estornado pela FCV",
  CANCELADA: "Este resgate foi cancelado",
  EXPIRADA: "Este resgate expirou. Peça para o colaborador solicitar de novo",
};

function detalhar(conexao: Knex | Knex.Transaction) {
  return conexao("utilizacao")
    .leftJoin("beneficio", "beneficio.id", "utilizacao.beneficio_id")
    .leftJoin("beneficio_conveniado as oferta", "oferta.id", "utilizacao.beneficio_conveniado_id")
    .leftJoin("conveniado", "conveniado.id", "oferta.conveniado_id")
    .join("colaborador", "colaborador.id", "utilizacao.colaborador_id")
    .join("usuario", "usuario.id", "colaborador.usuario_id")
    .select(
      "utilizacao.id",
      "utilizacao.status",
      "utilizacao.token_qrcode",
      "utilizacao.codigo_validacao",
      "utilizacao.data_solicitacao",
      "utilizacao.data_expiracao",
      "utilizacao.data_validacao",
      "utilizacao.valor_aplicado",
      "utilizacao.canal_validacao",
      "utilizacao.observacoes",
      "utilizacao.colaborador_id",
      "usuario.nome as colaborador_nome",
      "utilizacao.beneficio_id",
      "beneficio.nome as beneficio_nome",
      "beneficio.descricao as beneficio_descricao",
      "beneficio.tipo_beneficio",
      "beneficio.valor as beneficio_valor",
      "conveniado.id as conveniado_id",
      "conveniado.nome_fantasia as conveniado_nome",
    );
}

type Resgate = Record<string, any>;

function comTempo(resgate: Resgate, momento: string): Resgate {
  const vencido = resgate.status === "PENDENTE" && resgate.data_expiracao <= momento;
  const status = vencido ? "EXPIRADA" : resgate.status;
  const restante = status === "PENDENTE" ? Math.max(0, segundosEntre(momento, resgate.data_expiracao)) : 0;
  return { ...resgate, status, segundos_restantes: restante };
}

async function contarNoCiclo(trx: Knex.Transaction, colaboradorId: number, beneficioId: number, inicio: string, momento: string) {
  const linha = await trx("utilizacao")
    .where({ colaborador_id: colaboradorId, beneficio_id: beneficioId })
    .where("data_solicitacao", ">=", inicio)
    .where(function () {
      this.where("status", "APROVADA").orWhere(function () {
        this.where("status", "PENDENTE").where("data_expiracao", ">", momento);
      });
    })
    .count<{ total: number }>("id as total")
    .first();
  return Number(linha?.total ?? 0);
}

async function codigoLivre(trx: Knex.Transaction) {
  let codigo = gerarCodigoValidacao();
  while (await trx("utilizacao").where({ codigo_validacao: codigo }).first()) codigo = gerarCodigoValidacao();
  return codigo;
}

export const resgateModel = {
  async solicitar(usuarioId: number, beneficioId: number) {
    const momento = agora();
    const id = await db.transaction(async (trx) => {
      const colaborador = await trx("colaborador").where({ usuario_id: usuarioId }).forUpdate().first();
      if (!colaborador) throw new ErroResgate(404, "Cadastro de colaborador não encontrado");
      if (colaborador.status !== "ATIVO") throw new ErroResgate(403, "Seu cadastro de colaborador não está ativo");

      const beneficio = await trx("beneficio").where({ id: beneficioId }).first();
      if (!beneficio) throw new ErroResgate(404, "Benefício não encontrado");
      if (beneficio.status !== "ATIVO") throw new ErroResgate(409, "Este benefício não está ativo");

      const local = await trx("beneficio_conveniado")
        .join("conveniado", "conveniado.id", "beneficio_conveniado.conveniado_id")
        .where({ "beneficio_conveniado.beneficio_id": beneficioId, "beneficio_conveniado.status": "ATIVO", "conveniado.status": "ATIVO" })
        .first("beneficio_conveniado.id");
      if (!local) throw new ErroResgate(409, "Este benefício ainda não tem nenhum estabelecimento disponível");

      const aberto = await trx("utilizacao")
        .where({ colaborador_id: colaborador.id, beneficio_id: beneficioId, status: "PENDENTE" })
        .where("data_expiracao", ">", momento)
        .first("id", "data_expiracao");
      if (aberto) {
        throw new ErroResgate(409, "Você já tem um resgate deste benefício aguardando validação", {
          utilizacao_id: aberto.id,
          data_expiracao: aberto.data_expiracao,
        });
      }

      const regra = beneficio as RegraCiclo;
      const ciclo = cicloAtual(regra, momento, colaborador.data_admissao);
      const usados = await contarNoCiclo(trx, colaborador.id, beneficioId, ciclo.inicio, momento);
      if (usados >= beneficio.quantidade_maxima_utilizacoes) {
        const renova = ciclo.fim ? ` Ele renova em ${formatarDataHora(ciclo.fim)}` : "";
        throw new ErroResgate(409, `Você já usou ${usados} de ${beneficio.quantidade_maxima_utilizacoes} neste ciclo.${renova}`.trim(), {
          usados,
          limite: beneficio.quantidade_maxima_utilizacoes,
          renova_em: ciclo.fim,
        });
      }

      const [novoId] = await trx("utilizacao").insert({
        colaborador_id: colaborador.id,
        beneficio_id: beneficioId,
        token_qrcode: randomUUID(),
        codigo_validacao: await codigoLivre(trx),
        data_solicitacao: momento,
        data_expiracao: calcularExpiracao(regra, momento),
        valor_aplicado: beneficio.valor,
        status: "PENDENTE",
      });
      return novoId;
    });
    return this.buscarDoColaborador(usuarioId, id);
  },

  async buscarDoColaborador(usuarioId: number, id: number) {
    const resgate = await detalhar(db).where({ "utilizacao.id": id, "usuario.id": usuarioId }).first();
    return resgate ? comTempo(resgate, agora()) : null;
  },

  async cancelar(usuarioId: number, id: number) {
    const momento = agora();
    const resgate = await this.buscarDoColaborador(usuarioId, id);
    if (!resgate) throw new ErroResgate(404, "Resgate não encontrado");
    if (resgate.status !== "PENDENTE") {
      throw new ErroResgate(409, MENSAGEM_ENCERRADO[resgate.status] ?? "Este resgate já foi encerrado", { status: resgate.status });
    }
    const alterados = await db("utilizacao")
      .where({ id, status: "PENDENTE" })
      .where("data_expiracao", ">", momento)
      .update({ status: "CANCELADA" });
    if (!alterados) throw new ErroResgate(409, "Este resgate acabou de mudar de situação. Consulte de novo");
    return this.buscarDoColaborador(usuarioId, id);
  },

  async conferirParaValidar(usuarioConveniadoId: number, codigo: string) {
    const conveniado = await db("conveniado").where({ usuario_id: usuarioConveniadoId }).first();
    if (!conveniado) throw new ErroResgate(404, "Cadastro de conveniado não encontrado");

    const resgate = await detalhar(db)
      .where(function () {
        this.where("utilizacao.token_qrcode", codigo).orWhere("utilizacao.codigo_validacao", codigo);
      })
      .first();
    const oferta = resgate?.beneficio_id
      ? await db("beneficio_conveniado")
          .where({ beneficio_id: resgate.beneficio_id, conveniado_id: conveniado.id, status: "ATIVO" })
          .first()
      : null;
    if (!resgate || !oferta) throw new ErroResgate(404, NAO_ENCONTRADO);

    const momento = agora();
    if (resgate.status === "PENDENTE" && resgate.data_expiracao <= momento) {
      await db("utilizacao").where({ id: resgate.id, status: "PENDENTE" }).update({ status: "EXPIRADA" });
      throw new ErroResgate(409, `Este resgate expirou em ${formatarDataHora(resgate.data_expiracao)}. Peça para o colaborador solicitar de novo`, {
        status: "EXPIRADA",
      });
    }
    if (resgate.status !== "PENDENTE") {
      throw new ErroResgate(409, MENSAGEM_ENCERRADO[resgate.status] ?? "Este resgate já foi encerrado", { status: resgate.status });
    }
    return { resgate: comTempo(resgate, momento), oferta, conveniado };
  },

  async decidir(usuarioConveniadoId: number, codigo: string, aprovar: boolean, canal: string, motivo?: string) {
    const { resgate, oferta } = await this.conferirParaValidar(usuarioConveniadoId, codigo);

    if (aprovar) {
      const beneficio = await db("beneficio").where({ id: resgate.beneficio_id }).first("status");
      if (beneficio?.status !== "ATIVO") throw new ErroResgate(409, "Este benefício não está mais ativo");
      const colaborador = await db("colaborador").where({ id: resgate.colaborador_id }).first("status");
      if (colaborador?.status !== "ATIVO") throw new ErroResgate(409, "O colaborador não está mais ativo");
    }

    const momento = agora();
    const alterados = await db("utilizacao")
      .where({ id: resgate.id, status: "PENDENTE" })
      .where("data_expiracao", ">", momento)
      .update({
        status: aprovar ? "APROVADA" : "REPROVADA",
        beneficio_conveniado_id: oferta.id,
        data_validacao: momento,
        canal_validacao: canal,
        ...(motivo ? { observacoes: motivo } : {}),
      });

    if (!alterados) {
      const atual = await db("utilizacao").where({ id: resgate.id }).first("status", "data_expiracao");
      const status = comTempo(atual, agora()).status;
      throw new ErroResgate(409, MENSAGEM_ENCERRADO[status] ?? "Este resgate acabou de ser validado em outra leitura", { status });
    }
    const final = await detalhar(db).where("utilizacao.id", resgate.id).first();
    return comTempo(final, momento);
  },
};
