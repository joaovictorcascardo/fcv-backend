import type { Knex } from "knex";

export type FiltroListagem = {
  tipo: "texto" | "inteiro" | "enum" | "data";
  coluna?: string;
  valores?: readonly string[];
  operador?: "=" | ">=" | "<=";
  dataHora?: boolean;
  aplicar?: (query: Knex.QueryBuilder, valor: string | number) => void;
};

export type ConfiguracaoListagem = {
  busca?: readonly string[];
  ordenarPor: Readonly<Record<string, string>>;
  filtros?: Readonly<Record<string, FiltroListagem>>;
};

export class ConsultaInvalida extends Error {
  readonly status = 400;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ConsultaInvalida";
  }
}

type FiltroInterpretado = {
  configuracao: FiltroListagem;
  valor: string | number;
};

export type ConsultaListagem = {
  paginada: boolean;
  pagina: number;
  limite: number;
  deslocamento: number;
  busca?: string;
  ordenarPor: string;
  ordem: "asc" | "desc";
  filtros: FiltroInterpretado[];
};

export type RespostaPaginada<T = Record<string, unknown>> = {
  dados: T[];
  paginacao: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
};

const tem = (objeto: object, chave: string) =>
  Object.prototype.hasOwnProperty.call(objeto, chave);

function inteiroPositivo(valor: string, nome: string): number {
  if (!/^[1-9]\d*$/.test(valor)) {
    throw new ConsultaInvalida(`${nome} deve ser um inteiro positivo`);
  }
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero)) {
    throw new ConsultaInvalida(`${nome} está fora do intervalo permitido`);
  }
  return numero;
}

function validarData(valor: string, nome: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ConsultaInvalida(`${nome} deve usar o formato YYYY-MM-DD`);
  }
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (ano < 1000 || ano > 9999 || data.toISOString().slice(0, 10) !== valor) {
    throw new ConsultaInvalida(`${nome} deve ser uma data válida`);
  }
  return valor;
}

export function analisarConsulta(
  consulta: unknown,
  configuracao: ConfiguracaoListagem,
): ConsultaListagem {
  if (consulta === undefined) consulta = {};
  if (consulta === null || typeof consulta !== "object" || Array.isArray(consulta)) {
    throw new ConsultaInvalida("Os parâmetros da consulta devem ser um objeto");
  }

  const permitidos = new Set([
    "pagina", "limite", "ordenarPor", "ordem",
    ...(configuracao.busca?.length ? ["busca"] : []),
    ...Object.keys(configuracao.filtros ?? {}),
  ]);
  const parametros: Record<string, string> = Object.create(null);
  for (const [chave, valor] of Object.entries(consulta)) {
    if (!permitidos.has(chave)) {
      throw new ConsultaInvalida(`Parâmetro de consulta não permitido: ${chave}`);
    }
    if (typeof valor !== "string" || valor.trim() === "") {
      throw new ConsultaInvalida(`${chave} deve ser informado uma única vez, como texto não vazio`);
    }
    parametros[chave] = valor.trim();
  }

  const paginada = tem(parametros, "pagina") || tem(parametros, "limite");
  const pagina = tem(parametros, "pagina") ? inteiroPositivo(parametros.pagina, "pagina") : 1;
  const limite = tem(parametros, "limite") ? inteiroPositivo(parametros.limite, "limite") : 20;
  if (limite > 100) throw new ConsultaInvalida("limite deve estar entre 1 e 100");
  const deslocamento = (pagina - 1) * limite;
  if (!Number.isSafeInteger(deslocamento)) {
    throw new ConsultaInvalida("A página solicitada está fora do intervalo permitido");
  }

  const ordenarPor = parametros.ordenarPor ?? "id";
  if (!tem(configuracao.ordenarPor, ordenarPor)) {
    throw new ConsultaInvalida("ordenarPor não é um campo permitido neste recurso");
  }
  const ordem = parametros.ordem ?? "asc";
  if (ordem !== "asc" && ordem !== "desc") {
    throw new ConsultaInvalida("ordem deve ser asc ou desc");
  }
  if (parametros.busca && parametros.busca.length > 150) {
    throw new ConsultaInvalida("busca deve ter no máximo 150 caracteres");
  }

  const filtros: FiltroInterpretado[] = [];
  for (const [nome, filtro] of Object.entries(configuracao.filtros ?? {})) {
    if (!tem(parametros, nome)) continue;
    const texto = parametros[nome];
    let valor: string | number = texto;
    if (filtro.tipo === "inteiro") valor = inteiroPositivo(texto, nome);
    if (filtro.tipo === "enum" && !filtro.valores?.includes(texto)) {
      throw new ConsultaInvalida(`${nome} deve ser uma das opções permitidas`);
    }
    if (filtro.tipo === "data") valor = validarData(texto, nome);
    if (filtro.tipo === "texto" && texto.length > 150) {
      throw new ConsultaInvalida(`${nome} deve ter no máximo 150 caracteres`);
    }
    filtros.push({ configuracao: filtro, valor });
  }
  if (tem(parametros, "dataInicio") && tem(parametros, "dataFim") &&
      parametros.dataInicio > parametros.dataFim) {
    throw new ConsultaInvalida("dataInicio não pode ser posterior a dataFim");
  }

  return { paginada, pagina, limite, deslocamento, busca: parametros.busca, ordenarPor, ordem, filtros };
}

