"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HORAS_PARA_VALIDAR = void 0;
exports.cicloAtual = cicloAtual;
exports.calcularExpiracao = calcularExpiracao;
const tempo_1 = require("./tempo");
exports.HORAS_PARA_VALIDAR = 3;
const UM_DIA = 86_400_000;
function ultimoDia(ano, mes) {
    return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}
function dataDoDia(ano, mes, dia) {
    const primeiro = new Date(Date.UTC(ano, mes, 1));
    const a = primeiro.getUTCFullYear();
    const m = primeiro.getUTCMonth();
    return new Date(Date.UTC(a, m, Math.min(dia, ultimoDia(a, m))));
}
function somarMeses(data, meses) {
    const nova = dataDoDia(data.getUTCFullYear(), data.getUTCMonth() + meses, data.getUTCDate());
    nova.setUTCHours(data.getUTCHours(), data.getUTCMinutes(), data.getUTCSeconds());
    return nova;
}
function somarIntervalo(data, valor, unidade) {
    return unidade === "MES" ? somarMeses(data, valor) : new Date(data.getTime() + valor * UM_DIA);
}
function cicloCalendario(regra, momento) {
    const reset = regra.dia_reset ? (0, tempo_1.paraData)(`${regra.dia_reset.slice(0, 10)} 00:00:00`) : null;
    const ano = momento.getUTCFullYear();
    const mes = momento.getUTCMonth();
    if (regra.unidade_ciclo === "SEMANA") {
        const diaSemana = reset ? reset.getUTCDay() : 1;
        const hoje = new Date(Date.UTC(ano, mes, momento.getUTCDate()));
        const voltar = (hoje.getUTCDay() - diaSemana + 7) % 7;
        const inicio = new Date(hoje.getTime() - voltar * UM_DIA);
        return { inicio: (0, tempo_1.paraTexto)(inicio), fim: (0, tempo_1.paraTexto)(new Date(inicio.getTime() + 7 * UM_DIA)) };
    }
    if (regra.unidade_ciclo === "ANO") {
        const mesReset = reset ? reset.getUTCMonth() : 0;
        const diaReset = reset ? reset.getUTCDate() : 1;
        let inicio = dataDoDia(ano, mesReset, diaReset);
        if (inicio > momento)
            inicio = dataDoDia(ano - 1, mesReset, diaReset);
        const fim = dataDoDia(inicio.getUTCFullYear() + 1, mesReset, diaReset);
        return { inicio: (0, tempo_1.paraTexto)(inicio), fim: (0, tempo_1.paraTexto)(fim) };
    }
    const diaReset = reset ? reset.getUTCDate() : 1;
    let inicio = dataDoDia(ano, mes, diaReset);
    if (inicio > momento)
        inicio = dataDoDia(ano, mes - 1, diaReset);
    const fim = dataDoDia(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, diaReset);
    return { inicio: (0, tempo_1.paraTexto)(inicio), fim: (0, tempo_1.paraTexto)(fim) };
}
function cicloMovel(regra, momento, admissao) {
    const valor = regra.intervalo_valor ?? 1;
    const unidade = regra.intervalo_unidade ?? "DIA";
    if (regra.referencia_contagem === "DATA_ADMISSAO_COLABORADOR" && admissao) {
        let inicio = (0, tempo_1.paraData)(`${admissao.slice(0, 10)} 00:00:00`);
        if (inicio > momento)
            return { inicio: (0, tempo_1.paraTexto)(inicio), fim: null };
        let proximo = somarIntervalo(inicio, valor, unidade);
        while (proximo <= momento) {
            inicio = proximo;
            proximo = somarIntervalo(inicio, valor, unidade);
        }
        return { inicio: (0, tempo_1.paraTexto)(inicio), fim: null };
    }
    const inicio = unidade === "MES" ? somarMeses(momento, -valor) : new Date(momento.getTime() - valor * UM_DIA);
    return { inicio: (0, tempo_1.paraTexto)(inicio), fim: null };
}
function cicloAtual(regra, momento, admissao) {
    const data = (0, tempo_1.paraData)(momento);
    return regra.tipo_janela === "CALENDARIO_FIXO" ? cicloCalendario(regra, data) : cicloMovel(regra, data, admissao);
}
function calcularExpiracao(regra, solicitacao) {
    const tresHoras = (0, tempo_1.somarHoras)(solicitacao, exports.HORAS_PARA_VALIDAR);
    if (regra.tipo_janela !== "CALENDARIO_FIXO")
        return tresHoras;
    const { fim } = cicloAtual(regra, solicitacao);
    return fim && fim < tresHoras ? fim : tresHoras;
}
