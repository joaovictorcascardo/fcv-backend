"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acessoModel = void 0;
exports.motivoBloqueio = motivoBloqueio;
const db_1 = __importDefault(require("../database/db"));
function buscarComVinculos() {
    return (0, db_1.default)("usuario")
        .join("perfil_acesso", "perfil_acesso.id", "usuario.perfil_id")
        .leftJoin("colaborador", "colaborador.usuario_id", "usuario.id")
        .leftJoin("conveniado", "conveniado.usuario_id", "usuario.id")
        .select("usuario.id", "usuario.nome", "usuario.email", "usuario.senha", "usuario.perfil_id", "usuario.status", "usuario.data_criacao", "perfil_acesso.nome as perfil", "perfil_acesso.escopo", "perfil_acesso.status as perfil_status", "colaborador.status as colaborador_status", "conveniado.status as conveniado_status");
}
exports.acessoModel = {
    buscarPorId(id) {
        return buscarComVinculos().where("usuario.id", id).first();
    },
    buscarPorEmail(email) {
        return buscarComVinculos().where("usuario.email", email).first();
    },
    async buscarDados(usuarioId, escopo) {
        if (escopo === undefined) {
            const perfil = await (0, db_1.default)("usuario")
                .join("perfil_acesso", "perfil_acesso.id", "usuario.perfil_id")
                .select("perfil_acesso.escopo")
                .where("usuario.id", usuarioId)
                .first();
            escopo = perfil?.escopo;
        }
        const colaborador = escopo === "COLABORADOR"
            ? await (0, db_1.default)("colaborador")
                .select("id", "usuario_id", "matricula", "setor", "cargo", "telefone", "data_admissao", "status")
                .where({ usuario_id: usuarioId }).first()
            : null;
        const conveniado = escopo === "CONVENIADO"
            ? await (0, db_1.default)("conveniado")
                .select("id", "usuario_id", "nome_fantasia", "razao_social", "cnpj", "endereco", "status")
                .where({ usuario_id: usuarioId }).first()
            : null;
        return { colaborador: colaborador ?? null, conveniado: conveniado ?? null };
    },
};
function motivoBloqueio(usuario) {
    if (usuario.status !== "ATIVO") {
        return "Usuário inativo";
    }
    if (usuario.perfil_status !== "ATIVO") {
        return "Perfil de acesso inativo";
    }
    if (usuario.escopo === "COLABORADOR" && usuario.colaborador_status !== "ATIVO") {
        return "Colaborador inativo ou afastado";
    }
    if (usuario.escopo === "CONVENIADO" && usuario.conveniado_status !== "ATIVO") {
        return usuario.conveniado_status === "EM_ANALISE"
            ? "Cadastro do estabelecimento em análise"
            : "Estabelecimento inativo";
    }
    return null;
}
