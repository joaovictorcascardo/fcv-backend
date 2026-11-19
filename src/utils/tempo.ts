const FUSO = "America/Sao_Paulo";

const formatador = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function agora(instante: Date = new Date()): string {
  const partes = Object.fromEntries(formatador.formatToParts(instante).map((p) => [p.type, p.value]));
  return `${partes.year}-${partes.month}-${partes.day} ${partes.hour}:${partes.minute}:${partes.second}`;
}

export function paraData(texto: string): Date {
  return new Date(`${texto.slice(0, 19).replace(" ", "T")}Z`);
}

export function paraTexto(data: Date): string {
  return data.toISOString().slice(0, 19).replace("T", " ");
}

export function somarHoras(texto: string, horas: number): string {
  return paraTexto(new Date(paraData(texto).getTime() + horas * 3600_000));
}

export function mesesAtras(texto: string, meses: number): string {
  const data = paraData(texto);
  const dia = data.getUTCDate();
  data.setUTCDate(1);
  data.setUTCMonth(data.getUTCMonth() - meses);
  const ultimo = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).getUTCDate();
  data.setUTCDate(Math.min(dia, ultimo));
  return paraTexto(data);
}

export function segundosEntre(inicio: string, fim: string): number {
  return Math.round((paraData(fim).getTime() - paraData(inicio).getTime()) / 1000);
}
