"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_CATEGORIA_VALIDOS = exports.STATUS_CONVENIADO_VALIDOS = exports.STATUS_COLABORADOR_VALIDOS = exports.STATUS_USUARIO_VALIDOS = void 0;
exports.validarId = validarId;
exports.validarNomePerfil = validarNomePerfil;
exports.validarDescricaoPerfil = validarDescricaoPerfil;
exports.validarPermissoesPerfil = validarPermissoesPerfil;
exports.validarEscopo = validarEscopo;
exports.validarStatusPerfil = validarStatusPerfil;
exports.validarEmail = validarEmail;
exports.validarCNPJ = validarCNPJ;
exports.validarNomeUsuario = validarNomeUsuario;
exports.validarEmailUsuario = validarEmailUsuario;
exports.validarSenha = validarSenha;
exports.validarStatusUsuario = validarStatusUsuario;
exports.validarMatricula = validarMatricula;
exports.validarSetor = validarSetor;
exports.validarCargo = validarCargo;
exports.validarDataAdmissao = validarDataAdmissao;
exports.validarStatusColaborador = validarStatusColaborador;
exports.validarTelefone = validarTelefone;
exports.validarNomeFantasia = validarNomeFantasia;
exports.validarRazaoSocial = validarRazaoSocial;
exports.validarNomeCategoria = validarNomeCategoria;
exports.validarStatusCategoria = validarStatusCategoria;
exports.validarCategorias = validarCategorias;
exports.validarCNPJConveniado = validarCNPJConveniado;
exports.validarEndereco = validarEndereco;
exports.validarStatusConveniado = validarStatusConveniado;
//Utilitário de validação de entrada para os cadastros
const ESCOPOS_VALIDOS = ["FCV", "COLABORADOR", "CONVENIADO"];
const STATUS_VALIDOS = ["ATIVO", "INATIVO"];
exports.STATUS_USUARIO_VALIDOS = ["ATIVO", "INATIVO"];
exports.STATUS_COLABORADOR_VALIDOS = ["ATIVO", "INATIVO", "AFASTADO"];
function validarId(id) {
    if (typeof id !== "number" && (typeof id !== "string" || !/^\d+$/.test(id.trim()))) {
        return null;
    }
    const numero = Number(id);
    if (!Number.isSafeInteger(numero) || numero <= 0) {
        return null;
    }
    return numero;
}
function validarNomePerfil(nome) {
    if (!nome || typeof nome !== "string" || !nome.trim()) {
        return { erro: "Informe o nome do perfil", status: 400 };
    }
    const formatado = nome.trim();
    if (formatado.length > 50) {
        return { erro: "O nome do perfil não pode ter mais de 50 caracteres", status: 400 };
    }
    return { valor: formatado };
}
function validarDescricaoPerfil(descricao) {
    if (descricao === undefined)
        return {};
    if (descricao === null)
        return { valor: null };
    if (typeof descricao !== "string" || descricao.length > 255) {
        return { erro: "A descrição do perfil deve ser um texto com até 255 caracteres ou null", status: 400 };
    }
    return { valor: descricao };
}
function validarPermissoesPerfil(permissoes) {
    if (permissoes === undefined)
        return {};
    if (permissoes === null)
        return { valor: null };
    if (!Array.isArray(permissoes) || !permissoes.every((permissao) => typeof permissao === "string")) {
        return { erro: "As permissões do perfil devem ser uma lista de textos ou null", status: 400 };
    }
    return { valor: permissoes };
}
function validarEscopo(escopo) {
    if (escopo === undefined)
        return {};
    if (!ESCOPOS_VALIDOS.includes(escopo)) {
        return { erro: "Escopo inválido. Opções permitidas: FCV, COLABORADOR, CONVENIADO", status: 400 };
    }
    return { valor: escopo };
}
function validarStatusPerfil(status) {
    if (status === undefined)
        return {};
    if (!STATUS_VALIDOS.includes(status)) {
        return { erro: "Status inválido. Opções permitidas: ATIVO, INATIVO", status: 400 };
    }
    return { valor: status };
}
function validarEmail(email) {
    if (typeof email !== "string")
        return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
function validarCNPJ(cnpj) {
    if (typeof cnpj !== "string")
        return false;
    return cnpj.replace(/\D/g, "").length === 14;
}
//Validações dos Usários
function validarNomeUsuario(nome) {
    if (!nome || typeof nome !== "string" || !nome.trim()) {
        return { erro: "Informe o nome do usuário", status: 400 };
    }
    const formatado = nome.trim();
    if (formatado.length > 150) {
        return { erro: "O nome do usuário não pode ter mais de 150 caracteres", status: 400 };
    }
    return { valor: formatado };
}
function validarEmailUsuario(email) {
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
function validarSenha(senha) {
    if (!senha || typeof senha !== "string" || !senha.trim()) {
        return { erro: "A senha não pode ser vazia", status: 400 };
    }
    if (senha.length < 6) {
        return { erro: "A senha deve ter no mínimo 6 caracteres", status: 400 };
    }
    return { valor: senha };
}
function validarStatusUsuario(status) {
    if (status === undefined)
        return {};
    if (!exports.STATUS_USUARIO_VALIDOS.includes(status)) {
        return { erro: "Status inválido. Opções permitidas: ATIVO, INATIVO", status: 400 };
    }
    return { valor: status };
}
// Validações dos Colaboradores
function validarMatricula(matricula) {
    if (!matricula || typeof matricula !== "string" || !matricula.trim()) {
        return { erro: "Informe a matrícula do colaborador", status: 400 };
    }
    const limpo = matricula.trim();
    if (limpo.length > 30) {
        return { erro: "A matrícula não pode ter mais de 30 caracteres", status: 400 };
    }
    return { valor: limpo };
}
function validarSetor(setor) {
    if (!setor || typeof setor !== "string" || !setor.trim()) {
        return { erro: "Informe o setor do colaborador", status: 400 };
    }
    const limpo = setor.trim();
    if (limpo.length > 100) {
        return { erro: "O setor não pode ter mais de 100 caracteres", status: 400 };
    }
    return { valor: limpo };
}
function validarCargo(cargo) {
    if (!cargo || typeof cargo !== "string" || !cargo.trim()) {
        return { erro: "Informe o cargo do colaborador", status: 400 };
    }
    const limpo = cargo.trim();
    if (limpo.length > 100) {
        return { erro: "O cargo não pode ter mais de 100 caracteres", status: 400 };
    }
    return { valor: limpo };
}
function validarDataAdmissao(data) {
    if (!data || typeof data !== "string" || !data.trim()) {
        return { erro: "Informe a data de admissão no formato AAAA-MM-DD", status: 400 };
    }
    const limpo = data.trim();
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(limpo)) {
        return { erro: "Data de admissão inválida. Use o formato AAAA-MM-DD", status: 400 };
    }
    const [ano, mes, dia] = limpo.split("-").map(Number);
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    if (ano < 1000 || d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
        return { erro: "Data de admissão inválida no calendário", status: 400 };
    }
    return { valor: limpo };
}
function validarStatusColaborador(status) {
    if (status === undefined)
        return {};
    if (!exports.STATUS_COLABORADOR_VALIDOS.includes(status)) {
        return { erro: "Status inválido. Opções permitidas: ATIVO, INATIVO, AFASTADO", status: 400 };
    }
    return { valor: status };
}
function validarTelefone(telefone) {
    if (telefone === undefined || telefone === null || telefone === "")
        return { valor: null };
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
exports.STATUS_CONVENIADO_VALIDOS = ["ATIVO", "INATIVO", "EM_ANALISE"];
function validarNomeFantasia(nome) {
    if (!nome || typeof nome !== "string" || !nome.trim()) {
        return { erro: "Informe o nome fantasia do conveniado", status: 400 };
    }
    const limpo = nome.trim();
    if (limpo.length > 150) {
        return { erro: "O nome fantasia não pode ter mais de 150 caracteres", status: 400 };
    }
    return { valor: limpo };
}
function validarRazaoSocial(razao) {
    if (!razao || typeof razao !== "string" || !razao.trim()) {
        return { erro: "Informe a razão social do conveniado", status: 400 };
    }
    const limpo = razao.trim();
    if (limpo.length > 150) {
        return { erro: "A razão social não pode ter mais de 150 caracteres", status: 400 };
    }
    return { valor: limpo };
}
exports.STATUS_CATEGORIA_VALIDOS = [
    "ATIVO",
    "INATIVO",
];
function validarNomeCategoria(nome) {
    if (!nome ||
        typeof nome !== "string" ||
        !nome.trim()) {
        return {
            erro: "Informe o nome da categoria",
            status: 400,
        };
    }
    const limpo = nome.trim();
    if (limpo.length > 60) {
        return {
            erro: "O nome da categoria não pode ter mais de 60 caracteres",
            status: 400,
        };
    }
    return { valor: limpo };
}
function validarStatusCategoria(status) {
    if (status === undefined) {
        return { valor: undefined };
    }
    if (typeof status !== "string" ||
        !exports.STATUS_CATEGORIA_VALIDOS.includes(status)) {
        return {
            erro: "Status inválido. Use ATIVO ou INATIVO",
            status: 400,
        };
    }
    return { valor: status };
}
function validarCategorias(categorias) {
    if (!Array.isArray(categorias) ||
        categorias.length === 0) {
        return {
            erro: "Informe ao menos uma categoria em categorias (lista de ids)",
            status: 400,
        };
    }
    const ids = categorias.map((id) => validarId(id));
    if (ids.some((id) => id === null)) {
        return {
            erro: "Cada categoria deve ser um id inteiro positivo",
            status: 400,
        };
    }
    return {
        valor: [...new Set(ids)],
    };
}
function validarCNPJConveniado(cnpj) {
    if (!cnpj || typeof cnpj !== "string" || !cnpj.trim()) {
        return { erro: "Informe o CNPJ do conveniado", status: 400 };
    }
    const apenasDigitos = cnpj.replace(/\D/g, "");
    if (apenasDigitos.length !== 14) {
        return { erro: "CNPJ inválido. Informe exatamente 14 dígitos", status: 400 };
    }
    return { valor: apenasDigitos };
}
function validarEndereco(endereco) {
    if (!endereco || typeof endereco !== "string" || !endereco.trim()) {
        return { erro: "Informe o endereço do conveniado", status: 400 };
    }
    const limpo = endereco.trim();
    if (limpo.length > 255) {
        return { erro: "O endereço não pode ter mais de 255 caracteres", status: 400 };
    }
    return { valor: limpo };
}
function validarStatusConveniado(status) {
    if (status === undefined)
        return {};
    if (!exports.STATUS_CONVENIADO_VALIDOS.includes(status)) {
        return { erro: "Status inválido. Opções permitidas: ATIVO, INATIVO, EM_ANALISE", status: 400 };
    }
    return { valor: status };
}
