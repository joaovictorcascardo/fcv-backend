import { randomInt } from "crypto";

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function gerarCodigoValidacao(): string {
  let codigo = "";
  for (let i = 0; i < 6; i++) codigo += LETRAS[randomInt(LETRAS.length)];
  return codigo;
}

export function normalizarCodigo(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  const limpo = texto.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(limpo)) return limpo.toLowerCase();
  const codigo = limpo.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z0-9]{6}$/.test(codigo) ? codigo : limpo.length > 0 && limpo.length <= 64 ? limpo : null;
}
