"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resgateModel = exports.ErroResgate = void 0;
exports.formatarDataHora = formatarDataHora;
const crypto_1 = require("crypto");
const db_1 = __importDefault(require("../database/db"));
const ciclo_1 = require("../utils/ciclo");
const codigo_1 = require("../utils/codigo");
const tempo_1 = require("../utils/tempo");
class ErroResgate extends Error {
    status;
    extra;
    constructor(status, mensagem, extra = {}) {
        super(mensagem);
        this.status = status;
        this.extra = extra;
    }
}
exports.ErroResgate = ErroResgate;
function formatarDataHora(texto) {
    const [data, hora] = texto.slice(0, 16).split(" ");
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano} às ${hora}`;
}
const NAO_ENCONTRADO = "Resgate não encontrado neste estabelecimento. Confira o código e se o benefício é aceito aqui";
const MENSAGEM_ENCERRADO = {
    APROVADA: "Este resgate já foi aprovado",
    REPROVADA: "Este resgate já foi reprovado",
    ESTORNADA: "Este resgate foi estornado pela FCV",
    CANCELADA: "Este resgate foi cancelado",
    EXPIRADA: "Este resgate expirou. Peça para o colaborador solicitar de novo",
};
function detalhar(conexao) {
    return conexao("utilizacao")
        .leftJoin("beneficio", "beneficio.id", "utilizacao.beneficio_id")
        .leftJoin("beneficio_conveniado as oferta", "oferta.id", "utilizacao.beneficio_conveniado_id")
        .leftJoin("conveniado", "conveniado.id", "oferta.conveniado_id")
        .join("colaborador", "colaborador.id", "utilizacao.colaborador_id")
        .join("usuario", "usuario.id", "colaborador.usuario_id")
        .select("utilizacao.id", "utilizacao.status", "utilizacao.token_qrcode", "utilizacao.codigo_validacao", "utilizacao.data_solicitacao", "utilizacao.data_expiracao", "utilizacao.data_validacao", "utilizacao.valor_aplicado", "utilizacao.canal_validacao", "utilizacao.observacoes", "utilizacao.colaborador_id", "usuario.nome as colaborador_nome", "utilizacao.beneficio_id", "beneficio.nome as beneficio_nome", "beneficio.descricao as beneficio_descricao", "beneficio.tipo_beneficio", "beneficio.valor as beneficio_valor", "conveniado.id as conveniado_id", "conveniado.nome_fantasia as conveniado_nome");
}
function comTempo(resgate, momento) {
    const vencido = resgate.status === "PENDENTE" && resgate.data_expiracao <= momento;
    const status = vencido ? "EXPIRADA" : resgate.status;
    const restante = status === "PENDENTE" ? Math.max(0, (0, tempo_1.segundosEntre)(momento, resgate.data_expiracao)) : 0;
    return { ...resgate, status, segundos_restantes: restante };
}
async function contarNoCiclo(trx, colaboradorId, beneficioId, inicio, momento) {
    const linha = await trx("utilizacao")
        .where({ colaborador_id: colaboradorId, beneficio_id: beneficioId })
        .where("data_solicitacao", ">=", inicio)
        .where(function () {
        this.where("status", "APROVADA").orWhere(function () {
            this.where("status", "PENDENTE").where("data_expiracao", ">", momento);
        });
    })
        .count("id as total")
        .first();
    return Number(linha?.total ?? 0);
}
async function codigoLivre(trx) {
    let codigo = (0, codigo_1.gerarCodigoValidacao)();
    while (await trx("utilizacao").where({ codigo_validacao: codigo }).first())
        codigo = (0, codigo_1.gerarCodigoValidacao)();
    return codigo;
}
exports.resgateModel = {
    async solicitar(usuarioId, beneficioId) {
        const momento = (0, tempo_1.agora)();
        const id = await db_1.default.transaction(async (trx) => {
            const colaborador = await trx("colaborador").where({ usuario_id: usuarioId }).forUpdate().first();
            if (!colaborador)
                throw new ErroResgate(404, "Cadastro de colaborador não encontrado");
            if (colaborador.status !== "ATIVO")
                throw new ErroResgate(403, "Seu cadastro de colaborador não está ativo");
            const beneficio = await trx("beneficio").where({ id: beneficioId }).first();
            if (!beneficio)
                throw new ErroResgate(404, "Benefício não encontrado");
            if (beneficio.status !== "ATIVO")
                throw new ErroResgate(409, "Este benefício não está ativo");
            const local = await trx("beneficio_conveniado")
                .join("conveniado", "conveniado.id", "beneficio_conveniado.conveniado_id")
                .where({ "beneficio_conveniado.beneficio_id": beneficioId, "beneficio_conveniado.status": "ATIVO", "conveniado.status": "ATIVO" })
                .first("beneficio_conveniado.id");
            if (!local)
                throw new ErroResgate(409, "Este benefício ainda não tem nenhum estabelecimento disponível");
            const aberto = await trx("utilizacao")
                .where({ colaborador_id: colaborador.id, beneficio_id: beneficioId, status: "PENDENTE" })
                .where("data_expiracao", ">", momento)
                .first("id", "data_expiracao");
            if (aberto) {
                throw new ErroResgate(409, "Você já tem um resgate deste benefício aguardando validação", {
                    utilizacao_id: aberto.id,
                    data_expiracao: aberto.data_expiracao,
                });
            }
            const regra = beneficio;
            const ciclo = (0, ciclo_1.cicloAtual)(regra, momento, colaborador.data_admissao);
            const usados = await contarNoCiclo(trx, colaborador.id, beneficioId, ciclo.inicio, momento);
            if (usados >= beneficio.quantidade_maxima_utilizacoes) {
                const renova = ciclo.fim ? ` Ele renova em ${formatarDataHora(ciclo.fim)}` : "";
                throw new ErroResgate(409, `Você já usou ${usados} de ${beneficio.quantidade_maxima_utilizacoes} neste ciclo.${renova}`.trim(), {
                    usados,
                    limite: beneficio.quantidade_maxima_utilizacoes,
                    renova_em: ciclo.fim,
                });
            }
            const [novoId] = await trx("utilizacao").insert({
                colaborador_id: colaborador.id,
                beneficio_id: beneficioId,
                token_qrcode: (0, crypto_1.randomUUID)(),
                codigo_validacao: await codigoLivre(trx),
                data_solicitacao: momento,
                data_expiracao: (0, ciclo_1.calcularExpiracao)(regra, momento),
                valor_aplicado: beneficio.valor,
                status: "PENDENTE",
            });
            return novoId;
        });
        return this.buscarDoColaborador(usuarioId, id);
    },
    async buscarDoColaborador(usuarioId, id) {
        const resgate = await detalhar(db_1.default).where({ "utilizacao.id": id, "usuario.id": usuarioId }).first();
        return resgate ? comTempo(resgate, (0, tempo_1.agora)()) : null;
    },
    async cancelar(usuarioId, id) {
        const momento = (0, tempo_1.agora)();
        const resgate = await this.buscarDoColaborador(usuarioId, id);
        if (!resgate)
            throw new ErroResgate(404, "Resgate não encontrado");
        if (resgate.status !== "PENDENTE") {
            throw new ErroResgate(409, MENSAGEM_ENCERRADO[resgate.status] ?? "Este resgate já foi encerrado", { status: resgate.status });
        }
        const alterados = await (0, db_1.default)("utilizacao")
            .where({ id, status: "PENDENTE" })
            .where("data_expiracao", ">", momento)
            .update({ status: "CANCELADA" });
        if (!alterados)
            throw new ErroResgate(409, "Este resgate acabou de mudar de situação. Consulte de novo");
        return this.buscarDoColaborador(usuarioId, id);
    },
    async conferirParaValidar(usuarioConveniadoId, codigo) {
        const conveniado = await (0, db_1.default)("conveniado").where({ usuario_id: usuarioConveniadoId }).first();
        if (!conveniado)
            throw new ErroResgate(404, "Cadastro de conveniado não encontrado");
        const resgate = await detalhar(db_1.default)
            .where(function () {
            this.where("utilizacao.token_qrcode", codigo).orWhere("utilizacao.codigo_validacao", codigo);
        })
            .first();
        const oferta = resgate?.beneficio_id
            ? await (0, db_1.default)("beneficio_conveniado")
                .where({ beneficio_id: resgate.beneficio_id, conveniado_id: conveniado.id, status: "ATIVO" })
                .first()
            : null;
        if (!resgate || !oferta)
            throw new ErroResgate(404, NAO_ENCONTRADO);
        const momento = (0, tempo_1.agora)();
        if (resgate.status === "PENDENTE" && resgate.data_expiracao <= momento) {
            await (0, db_1.default)("utilizacao").where({ id: resgate.id, status: "PENDENTE" }).update({ status: "EXPIRADA" });
            throw new ErroResgate(409, `Este resgate expirou em ${formatarDataHora(resgate.data_expiracao)}. Peça para o colaborador solicitar de novo`, {
                status: "EXPIRADA",
            });
        }
        if (resgate.status !== "PENDENTE") {
            throw new ErroResgate(409, MENSAGEM_ENCERRADO[resgate.status] ?? "Este resgate já foi encerrado", { status: resgate.status });
        }
        return { resgate: comTempo(resgate, momento), oferta, conveniado };
    },
    async decidir(usuarioConveniadoId, codigo, aprovar, canal, motivo) {
        const { resgate, oferta } = await this.conferirParaValidar(usuarioConveniadoId, codigo);
        if (aprovar) {
            const beneficio = await (0, db_1.default)("beneficio").where({ id: resgate.beneficio_id }).first("status");
            if (beneficio?.status !== "ATIVO")
                throw new ErroResgate(409, "Este benefício não está mais ativo");
            const colaborador = await (0, db_1.default)("colaborador").where({ id: resgate.colaborador_id }).first("status");
            if (colaborador?.status !== "ATIVO")
                throw new ErroResgate(409, "O colaborador não está mais ativo");
        }
        const momento = (0, tempo_1.agora)();
        const alterados = await (0, db_1.default)("utilizacao")
            .where({ id: resgate.id, status: "PENDENTE" })
            .where("data_expiracao", ">", momento)
            .update({
            status: aprovar ? "APROVADA" : "REPROVADA",
            beneficio_conveniado_id: oferta.id,
            data_validacao: momento,
            canal_validacao: canal,
            ...(motivo ? { observacoes: motivo } : {}),
        });
        if (!alterados) {
            const atual = await (0, db_1.default)("utilizacao").where({ id: resgate.id }).first("status", "data_expiracao");
            const status = comTempo(atual, (0, tempo_1.agora)()).status;
            throw new ErroResgate(409, MENSAGEM_ENCERRADO[status] ?? "Este resgate acabou de ser validado em outra leitura", { status });
        }
        const final = await detalhar(db_1.default).where("utilizacao.id", resgate.id).first();
        return comTempo(final, momento);
    },
};
