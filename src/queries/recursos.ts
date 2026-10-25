import type { Knex } from "knex";
import { listarComConsulta, type ConfiguracaoListagem, type FiltroListagem } from "./listagem";

type RecursoListagem = ConfiguracaoListagem & {
  tabela: string;
  colunas?: readonly string[];
  joins?: readonly { tabela: string; origem: string; destino: string }[];
  periodo?: string;
};

const enumeracao = (coluna: string, valores: readonly string[]): FiltroListagem => ({ tipo: "enum", coluna, valores });
const inteiro = (coluna: string): FiltroListagem => ({ tipo: "inteiro", coluna });
const texto = (coluna: string): FiltroListagem => ({ tipo: "texto", coluna });
const ativos = ["ATIVO", "INATIVO"] as const;
const tiposBeneficio = ["PERCENTUAL", "VALOR_FIXO"] as const;
const ordenar = (tabela: string, campos: readonly string[]) => Object.fromEntries(campos.map(campo => [campo, `${tabela}.${campo}`]));
const periodo = (inicio: string, fim = inicio, dataHora = false): Record<string, FiltroListagem> => ({
  dataInicio: { tipo: "data", coluna: inicio, operador: ">=", dataHora },
  dataFim: { tipo: "data", coluna: fim, operador: "<=", dataHora },
});

// As chaves públicas são mapeadas para colunas conhecidas: o cliente nunca envia SQL.
export const recursosListagem = {
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
    busca: ["conveniado.nome_fantasia", "conveniado.razao_social", "conveniado.cnpj", "conveniado.categoria"],
    ordenarPor: ordenar("conveniado", ["id", "nome_fantasia", "razao_social", "categoria", "status"]),
    filtros: {
      usuario_id: inteiro("conveniado.usuario_id"), categoria: texto("conveniado.categoria"), cnpj: texto("conveniado.cnpj"),
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
    ordenarPor: ordenar("utilizacao", ["id", "data_solicitacao", "data_confirmacao", "valor_aplicado", "status"]),
    periodo: "Data de solicitação da utilização (inclui todo o dia final).",
    filtros: {
      colaborador_id: inteiro("utilizacao.colaborador_id"),
      beneficio_conveniado_id: inteiro("utilizacao.beneficio_conveniado_id"),
      beneficio_campanha_conveniado_id: inteiro("utilizacao.beneficio_campanha_conveniado_id"),
      status: enumeracao("utilizacao.status", ["PENDENTE", "APROVADA", "REPROVADA", "ESTORNADA"]),
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
} satisfies Record<string, RecursoListagem>;

export type NomeRecursoListagem = keyof typeof recursosListagem;

export function criarBaseListagem(conexao: Knex, recurso: NomeRecursoListagem): Knex.QueryBuilder {
  const config: RecursoListagem = recursosListagem[recurso];
  const base = conexao(config.tabela).select(config.colunas ? [...config.colunas] : [`${config.tabela}.*`]);
  for (const join of config.joins ?? []) base.leftJoin(join.tabela, join.origem, join.destino);
  return base;
}

export function listarRecurso(conexao: Knex, recurso: NomeRecursoListagem, consulta: unknown = {}) {
  return listarComConsulta(criarBaseListagem(conexao, recurso), consulta, recursosListagem[recurso]);
}
