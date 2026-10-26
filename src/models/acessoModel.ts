import db from "../database/db";
function buscarComVinculos() {
    return db("usuario")
        .join("perfil_acesso", "perfil_acesso.id", "usuario.perfil_id")
        .leftJoin("colaborador", "colaborador.usuario_id", "usuario.id")
        .leftJoin("conveniado", "conveniado.usuario_id", "usuario.id")
        .select(
            "usuario.*",
            "perfil_acesso.nome as perfil",
            "perfil_acesso.escopo",
            "perfil_acesso.status as perfil_status",
            "colaborador.status as colaborador_status",
            "conveniado.status as conveniado_status",
        );
}
export const acessoModel = {
    buscarPorId(id: number) {
        return buscarComVinculos().where("usuario.id", id).first();
    },
    buscarPorEmail(email: string) {
        return buscarComVinculos().where("usuario.email", email).first();
    },
    async buscarDados(usuarioId: number) {
        const colaborador = await db("colaborador").where({ usuario_id: usuarioId }).first();
        const conveniado = await db("conveniado").where({ usuario_id: usuarioId }).first();
        return { colaborador: colaborador ?? null, conveniado: conveniado ?? null };
    },
};
export function motivoBloqueio(usuario: any) {
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