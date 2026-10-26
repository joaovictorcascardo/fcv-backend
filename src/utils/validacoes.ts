//Utilitário de validação de entrada para os cadastros
const ESCOPOS_VALIDOS = ["FCV", "COLABORADOR", "CONVENIADO"] as const;
const STATUS_VALIDOS = ["ATIVO", "INATIVO"] as const;

export function validarId(id: unknown): number | null {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) {
    return null;
  }
  return numero;
}

export function validarNomePerfil(nome: unknown) {
  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return { erro: "Informe o nome do perfil", status: 400 };
  }
  const formatado = nome.trim();
  if (formatado.length > 50) {
    return { erro: "O nome do perfil não pode ter mais de 50 caracteres", status: 400 };
  }
  return { valor: formatado };
}

export function validarEscopo(escopo: unknown) {
  if (escopo === undefined) return {};
  if (!ESCOPOS_VALIDOS.includes(escopo as any)) {
    return { erro: "Escopo inválido. Opções permitidas: FCV, COLABORADOR, CONVENIADO", status: 400 };
  }
  return { valor: escopo };
}

export function validarStatusPerfil(status: unknown) {
  if (status === undefined) return {};
  if (!STATUS_VALIDOS.includes(status as any)) {
    return { erro: "Status inválido. Opções permitidas: ATIVO, INATIVO", status: 400 };
  }
  return { valor: status };
}

export function validarEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validarCNPJ(cnpj: unknown): boolean {
  if (typeof cnpj !== "string") return false;
  return cnpj.replace(/\D/g, "").length === 14;
}

