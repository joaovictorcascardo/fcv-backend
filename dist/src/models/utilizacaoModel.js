"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBSERVACAO_CANCELAMENTO = exports.utilizacaoModel = void 0;
exports.statusAoCancelar = statusAoCancelar;
exports.observacaoAoCancelar = observacaoAoCancelar;
const crypto_1 = require("crypto");
const db_1 = __importDefault(require("../database/db"));
const codigo_1 = require("../utils/codigo");
const tempo_1 = require("../utils/tempo");
const recursos_1 = require("../queries/recursos");
const historico_1 = require("../queries/historico");
const TABELA = "utilizacao";
exports.utilizacaoModel = {
    listar(consulta = {}) {
        return (0, recursos_1.listarRecurso)(db_1.default, "utilizacoes", consulta);
    },
    listarDoDono(dono, consulta = {}) {
        return (0, historico_1.listarHistorico)(db_1.default, dono, consulta);
    },
    buscarPorId(id) {
        return (0, db_1.default)(TABELA).where({ id }).first();
    },
    buscarPorToken(token) {
        return (0, db_1.default)(TABELA).where({ token_qrcode: token }).first();
    },
    buscarPorCodigo(codigo) {
        return (0, db_1.default)(TABELA).where({ token_qrcode: codigo }).orWhere({ codigo_validacao: codigo }).first();
    },
    async codigoLivre() {
        let codigo = (0, codigo_1.gerarCodigoValidacao)();
        while (await (0, db_1.default)(TABELA).where({ codigo_validacao: codigo }).first())
            codigo = (0, codigo_1.gerarCodigoValidacao)();
        return codigo;
    },
    async criar(dados) {
        if (!dados.token_qrcode) {
            dados.token_qrcode = (0, crypto_1.randomUUID)();
        }
        if (!dados.codigo_validacao) {
            dados.codigo_validacao = await this.codigoLivre();
        }
        if (!dados.data_solicitacao) {
            dados.data_solicitacao = (0, tempo_1.agora)();
        }
        if (!dados.data_expiracao) {
            dados.data_expiracao = (0, tempo_1.somarHoras)(dados.data_solicitacao, 3);
        }
        if (!dados.beneficio_id && dados.beneficio_conveniado_id) {
            const oferta = await (0, db_1.default)("beneficio_conveniado").where({ id: dados.beneficio_conveniado_id }).first();
            dados.beneficio_id = oferta?.beneficio_id;
        }
        const [id] = await (0, db_1.default)(TABELA).insert(dados);
        return id;
    },
    atualizar(id, dados) {
        return (0, db_1.default)(TABELA).where({ id }).update(dados);
    },
    cancelar(id, statusAtual, novoStatus, observacoes) {
        return (0, db_1.default)(TABELA)
            .where({ id, status: statusAtual })
            .update({ status: novoStatus, observacoes });
    },
};
const statusDoCancelamento = {
    PENDENTE: "CANCELADA",
    APROVADA: "ESTORNADA",
};
exports.OBSERVACAO_CANCELAMENTO = "Cancelada pela FCV";
function statusAoCancelar(status) {
    return statusDoCancelamento[status] ?? null;
}
function observacaoAoCancelar(observacoes) {
    return observacoes ? `${observacoes}\n${exports.OBSERVACAO_CANCELAMENTO}` : exports.OBSERVACAO_CANCELAMENTO;
}
