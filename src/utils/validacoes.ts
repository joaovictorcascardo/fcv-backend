//Utilitário de validação de entrada para os cadastros
const ESCOPOS_VALIDOS = ["FCV", "COLABORADOR", "CONVENIADO"] as const;
const STATUS_VALIDOS = ["ATIVO", "INATIVO"] as const;
export const STATUS_USUARIO_VALIDOS = ["ATIVO", "INATIVO"] as const;
export const STATUS_COLABORADOR_VALIDOS = ["ATIVO", "INATIVO", "AFASTADO"] as const;

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

//Validações dos Usários

export function validarNomeUsuario(nome: unknown) {
  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return { erro: "Informe o nome do usuário", status: 400 };
  }
  const formatado = nome.trim();
  if (formatado.length > 150) {
    return { erro: "O nome do usuário não pode ter mais de 150 caracteres", status: 400 };
  }
  return { valor: formatado };
}

export function validarEmailUsuario(email: unknown) {
  if (!email || typeof email !== "string" || !email.trim()) {
    return { erro: "Informe o e-mail do usuário", status: 400 };
  }
  const limpo = email.trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(limpo) || limpo.length > 150) {
    return { erro: "Formato de e-mail inválido", status: 400 };
  }
  return { valor: limpo };
}

export function validarSenha(senha: unknown) {
  if (!senha || typeof senha !== "string" || !senha.trim()) {
    return { erro: "A senha não pode ser vazia", status: 400 };
  }
  if (senha.length < 6) {
    return { erro: "A senha deve ter no mínimo 6 caracteres", status: 400 };
  }
  return { valor: senha };
}

export function validarStatusUsuario(status: unknown) {
  if (status === undefined) return {};
  if (!STATUS_USUARIO_VALIDOS.includes(status as any)) {
    return { erro: "Status inválido. Opções permitidas: ATIVO, INATIVO", status: 400 };
  }
  return { valor: status };
}

// Validações dos Colaboradores
export function validarMatricula(matricula: unknown) {
  if (!matricula || typeof matricula !== "string" || !matricula.trim()) {
    return { erro: "Informe a matrícula do colaborador", status: 400 };
  }
  const limpo = matricula.trim();
  if (limpo.length > 30) {
    return { erro: "A matrícula não pode ter mais de 30 caracteres", status: 400 };
  }
  return { valor: limpo };
}

export function validarSetor(setor: unknown) {
  if (!setor || typeof setor !== "string" || !setor.trim()) {
    return { erro: "Informe o setor do colaborador", status: 400 };
  }
  const limpo = setor.trim();
  if (limpo.length > 100) {
    return { erro: "O setor não pode ter mais de 100 caracteres", status: 400 };
  }
  return { valor: limpo };
}

export function validarCargo(cargo: unknown) {
  if (!cargo || typeof cargo !== "string" || !cargo.trim()) {
    return { erro: "Informe o cargo do colaborador", status: 400 };
  }
  const limpo = cargo.trim();
  if (limpo.length > 100) {
    return { erro: "O cargo não pode ter mais de 100 caracteres", status: 400 };
  }
  return { valor: limpo };
}

export function validarDataAdmissao(data: unknown) {
  if (!data || typeof data !== "string" || !data.trim()) {
    return { erro: "Informe a data de admissão no formato AAAA-MM-DD", status: 400 };
  }
  const limpo = data.trim();
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(limpo)) {
    return { erro: "Data de admissão inválida. Use o formato AAAA-MM-DD", status: 400 };
  }
  const d = new Date(limpo + "T00:00:00Z");
  if (isNaN(d.getTime())) {
    return { erro: "Data de admissão inválida no calendário", status: 400 };
  }
  return { valor: limpo };
}
