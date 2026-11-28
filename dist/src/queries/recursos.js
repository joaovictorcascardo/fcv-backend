"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recursosListagem = void 0;
exports.criarBaseListagem = criarBaseListagem;
exports.listarRecurso = listarRecurso;
const listagem_1 = require("./listagem");
const enumeracao = (coluna, valores) => ({ tipo: "enum", coluna, valores });
const inteiro = (coluna) => ({ tipo: "inteiro", coluna });
const texto = (coluna) => ({ tipo: "texto", coluna });
const ativos = ["ATIVO", "INATIVO"];
const tiposBeneficio = ["PERCENTUAL", "VALOR_FIXO"];
const ordenar = (tabela, campos) => Object.fromEntries(campos.map(campo => [campo, `${tabela}.${campo}`]));
const periodo = (inicio, fim = inicio, dataHora = false) => ({
    dataInicio: { tipo: "data", coluna: inicio, operador: ">=", dataHora },
    dataFim: { tipo: "data", coluna: fim, operador: "<=", dataHora },
});
// As chaves públicas são mapeadas para colunas conhecidas: o cliente nunca envia SQL.
exports.recursosListagem = {
    perfis: {
        tabela: "perfil_acesso",
        busca: ["perfil_acesso.nome", "perfil_acesso.descricao"],
        ordenarPor: ordenar("perfil_acesso", ["id", "nome", "escopo", "status"]),
        filtros: {
            nome: texto("perfil_acesso.nome"),
            escopo: enumeracao("perfil_acesso.escopo", ["FCV", "COLABORADOR", "CONVENIADO"]),
            status: enumeracao("perfil_acesso.status", ativos),
        },
    },
    usuarios: {
        tabela: "usuario",
        colunas: ["usuario.id", "usuario.nome", "usuario.email", "usuario.perfil_id", "usuario.status", "usuario.data_criacao"],
        busca: ["usuario.nome", "usuario.email"],
        ordenarPor: ordenar("usuario", ["id", "nome", "email", "perfil_id", "status", "data_criacao"]),
        periodo: "Data de criação do usuário (inclui todo o dia final).",
        filtros: {
            perfil_id: inteiro("usuario.perfil_id"),
            nome: texto("usuario.nome"), email: texto("usuario.email"),
            status: enumeracao("usuario.status", ativos),
            ...periodo("usuario.data_criacao", undefined, true),
        },
    },
    colaboradores: {
        tabela: "colaborador",
        joins: [{ tabela: "usuario as usuario_colaborador", origem: "colaborador.usuario_id", destino: "usuario_colaborador.id" }],
        busca: ["colaborador.matricula", "colaborador.setor", "colaborador.cargo", "usuario_colaborador.nome", "usuario_colaborador.email"],
        ordenarPor: { ...ordenar("colaborador", ["id", "matricula", "setor", "cargo", "status", "data_admissao"]), nome: "usuario_colaborador.nome" },
        periodo: "Data de admissão do colaborador.",
        filtros: {
            usuario_id: inteiro("colaborador.usuario_id"),
            matricula: texto("colaborador.matricula"), setor: texto("colaborador.setor"), cargo: texto("colaborador.cargo"),
            status: enumeracao("colaborador.status", ["ATIVO", "INATIVO", "AFASTADO"]),
            ...periodo("colaborador.data_admissao"),
        },
    },
    conveniados: {
        tabela: "conveniado",
        busca: ["conveniado.nome_fantasia", "conveniado.razao_social", "conveniado.cnpj"],
        ordenarPor: ordenar("conveniado", ["id", "nome_fantasia", "razao_social", "status"]),
        filtros: {
            usuario_id: inteiro("conveniado.usuario_id"),
            cnpj: texto("conveniado.cnpj"),
            categoria_id: {
                tipo: "inteiro",
                aplicar(query, valor) {
                    query.whereExists(function () {
                        this.select(1)
                            .from("conveniado_categoria")
                            .whereRaw("conveniado_categoria.conveniado_id = conveniado.id")
                            .where("conveniado_categoria.categoria_id", valor);
                    });
                },
            },
            status: enumeracao("conveniado.status", ["ATIVO", "INATIVO", "EM_ANALISE"]),
        },
    },
    beneficios: {
        tabela: "beneficio",
        busca: ["beneficio.nome", "beneficio.descricao"],
        ordenarPor: ordenar("beneficio", ["id", "nome", "valor", "status", "tipo_beneficio"]),
        filtros: {
            nome: texto("beneficio.nome"),
            status: enumeracao("beneficio.status", ["ATIVO", "INATIVO", "DESCONTINUADO"]),
            tipo_beneficio: enumeracao("beneficio.tipo_beneficio", tiposBeneficio),
            tipo_janela: enumeracao("beneficio.tipo_janela", ["CALENDARIO_FIXO", "JANELA_MOVEL"]),
        },
    },
    ofertas: {
        tabela: "beneficio_conveniado",
        ordenarPor: ordenar("beneficio_conveniado", ["id", "beneficio_id", "conveniado_id", "status"]),
        filtros: {
            beneficio_id: inteiro("beneficio_conveniado.beneficio_id"), conveniado_id: inteiro("beneficio_conveniado.conveniado_id"),
            status: enumeracao("beneficio_conveniado.status", ativos),
        },
    },
    campanhas: {
        tabela: "campanha_evento",
        busca: ["campanha_evento.nome", "campanha_evento.descricao", "campanha_evento.patrocinador"],
        ordenarPor: ordenar("campanha_evento", ["id", "nome", "tipo", "status", "data_inicio", "data_fim"]),
        periodo: "Campanhas que se sobrepõem ao intervalo: data_fim >= dataInicio e data_inicio <= dataFim.",
        filtros: {
            nome: texto("campanha_evento.nome"), patrocinador: texto("campanha_evento.patrocinador"),
            tipo: enumeracao("campanha_evento.tipo", ["CAMPANHA", "EVENTO_INTERNO", "EVENTO_PATROCINADO", "VOUCHER", "CORTESIA"]),
            status: enumeracao("campanha_evento.status", ["PLANEJADA", "ATIVA", "ENCERRADA", "CANCELADA"]),
            ...periodo("campanha_evento.data_fim", "campanha_evento.data_inicio"),
        },
    },
    "itens-campanha": {
        tabela: "beneficio_campanha",
        busca: ["beneficio_campanha.nome", "beneficio_campanha.descricao"],
        ordenarPor: ordenar("beneficio_campanha", ["id", "nome", "valor", "campanha_id", "status"]),
        filtros: {
            campanha_id: inteiro("beneficio_campanha.campanha_id"), nome: texto("beneficio_campanha.nome"),
            tipo_beneficio: enumeracao("beneficio_campanha.tipo_beneficio", tiposBeneficio),
            status: enumeracao("beneficio_campanha.status", ativos),
        },
    },
    "ofertas-campanha": {
        tabela: "beneficio_campanha_conveniado",
        ordenarPor: ordenar("beneficio_campanha_conveniado", ["id", "beneficio_campanha_id", "conveniado_id", "status"]),
        filtros: {
            beneficio_campanha_id: inteiro("beneficio_campanha_conveniado.beneficio_campanha_id"),
            conveniado_id: inteiro("beneficio_campanha_conveniado.conveniado_id"),
            status: enumeracao("beneficio_campanha_conveniado.status", ativos),
        },
    },
    utilizacoes: {
        tabela: "utilizacao",
        joins: [
            { tabela: "beneficio_conveniado as oferta_comum", origem: "utilizacao.beneficio_conveniado_id", destino: "oferta_comum.id" },
            { tabela: "beneficio_campanha_conveniado as oferta_campanha", origem: "utilizacao.beneficio_campanha_conveniado_id", destino: "oferta_campanha.id" },
        ],
        ordenarPor: ordenar("utilizacao", ["id", "data_solicitacao", "data_validacao", "valor_aplicado", "status"]),
        periodo: "Data de solicitação da utilização (inclui todo o dia final).",
        filtros: {
            colaborador_id: inteiro("utilizacao.colaborador_id"),
            beneficio_id: inteiro("oferta_comum.beneficio_id"),
            beneficio_campanha_id: inteiro("oferta_campanha.beneficio_campanha_id"),
            beneficio_conveniado_id: inteiro("utilizacao.beneficio_conveniado_id"),
            beneficio_campanha_conveniado_id: inteiro("utilizacao.beneficio_campanha_conveniado_id"),
            status: enumeracao("utilizacao.status", ["PENDENTE", "APROVADA", "REPROVADA", "ESTORNADA", "EXPIRADA", "CANCELADA"]),
            canal_validacao: enumeracao("utilizacao.canal_validacao", ["APP_CONVENIADO", "TERMINAL_IOT"]),
            origem: {
                tipo: "enum", valores: ["COMUM", "CAMPANHA"],
                aplicar(query, valor) {
                    query.whereNotNull(valor === "COMUM" ? "utilizacao.beneficio_conveniado_id" : "utilizacao.beneficio_campanha_conveniado_id");
                },
            },
            conveniado_id: {
                tipo: "inteiro",
                aplicar(query, valor) {
                    query.where(function () { this.where("oferta_comum.conveniado_id", valor).orWhere("oferta_campanha.conveniado_id", valor); });
                },
            },
            ...periodo("utilizacao.data_solicitacao", undefined, true),
        },
    },
};
function criarBaseListagem(conexao, recurso) {
    const config = exports.recursosListagem[recurso];
    const base = conexao(config.tabela).select(config.colunas ? [...config.colunas] : [`${config.tabela}.*`]);
    for (const join of config.joins ?? [])
        base.leftJoin(join.tabela, join.origem, join.destino);
    return base;
}
function listarRecurso(conexao, recurso, consulta = {}) {
    return (0, listagem_1.listarComConsulta)(criarBaseListagem(conexao, recurso), consulta, exports.recursosListagem[recurso]);
}
