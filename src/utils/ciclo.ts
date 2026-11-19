import { paraData, paraTexto, somarHoras } from "./tempo";

export const HORAS_PARA_VALIDAR = 3;

export type RegraCiclo = {
  tipo_janela: "CALENDARIO_FIXO" | "JANELA_MOVEL";
  unidade_ciclo?: "ANO" | "MES" | "SEMANA" | null;
  dia_reset?: string | null;
  intervalo_valor?: number | null;
  intervalo_unidade?: "DIA" | "MES" | null;
  referencia_contagem?: "ULTIMA_UTILIZACAO" | "DATA_ADMISSAO_COLABORADOR" | null;
};

export type Ciclo = { inicio: string; fim: string | null };

const UM_DIA = 86_400_000;

function ultimoDia(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

function dataDoDia(ano: number, mes: number, dia: number) {
  const primeiro = new Date(Date.UTC(ano, mes, 1));
  const a = primeiro.getUTCFullYear();
  const m = primeiro.getUTCMonth();
  return new Date(Date.UTC(a, m, Math.min(dia, ultimoDia(a, m))));
}

function somarMeses(data: Date, meses: number) {
  const nova = dataDoDia(data.getUTCFullYear(), data.getUTCMonth() + meses, data.getUTCDate());
  nova.setUTCHours(data.getUTCHours(), data.getUTCMinutes(), data.getUTCSeconds());
  return nova;
}

function somarIntervalo(data: Date, valor: number, unidade: "DIA" | "MES") {
  return unidade === "MES" ? somarMeses(data, valor) : new Date(data.getTime() + valor * UM_DIA);
}

function cicloCalendario(regra: RegraCiclo, momento: Date): Ciclo {
  const reset = regra.dia_reset ? paraData(`${regra.dia_reset.slice(0, 10)} 00:00:00`) : null;
  const ano = momento.getUTCFullYear();
  const mes = momento.getUTCMonth();

  if (regra.unidade_ciclo === "SEMANA") {
    const diaSemana = reset ? reset.getUTCDay() : 1;
    const hoje = new Date(Date.UTC(ano, mes, momento.getUTCDate()));
    const voltar = (hoje.getUTCDay() - diaSemana + 7) % 7;
    const inicio = new Date(hoje.getTime() - voltar * UM_DIA);
    return { inicio: paraTexto(inicio), fim: paraTexto(new Date(inicio.getTime() + 7 * UM_DIA)) };
  }

  if (regra.unidade_ciclo === "ANO") {
    const mesReset = reset ? reset.getUTCMonth() : 0;
    const diaReset = reset ? reset.getUTCDate() : 1;
    let inicio = dataDoDia(ano, mesReset, diaReset);
    if (inicio > momento) inicio = dataDoDia(ano - 1, mesReset, diaReset);
    const fim = dataDoDia(inicio.getUTCFullYear() + 1, mesReset, diaReset);
    return { inicio: paraTexto(inicio), fim: paraTexto(fim) };
  }

  const diaReset = reset ? reset.getUTCDate() : 1;
  let inicio = dataDoDia(ano, mes, diaReset);
  if (inicio > momento) inicio = dataDoDia(ano, mes - 1, diaReset);
  const fim = dataDoDia(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, diaReset);
  return { inicio: paraTexto(inicio), fim: paraTexto(fim) };
}

function cicloMovel(regra: RegraCiclo, momento: Date, admissao?: string | null): Ciclo {
  const valor = regra.intervalo_valor ?? 1;
  const unidade = regra.intervalo_unidade ?? "DIA";

  if (regra.referencia_contagem === "DATA_ADMISSAO_COLABORADOR" && admissao) {
    let inicio = paraData(`${admissao.slice(0, 10)} 00:00:00`);
    if (inicio > momento) return { inicio: paraTexto(inicio), fim: null };
    let proximo = somarIntervalo(inicio, valor, unidade);
    while (proximo <= momento) {
      inicio = proximo;
      proximo = somarIntervalo(inicio, valor, unidade);
    }
    return { inicio: paraTexto(inicio), fim: null };
  }

  const inicio = unidade === "MES" ? somarMeses(momento, -valor) : new Date(momento.getTime() - valor * UM_DIA);
  return { inicio: paraTexto(inicio), fim: null };
}

export function cicloAtual(regra: RegraCiclo, momento: string, admissao?: string | null): Ciclo {
  const data = paraData(momento);
  return regra.tipo_janela === "CALENDARIO_FIXO" ? cicloCalendario(regra, data) : cicloMovel(regra, data, admissao);
}

export function calcularExpiracao(regra: RegraCiclo, solicitacao: string): string {
  const tresHoras = somarHoras(solicitacao, HORAS_PARA_VALIDAR);
  if (regra.tipo_janela !== "CALENDARIO_FIXO") return tresHoras;
  const { fim } = cicloAtual(regra, solicitacao);
  return fim && fim < tresHoras ? fim : tresHoras;
}
