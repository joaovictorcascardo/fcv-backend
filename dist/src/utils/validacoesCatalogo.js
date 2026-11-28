"use strict";
// Validação de entrada dos cadastros do catálogo (benefícios, ofertas, campanhas e utilizações).
// Segue o formato do utilitário de cadastros do Samuel S. ({ erro, status } ou { valor })
// para poder unificar os dois arquivos depois.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAMPOS_FIXOS_UTILIZACAO = exports.MENSAGEM_ID_INVALIDO = exports.CANAIS_VALIDACAO_VALIDOS = exports.TIPOS_CAMPANHA_VALIDOS = exports.REFERENCIAS_CONTAGEM_VALIDAS = exports.UNIDADES_INTERVALO_VALIDAS = exports.UNIDADES_CICLO_VALIDAS = exports.TIPOS_JANELA_VALIDOS = exports.TIPOS_BENEFICIO_VALIDOS = exports.STATUS_UTILIZACAO_VALIDOS = exports.STATUS_CAMPANHA_VALIDOS = exports.STATUS_OFERTA_VALIDOS = exports.STATUS_BENEFICIO_VALIDOS = void 0;
exports.validarId = validarId;
exports.dataValida = dataValida;
exports.validarBeneficio = validarBeneficio;
exports.validarOferta = validarOferta;
exports.validarCampanha = validarCampanha;
exports.validarItemCampanha = validarItemCampanha;
exports.validarOfertaCampanha = validarOfertaCampanha;
exports.validarUtilizacao = validarUtilizacao;
exports.STATUS_BENEFICIO_VALIDOS = ["ATIVO", "INATIVO", "DESCONTINUADO"];
exports.STATUS_OFERTA_VALIDOS = ["ATIVO", "INATIVO"];
exports.STATUS_CAMPANHA_VALIDOS = ["PLANEJADA", "ATIVA", "ENCERRADA", "CANCELADA"];
exports.STATUS_UTILIZACAO_VALIDOS = ["PENDENTE", "APROVADA", "REPROVADA", "ESTORNADA", "EXPIRADA", "CANCELADA"];
exports.TIPOS_BENEFICIO_VALIDOS = ["PERCENTUAL", "VALOR_FIXO"];
exports.TIPOS_JANELA_VALIDOS = ["CALENDARIO_FIXO", "JANELA_MOVEL"];
exports.UNIDADES_CICLO_VALIDAS = ["ANO", "MES", "SEMANA"];
exports.UNIDADES_INTERVALO_VALIDAS = ["DIA", "MES"];
exports.REFERENCIAS_CONTAGEM_VALIDAS = ["ULTIMA_UTILIZACAO", "DATA_ADMISSAO_COLABORADOR"];
exports.TIPOS_CAMPANHA_VALIDOS = ["CAMPANHA", "EVENTO_INTERNO", "EVENTO_PATROCINADO", "VOUCHER", "CORTESIA"];
exports.CANAIS_VALIDACAO_VALIDOS = ["APP_CONVENIADO", "TERMINAL_IOT"];
// Maior valor que cabe em DECIMAL(10, 2).
const VALOR_MAXIMO = 99999999.99;
const falha = (erro) => ({ erro, status: 400 });
exports.MENSAGEM_ID_INVALIDO = "ID inválido. Informe um número inteiro positivo";
// Mesma regra do validarId do utilitário de cadastros.
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
function textoObrigatorio(valor, informe, rotulo, max) {
    if (!valor || typeof valor !== "string" || !valor.trim()) {
        return falha(informe);
    }
    const limpo = valor.trim();
    if (limpo.length > max) {
        return falha(`${rotulo} não pode ter mais de ${max} caracteres`);
    }
    return { valor: limpo };
}
function textoOpcional(valor, rotulo, max) {
    if (valor === undefined)
        return {};
    if (valor === null || valor === "")
        return { valor: null };
    if (typeof valor !== "string") {
        return falha(`${rotulo} deve ser um texto`);
    }
    const limpo = valor.trim();
    if (max && limpo.length > max) {
        return falha(`${rotulo} não pode ter mais de ${max} caracteres`);
    }
    return { valor: limpo || null };
}
function opcao(valor, invalido, opcoes, informe) {
    if (valor === undefined && !informe)
        return {};
    if (valor === undefined || valor === null || valor === "") {
        return falha(`${informe ?? invalido}. Opções permitidas: ${opcoes.join(", ")}`);
    }
    if (!opcoes.includes(valor)) {
        return falha(`${invalido}. Opções permitidas: ${opcoes.join(", ")}`);
    }
    return { valor: valor };
}
function opcaoOpcional(valor, invalido, opcoes) {
    if (valor === null || valor === "")
        return { valor: null };
    return opcao(valor, invalido, opcoes);
}
function numero(valor) {
    if (typeof valor === "number")
        return Number.isFinite(valor) ? valor : null;
    if (typeof valor === "string" && valor.trim()) {
        const convertido = Number(valor);
        return Number.isFinite(convertido) ? convertido : null;
    }
    return null;
}
function valorPositivo(valor, informe, rotulo) {
    if (valor === undefined || valor === null || valor === "") {
        return falha(informe);
    }
    const convertido = numero(valor);
    if (convertido === null || convertido <= 0) {
        return falha(`${rotulo} deve ser um número maior que zero`);
    }
    if (convertido > VALOR_MAXIMO) {
        return falha(`${rotulo} não pode passar de ${VALOR_MAXIMO}`);
    }
    return { valor: convertido };
}
function inteiroPositivo(valor, informe, rotulo) {
    if (valor === undefined || valor === null || valor === "") {
        return falha(informe);
    }
    const convertido = numero(valor);
    if (convertido === null || !Number.isInteger(convertido) || convertido <= 0) {
        return falha(`${rotulo} deve ser um número inteiro maior que zero`);
    }
    return { valor: convertido };
}
function inteiroPositivoOpcional(valor, rotulo) {
    if (valor === undefined)
        return {};
    if (valor === null || valor === "")
        return { valor: null };
    return inteiroPositivo(valor, "", rotulo);
}
function idReferencia(valor, campo) {
    const id = validarId(valor);
    if (valor === undefined || valor === null || valor === "" || !id) {
        return falha(`Informe um ${campo} válido (número inteiro positivo)`);
    }
    return { valor: id };
}
// AAAA-MM-DD existente no calendário e dentro da faixa do MySQL.
function dataValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor))
        return false;
    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return ano >= 1000 && data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}
