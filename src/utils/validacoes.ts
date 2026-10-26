//Utilitário de validação de entrada para os cadastros

export function validarId(id: unknown): number | null {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) {
    return null;
  }
  return numero;
}

