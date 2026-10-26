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

export function validarStatusColaborador(status: unknown) {
  if (status === undefined) return {};
  if (!STATUS_COLABORADOR_VALIDOS.includes(status as any)) {
    return { erro: "Status inválido. Opções permitidas: ATIVO, INATIVO, AFASTADO", status: 400 };
  }
  return { valor: status };
}

export function validarTelefone(telefone: unknown) {
  if (telefone === undefined || telefone === null || telefone === "") return { valor: null };
  if (typeof telefone !== "string") {
    return { erro: "Telefone inválido", status: 400 };
  }
  const limpo = telefone.trim();
  if (limpo.length > 20) {
    return { erro: "O telefone não pode ter mais de 20 caracteres", status: 400 };
  }
  return { valor: limpo };
}


// Validações dos Conveniados
export const STATUS_CONVENIADO_VALIDOS = ["ATIVO", "INATIVO", "EM_ANALISE"] as const;

export function validarNomeFantasia(nome: unknown) {
  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return { erro: "Informe o nome fantasia do conveniado", status: 400 };
  }
  const limpo = nome.trim();
  if (limpo.length > 150) {
    return { erro: "O nome fantasia não pode ter mais de 150 caracteres", status: 400 };
  }
  return { valor: limpo };
}

export function validarRazaoSocial(razao: unknown) {
  if (!razao || typeof razao !== "string" || !razao.trim()) {
    return { erro: "Informe a razão social do conveniado", status: 400 };
  }
  const limpo = razao.trim();
  if (limpo.length > 150) {
    return { erro: "A razão social não pode ter mais de 150 caracteres", status: 400 };
  }
  return { valor: limpo };
}

export function validarCategoria(categoria: unknown) {
  if (!categoria || typeof categoria !== "string" || !categoria.trim()) {
    return { erro: "Informe a categoria do conveniado", status: 400 };
  }
  const limpo = categoria.trim();
  if (limpo.length > 60) {
    return { erro: "A categoria não pode ter mais de 60 caracteres", status: 400 };
  }
  return { valor: limpo };
}

export function validarCNPJConveniado(cnpj: unknown) {
  if (!cnpj || typeof cnpj !== "string" || !cnpj.trim()) {
    return { erro: "Informe o CNPJ do conveniado", status: 400 };
  }
  const apenasDigitos = cnpj.replace(/\D/g, "");
  if (apenasDigitos.length !== 14) {
    return { erro: "CNPJ inválido. Informe exatamente 14 dígitos", status: 400 };
  }
  return { valor: apenasDigitos };
}

export function validarEndereco(endereco: unknown) {
  if (!endereco || typeof endereco !== "string" || !endereco.trim()) {
    return { erro: "Informe o endereço do conveniado", status: 400 };
  }
  const limpo = endereco.trim();
  if (limpo.length > 255) {
    return { erro: "O endereço não pode ter mais de 255 caracteres", status: 400 };
  }
  return { valor: limpo };
}

export function validarStatusConveniado(status: unknown) {
  if (status === undefined) return {};
  if (!STATUS_CONVENIADO_VALIDOS.includes(status as any)) {
    return { erro: "Status inválido. Opções permitidas: ATIVO, INATIVO, EM_ANALISE", status: 400 };
  }
  return { valor: status };
}