function dataObrigatoria(valor, campo) {
    if (!valor || typeof valor !== "string" || !valor.trim()) {
        return falha(`Informe ${campo} no formato AAAA-MM-DD`);
    }
    const limpo = valor.trim();
    if (!dataValida(limpo)) {
        return falha(`${campo} inválida. Use o formato AAAA-MM-DD com uma data que exista no calendário`);
    }
    return { valor: limpo };
}
function dataOpcional(valor, campo) {
    if (valor === undefined)
        return {};
    if (valor === null || valor === "")
        return { valor: null };
    return dataObrigatoria(valor, campo);
}
function dataHoraOpcional(valor, campo, aceitaNulo) {
    if (valor === undefined)
        return {};
    if (aceitaNulo && (valor === null || valor === ""))
        return { valor: null };
    const limpo = typeof valor === "string" ? valor.trim() : "";
    const partes = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(limpo);
    if (!partes || !dataValida(partes[1]) || Number(partes[2]) > 23 || Number(partes[3]) > 59 || Number(partes[4]) > 59) {
        return falha(`${campo} inválida. Use o formato AAAA-MM-DD HH:MM:SS`);
    }
    return { valor: limpo };
}
// Valida os campos conhecidos e devolve só eles: campos desconhecidos (inclusive id) são ignorados.
// Ao criar, todos os campos passam pela validação (os obrigatórios acusam falta);
// ao alterar, só os que vieram no corpo.
function montar(corpo, campos, criando) {
    const entrada = (corpo && typeof corpo === "object" ? corpo : {});
    const dados = {};
    for (const [nome, validar] of Object.entries(campos)) {
        if (!criando && entrada[nome] === undefined)
            continue;
        const resultado = validar(entrada[nome]);
        if (resultado.erro)
            return { erro: resultado.erro, status: resultado.status };
        if ("valor" in resultado)
            dados[nome] = resultado.valor;
    }
    if (!criando && Object.keys(dados).length === 0) {
        return falha("Nenhum dado válido fornecido para atualização");
    }
    return { dados };
}
function camposProibidos(corpo, campos, mensagem) {
    const entrada = (corpo && typeof corpo === "object" ? corpo : {});
    const enviado = campos.find((campo) => entrada[campo] !== undefined);
    return enviado ? falha(mensagem.replace("{campo}", enviado)) : null;
}
const statusOferta = (valor) => opcao(valor, "Status inválido", exports.STATUS_OFERTA_VALIDOS);
// --- Benefícios ---
function validarBeneficio(corpo, atual) {
    const resultado = montar(corpo, {
        nome: (v) => textoObrigatorio(v, "Informe o nome do benefício", "O nome do benefício", 150),
        descricao: (v) => textoOpcional(v, "A descrição"),
        status: (v) => opcao(v, "Status inválido", exports.STATUS_BENEFICIO_VALIDOS),
        tipo_beneficio: (v) => opcao(v, "tipo_beneficio inválido", exports.TIPOS_BENEFICIO_VALIDOS, "Informe o tipo_beneficio"),
        valor: (v) => valorPositivo(v, "Informe o valor do benefício", "O valor do benefício"),
        quantidade_maxima_utilizacoes: (v) => inteiroPositivo(v, "Informe a quantidade_maxima_utilizacoes", "A quantidade_maxima_utilizacoes"),
        tipo_janela: (v) => opcao(v, "tipo_janela inválido", exports.TIPOS_JANELA_VALIDOS, "Informe o tipo_janela"),
        unidade_ciclo: (v) => opcaoOpcional(v, "unidade_ciclo inválida", exports.UNIDADES_CICLO_VALIDAS),
        dia_reset: (v) => dataOpcional(v, "dia_reset"),
        intervalo_valor: (v) => inteiroPositivoOpcional(v, "O intervalo_valor"),
        intervalo_unidade: (v) => opcaoOpcional(v, "intervalo_unidade inválida", exports.UNIDADES_INTERVALO_VALIDAS),
        referencia_contagem: (v) => opcaoOpcional(v, "referencia_contagem inválida", exports.REFERENCIAS_CONTAGEM_VALIDAS),
    }, !atual);
    if (resultado.erro)
        return resultado;
    // As mesmas regras das CHECKs da tabela beneficio, olhando o registro como vai ficar.
    const final = { ...atual, ...resultado.dados };
    if (final.tipo_beneficio === "PERCENTUAL" && Number(final.valor) > 100) {
        return falha("Benefício PERCENTUAL não pode ter valor maior que 100");
    }
    if (final.tipo_janela === "CALENDARIO_FIXO" && !final.unidade_ciclo) {
        return falha("Para tipo_janela CALENDARIO_FIXO, informe unidade_ciclo (ANO, MES ou SEMANA)");
    }
    if (final.tipo_janela === "JANELA_MOVEL" && (!final.intervalo_valor || !final.intervalo_unidade || !final.referencia_contagem)) {
        return falha("Para tipo_janela JANELA_MOVEL, informe intervalo_valor, intervalo_unidade e referencia_contagem");
    }
    return resultado;
}
// --- Ofertas comuns (beneficio_conveniado) ---
function validarOferta(corpo, criando) {
    const proibido = camposProibidos(corpo, ["beneficio_campanha_id"], "Oferta comum não usa {campo}. Para itens de campanha use /ofertas-campanha");
    if (proibido)
        return proibido;
    return montar(corpo, {
        beneficio_id: (v) => idReferencia(v, "beneficio_id"),
        conveniado_id: (v) => idReferencia(v, "conveniado_id"),
        status: statusOferta,
    }, criando);
}
// --- Campanhas e eventos ---
function validarCampanha(corpo, atual) {
    const resultado = montar(corpo, {
        nome: (v) => textoObrigatorio(v, "Informe o nome da campanha", "O nome da campanha", 150),
        tipo: (v) => opcao(v, "Tipo inválido", exports.TIPOS_CAMPANHA_VALIDOS, "Informe o tipo da campanha"),
        descricao: (v) => textoOpcional(v, "A descrição"),
        data_inicio: (v) => dataObrigatoria(v, "data_inicio"),
        data_fim: (v) => dataObrigatoria(v, "data_fim"),
        criterio_elegibilidade: (v) => textoOpcional(v, "O criterio_elegibilidade"),
        patrocinador: (v) => textoOpcional(v, "O patrocinador", 150),
        status: (v) => opcao(v, "Status inválido", exports.STATUS_CAMPANHA_VALIDOS),
    }, !atual);
    if (resultado.erro)
        return resultado;
    const final = { ...atual, ...resultado.dados };
    if (String(final.data_fim) < String(final.data_inicio)) {
        return falha("A data_fim não pode ser anterior à data_inicio");
    }
    return resultado;
}
// --- Itens de campanha (beneficio_campanha) ---
function validarItemCampanha(corpo, atual) {
    const resultado = montar(corpo, {
        campanha_id: (v) => idReferencia(v, "campanha_id"),
        nome: (v) => textoObrigatorio(v, "Informe o nome do item de campanha", "O nome do item de campanha", 150),
        descricao: (v) => textoOpcional(v, "A descrição"),
        tipo_beneficio: (v) => opcao(v, "tipo_beneficio inválido", exports.TIPOS_BENEFICIO_VALIDOS, "Informe o tipo_beneficio"),
        valor: (v) => valorPositivo(v, "Informe o valor do item de campanha", "O valor do item de campanha"),
        quantidade_maxima_utilizacoes: (v) => inteiroPositivoOpcional(v, "A quantidade_maxima_utilizacoes"),
        status: statusOferta,
    }, !atual);
    if (resultado.erro)
        return resultado;
    const final = { ...atual, ...resultado.dados };
    if (final.tipo_beneficio === "PERCENTUAL" && Number(final.valor) > 100) {
        return falha("Item PERCENTUAL não pode ter valor maior que 100");
    }
    return resultado;
}
// --- Ofertas de campanha (beneficio_campanha_conveniado) ---
function validarOfertaCampanha(corpo, criando) {
    const proibido = camposProibidos(corpo, ["beneficio_id", "beneficio_conveniado_id"], "Oferta de campanha não usa {campo}. Para benefícios permanentes use /ofertas");
    if (proibido)
        return proibido;
    return montar(corpo, {
        beneficio_campanha_id: (v) => idReferencia(v, "beneficio_campanha_id"),
        conveniado_id: (v) => idReferencia(v, "conveniado_id"),
        status: statusOferta,
    }, criando);
}
// --- Utilizações ---
exports.CAMPOS_FIXOS_UTILIZACAO = ["colaborador_id", "beneficio_conveniado_id", "beneficio_campanha_conveniado_id"];
function validarUtilizacao(corpo, criando) {
    if (!criando) {
        // Quem usou e onde usou fazem parte do histórico: não mudam depois de registrados.
        const fixo = camposProibidos(corpo, exports.CAMPOS_FIXOS_UTILIZACAO, "{campo} não pode ser alterado: a utilização faz parte do histórico. Cancele (DELETE) e registre outra");
        if (fixo)
            return fixo;
    }
    const resultado = montar(corpo, {
        ...(criando ? {
            colaborador_id: (v) => idReferencia(v, "colaborador_id"),
            beneficio_conveniado_id: (v) => v === undefined || v === null ? {} : idReferencia(v, "beneficio_conveniado_id"),
            beneficio_campanha_conveniado_id: (v) => v === undefined || v === null ? {} : idReferencia(v, "beneficio_campanha_conveniado_id"),
        } : {}),
        token_qrcode: (v) => v === undefined ? {} : textoObrigatorio(v, "O token_qrcode não pode ser vazio", "O token_qrcode", 64),
        data_solicitacao: (v) => dataHoraOpcional(v, "data_solicitacao", false),
        data_validacao: (v) => dataHoraOpcional(v, "data_validacao", true),
        valor_aplicado: (v) => valorPositivo(v, "Informe o valor_aplicado", "O valor_aplicado"),
        canal_validacao: (v) => opcaoOpcional(v, "canal_validacao inválido", exports.CANAIS_VALIDACAO_VALIDOS),
        status: (v) => opcao(v, "Status inválido", exports.STATUS_UTILIZACAO_VALIDOS),
        observacoes: (v) => textoOpcional(v, "As observacoes"),
    }, criando);
    if (!resultado.dados || !criando)
        return resultado;
    const { dados } = resultado;
    const origens = ["beneficio_conveniado_id", "beneficio_campanha_conveniado_id"].filter((campo) => dados[campo] !== undefined);
    if (origens.length !== 1) {
        return falha("Informe uma única origem: beneficio_conveniado_id (oferta comum) ou beneficio_campanha_conveniado_id (oferta de campanha)");
    }
    return resultado;
}
