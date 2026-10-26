import type { Knex } from "knex";
import db from "../database/db";

// Cadastros do catálogo que podem ter utilizações ligadas (direta ou indiretamente).
export type CadastroComHistorico =
  | "beneficio"
  | "oferta"
  | "campanha"
  | "item-campanha"
  | "oferta-campanha";

const sugestoes: Record<CadastroComHistorico, string> = {
  beneficio: "Altere o status para INATIVO ou DESCONTINUADO",
  oferta: "Altere o status para INATIVO",
  campanha: "Altere o status para ENCERRADA ou CANCELADA",
  "item-campanha": "Altere o status para INATIVO",
  "oferta-campanha": "Altere o status para INATIVO",
};

export function mensagemExclusaoBloqueada(cadastro: CadastroComHistorico) {
  return `Não é possível excluir: há utilizações registradas. ${sugestoes[cadastro]} para preservar o histórico`;
}

// Oferta comum e oferta de campanha usam FKs diferentes em utilizacao: nunca misturar.
export function consultaUtilizacoesVinculadas(banco: Knex, cadastro: CadastroComHistorico, id: number) {
  const consulta = banco("utilizacao");

  if (cadastro === "oferta") {
    consulta.where("utilizacao.beneficio_conveniado_id", id);
  } else if (cadastro === "beneficio") {
    consulta
      .join("beneficio_conveniado as oferta", "oferta.id", "utilizacao.beneficio_conveniado_id")
      .where("oferta.beneficio_id", id);
  } else if (cadastro === "oferta-campanha") {
    consulta.where("utilizacao.beneficio_campanha_conveniado_id", id);
  } else {
    consulta.join(
      "beneficio_campanha_conveniado as oferta_campanha",
      "oferta_campanha.id",
      "utilizacao.beneficio_campanha_conveniado_id",
    );
    if (cadastro === "item-campanha") {
      consulta.where("oferta_campanha.beneficio_campanha_id", id);
    } else {
      consulta
        .join("beneficio_campanha as item", "item.id", "oferta_campanha.beneficio_campanha_id")
        .where("item.campanha_id", id);
    }
  }

  return consulta.count({ total: "*" }).first();
}

export async function contarUtilizacoes(cadastro: CadastroComHistorico, id: number, banco: Knex = db) {
  const linha: any = await consultaUtilizacoesVinculadas(banco, cadastro, id);
  return Number(linha?.total ?? 0);
}
