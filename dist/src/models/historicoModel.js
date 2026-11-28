"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mensagemExclusaoBloqueada = mensagemExclusaoBloqueada;
exports.consultaUtilizacoesVinculadas = consultaUtilizacoesVinculadas;
exports.contarUtilizacoes = contarUtilizacoes;
const db_1 = __importDefault(require("../database/db"));
const sugestoes = {
    beneficio: "Altere o status para INATIVO ou DESCONTINUADO",
    oferta: "Altere o status para INATIVO",
    campanha: "Altere o status para ENCERRADA ou CANCELADA",
    "item-campanha": "Altere o status para INATIVO",
    "oferta-campanha": "Altere o status para INATIVO",
};
function mensagemExclusaoBloqueada(cadastro) {
    return `Não é possível excluir: há utilizações registradas. ${sugestoes[cadastro]} para preservar o histórico`;
}
// Oferta comum e oferta de campanha usam FKs diferentes em utilizacao: nunca misturar.
function consultaUtilizacoesVinculadas(banco, cadastro, id) {
    const consulta = banco("utilizacao");
    if (cadastro === "oferta") {
        consulta.where("utilizacao.beneficio_conveniado_id", id);
    }
    else if (cadastro === "beneficio") {
        consulta
            .join("beneficio_conveniado as oferta", "oferta.id", "utilizacao.beneficio_conveniado_id")
            .where("oferta.beneficio_id", id);
    }
    else if (cadastro === "oferta-campanha") {
        consulta.where("utilizacao.beneficio_campanha_conveniado_id", id);
    }
    else {
        consulta.join("beneficio_campanha_conveniado as oferta_campanha", "oferta_campanha.id", "utilizacao.beneficio_campanha_conveniado_id");
        if (cadastro === "item-campanha") {
            consulta.where("oferta_campanha.beneficio_campanha_id", id);
        }
        else {
            consulta
                .join("beneficio_campanha as item", "item.id", "oferta_campanha.beneficio_campanha_id")
                .where("item.campanha_id", id);
        }
    }
    return consulta.count({ total: "*" }).first();
}
async function contarUtilizacoes(cadastro, id, banco = db_1.default) {
    const linha = await consultaUtilizacoesVinculadas(banco, cadastro, id);
    return Number(linha?.total ?? 0);
}