function aplicarFiltro(query: Knex.QueryBuilder, { configuracao, valor }: FiltroInterpretado) {
  if (configuracao.aplicar) {
    configuracao.aplicar(query, valor);
    return;
  }
  if (!configuracao.coluna) throw new Error("Filtro configurado sem coluna ou aplicador");

  const operador = configuracao.operador ?? "=";
  if (configuracao.tipo === "data" && configuracao.dataHora) {
    const dia = String(valor);
    if (operador === "<=") {
      if (dia === "9999-12-31") {
        query.where(configuracao.coluna, "<=", "9999-12-31 23:59:59.999999");
      } else {
        const proximoDia = new Date(`${dia}T00:00:00.000Z`);
        proximoDia.setUTCDate(proximoDia.getUTCDate() + 1);
        query.where(configuracao.coluna, "<", `${proximoDia.toISOString().slice(0, 10)} 00:00:00`);
      }
      return;
    }
    query.where(configuracao.coluna, operador, `${dia} 00:00:00`);
    return;
  }
  query.where(configuracao.coluna, operador, valor);
}

export async function listarComConsulta<T = Record<string, unknown>>(
  base: Knex.QueryBuilder,
  consulta: unknown,
  configuracao: ConfiguracaoListagem,
): Promise<T[] | RespostaPaginada<T>> {
  const parametros = analisarConsulta(consulta, configuracao);
  const filtrada = base.clone();

  for (const filtro of parametros.filtros) aplicarFiltro(filtrada, filtro);
  if (parametros.busca && configuracao.busca?.length) {
    const literal = `%${parametros.busca.replace(/!/g, "!!").replace(/[%_]/g, "!$&")}%`;
    filtrada.where(function () {
      for (const [indice, coluna] of configuracao.busca!.entries()) {
        if (indice === 0) this.whereRaw("?? LIKE ? ESCAPE '!'", [coluna, literal]);
        else this.orWhereRaw("?? LIKE ? ESCAPE '!'", [coluna, literal]);
      }
    });
  }

  const dados = filtrada.clone().clearOrder()
    .orderBy(configuracao.ordenarPor[parametros.ordenarPor], parametros.ordem);
  if (configuracao.ordenarPor[parametros.ordenarPor] !== configuracao.ordenarPor.id) {
    dados.orderBy(configuracao.ordenarPor.id, "asc");
  }
  if (!parametros.paginada) return await dados;

  // Both queries retain the same authorized scope and grouped filters.
  const contagem = filtrada.clone().clearSelect().clearOrder().clear("limit").clear("offset")
    .count({ total: "*" }).first();
  const [registros, contagemTotal] = await Promise.all([
    dados.limit(parametros.limite).offset(parametros.deslocamento), contagem,
  ]);
  const total = Number(contagemTotal?.total ?? 0);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error("Contagem de registros fora do intervalo suportado");
  }
  return {
    dados: registros,
    paginacao: {
      pagina: parametros.pagina,
      limite: parametros.limite,
      total,
      totalPaginas: Math.ceil(total / parametros.limite),
    },
  };
}
