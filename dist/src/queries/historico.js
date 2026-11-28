"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configuracaoHistorico = void 0;
exports.criarBaseHistorico = criarBaseHistorico;
exports.listarHistorico = listarHistorico;
const listagem_1 = require("./listagem");
const tempo_1 = require("../utils/tempo");
exports.configuracaoHistorico = {
    ordenarPor: {
        id: "utilizacao.id",
        data_solicitacao: "utilizacao.data_solicitacao",
        data_validacao: "utilizacao.data_validacao",
        valor_aplicado: "utilizacao.valor_aplicado",
        status: "utilizacao.status",
    },
    padrao: { ordenarPor: "data_solicitacao", ordem: "desc" },
    intervalo: ["de", "ate"],
    busca: ["beneficio.nome", "beneficio.descricao", "item.nome", "item.descricao"],
    filtros: {
        status: {
            tipo: "enum",
            valores: ["PENDENTE", "APROVADA", "REPROVADA", "ESTORNADA", "EXPIRADA", "CANCELADA"],
            aplicar(query, valor) {
                const momento = (0, tempo_1.agora)();
                if (valor === "PENDENTE") {
                    query.where("utilizacao.status", "PENDENTE").where("utilizacao.data_expiracao", ">", momento);
                }
                else if (valor === "EXPIRADA") {
                    query.where(function () {
                        this.where("utilizacao.status", "EXPIRADA").orWhere(function () {
                            this.where("utilizacao.status", "PENDENTE").where("utilizacao.data_expiracao", "<=", momento);
                        });
                    });
                }
                else {
                    query.where("utilizacao.status", valor);
                }
            },
        },
        de: { tipo: "data", coluna: "utilizacao.data_solicitacao", operador: ">=", dataHora: true },
        ate: { tipo: "data", coluna: "utilizacao.data_solicitacao", operador: "<=", dataHora: true },
    },
};
function criarBaseHistorico(conexao, dono) {
    const consulta = conexao("utilizacao")
        .leftJoin("beneficio_conveniado as bc", "bc.id", "utilizacao.beneficio_conveniado_id")
        .leftJoin("beneficio", "beneficio.id", "utilizacao.beneficio_id")
        .leftJoin("beneficio_campanha_conveniado as bcc", "bcc.id", "utilizacao.beneficio_campanha_conveniado_id")
        .leftJoin("beneficio_campanha as item", "item.id", "bcc.beneficio_campanha_id")
        .leftJoin("conveniado", function () {
        this.on("conveniado.id", "=", conexao.raw("COALESCE(bc.conveniado_id, bcc.conveniado_id)"));
    })
        .join("colaborador", "colaborador.id", "utilizacao.colaborador_id")
        .join("usuario", "usuario.id", "colaborador.usuario_id")
        .select("utilizacao.id", "utilizacao.status", "utilizacao.valor_aplicado", "utilizacao.canal_validacao", "utilizacao.data_solicitacao", "utilizacao.data_expiracao", "utilizacao.data_validacao", "utilizacao.observacoes", "beneficio.id as beneficio_id", "item.id as item_campanha_id", conexao.raw("COALESCE(beneficio.nome, item.nome) as beneficio_nome"), conexao.raw("IF(beneficio.id IS NULL, 'CAMPANHA', 'BENEFICIO') as origem"), "conveniado.id as conveniado_id", "conveniado.nome_fantasia as conveniado_nome_fantasia", "conveniado.endereco as conveniado_endereco", "usuario.nome as colaborador_nome");
    // O dono vem do usuário autenticado, antes de filtrar, contar ou paginar.
    if (dono.colaborador_id !== undefined) {
        consulta.where("utilizacao.colaborador_id", dono.colaborador_id);
    }
    else {
        consulta.where("conveniado.id", dono.conveniado_id);
    }
    return consulta;
}
function listarHistorico(conexao, dono, consulta = {}) {
    return (0, listagem_1.listarComConsulta)(criarBaseHistorico(conexao, dono), consulta, exports.configuracaoHistorico);
}
