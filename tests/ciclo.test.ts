import assert from "node:assert/strict";
import test from "node:test";
import { calcularExpiracao, cicloAtual, type RegraCiclo } from "../src/utils/ciclo";

const mensal = (dia_reset: string | null = null): RegraCiclo => ({ tipo_janela: "CALENDARIO_FIXO", unidade_ciclo: "MES", dia_reset });
const anual = (dia_reset: string | null = null): RegraCiclo => ({ tipo_janela: "CALENDARIO_FIXO", unidade_ciclo: "ANO", dia_reset });
const semanal = (dia_reset: string | null = null): RegraCiclo => ({ tipo_janela: "CALENDARIO_FIXO", unidade_ciclo: "SEMANA", dia_reset });
const movel = (
  intervalo_valor: number,
  intervalo_unidade: "DIA" | "MES",
  referencia_contagem: RegraCiclo["referencia_contagem"] = "ULTIMA_UTILIZACAO",
): RegraCiclo => ({ tipo_janela: "JANELA_MOVEL", intervalo_valor, intervalo_unidade, referencia_contagem });

test("regra geral: expira 3 horas depois da solicitação", () => {
  assert.equal(calcularExpiracao(mensal(), "2026-11-18 10:00:00"), "2026-11-18 13:00:00");
});

test("exemplo do PDF: renova na virada do dia 10 para o 11 e solicita às 23h do dia 10", () => {
  assert.equal(calcularExpiracao(mensal("2026-01-11"), "2026-11-10 23:00:00"), "2026-11-11 00:00:00");
});

test("sem dia_reset o ciclo mensal vira no dia 1", () => {
  assert.equal(calcularExpiracao(mensal(), "2026-11-30 22:00:00"), "2026-12-01 00:00:00");
  assert.deepEqual(cicloAtual(mensal(), "2026-11-18 10:00:00"), { inicio: "2026-11-01 00:00:00", fim: "2026-12-01 00:00:00" });
});

test("dia_reset 31 vira no último dia dos meses curtos", () => {
  assert.deepEqual(cicloAtual(mensal("2026-01-31"), "2026-02-15 10:00:00"), { inicio: "2026-01-31 00:00:00", fim: "2026-02-28 00:00:00" });
  assert.equal(calcularExpiracao(mensal("2026-01-31"), "2026-02-27 22:30:00"), "2026-02-28 00:00:00");
  assert.deepEqual(cicloAtual(mensal("2026-01-31"), "2028-02-29 10:00:00"), { inicio: "2028-02-29 00:00:00", fim: "2028-03-31 00:00:00" });
});

test("ciclo anual vira em 1º de janeiro e respeita a virada do ano", () => {
  assert.equal(calcularExpiracao(anual(), "2026-12-31 23:30:00"), "2027-01-01 00:00:00");
  assert.deepEqual(cicloAtual(anual("2026-03-15"), "2026-02-01 10:00:00"), { inicio: "2025-03-15 00:00:00", fim: "2026-03-15 00:00:00" });
});

test("ciclo semanal vira na segunda ou no dia da semana do dia_reset", () => {
  assert.deepEqual(cicloAtual(semanal(), "2026-11-18 10:00:00"), { inicio: "2026-11-16 00:00:00", fim: "2026-11-23 00:00:00" });
  assert.equal(calcularExpiracao(semanal(), "2026-11-22 22:00:00"), "2026-11-23 00:00:00");
  assert.deepEqual(cicloAtual(semanal("2026-11-20"), "2026-11-18 10:00:00"), { inicio: "2026-11-13 00:00:00", fim: "2026-11-20 00:00:00" });
});

test("solicitação exatamente na virada já está no ciclo novo", () => {
  assert.equal(calcularExpiracao(mensal(), "2026-12-01 00:00:00"), "2026-12-01 03:00:00");
});

test("janela móvel vale só a regra das 3 horas", () => {
  assert.equal(calcularExpiracao(movel(30, "DIA"), "2026-11-30 23:00:00"), "2026-12-01 02:00:00");
  assert.deepEqual(cicloAtual(movel(30, "DIA"), "2026-11-30 10:00:00"), { inicio: "2026-10-31 10:00:00", fim: null });
  assert.deepEqual(cicloAtual(movel(1, "MES"), "2026-03-31 10:00:00"), { inicio: "2026-02-28 10:00:00", fim: null });
});

test("janela móvel pela data de admissão conta em períodos a partir dela", () => {
  const regra = movel(1, "MES", "DATA_ADMISSAO_COLABORADOR");
  assert.deepEqual(cicloAtual(regra, "2026-11-18 10:00:00", "2025-06-20"), { inicio: "2026-10-20 00:00:00", fim: null });
});
