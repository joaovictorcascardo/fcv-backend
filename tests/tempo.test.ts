import assert from "node:assert/strict";
import test from "node:test";
import { agora, mesesAtras, segundosEntre, somarHoras } from "../src/utils/tempo";

test("agora usa o horário de Brasília", () => {
  assert.equal(agora(new Date("2026-11-18T15:30:00Z")), "2026-11-18 12:30:00");
  assert.equal(agora(new Date("2026-01-01T02:00:00Z")), "2025-12-31 23:00:00");
});

test("somarHoras atravessa dia, mês e ano", () => {
  assert.equal(somarHoras("2026-11-10 23:00:00", 3), "2026-11-11 02:00:00");
  assert.equal(somarHoras("2026-12-31 22:30:00", 3), "2027-01-01 01:30:00");
});

test("mesesAtras respeita o tamanho do mês", () => {
  assert.equal(mesesAtras("2026-11-18 10:00:00", 6), "2026-05-18 10:00:00");
  assert.equal(mesesAtras("2026-08-31 10:00:00", 6), "2026-02-28 10:00:00");
});

test("segundosEntre conta a diferença", () => {
  assert.equal(segundosEntre("2026-11-18 10:00:00", "2026-11-18 13:00:00"), 10800);
  assert.equal(segundosEntre("2026-11-18 13:00:00", "2026-11-18 10:00:00"), -10800);
});
