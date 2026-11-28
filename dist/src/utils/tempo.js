"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agora = agora;
exports.paraData = paraData;
exports.paraTexto = paraTexto;
exports.somarHoras = somarHoras;
exports.mesesAtras = mesesAtras;
exports.segundosEntre = segundosEntre;
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
function agora(instante = new Date()) {
    const partes = Object.fromEntries(formatador.formatToParts(instante).map((p) => [p.type, p.value]));
    return `${partes.year}-${partes.month}-${partes.day} ${partes.hour}:${partes.minute}:${partes.second}`;
}
function paraData(texto) {
    return new Date(`${texto.slice(0, 19).replace(" ", "T")}Z`);
}
function paraTexto(data) {
    return data.toISOString().slice(0, 19).replace("T", " ");
}
function somarHoras(texto, horas) {
    return paraTexto(new Date(paraData(texto).getTime() + horas * 3600_000));
}
function mesesAtras(texto, meses) {
    const data = paraData(texto);
    const dia = data.getUTCDate();
    data.setUTCDate(1);
    data.setUTCMonth(data.getUTCMonth() - meses);
    const ultimo = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).getUTCDate();
    data.setUTCDate(Math.min(dia, ultimo));
    return paraTexto(data);
}
function segundosEntre(inicio, fim) {
    return Math.round((paraData(fim).getTime() - paraData(inicio).getTime()) / 1000);
}
