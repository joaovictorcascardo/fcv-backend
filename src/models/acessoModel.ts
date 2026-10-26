import db from "../database/db";
function buscarComVinculos() {
    return db("usuario")
        .join("perfil_acesso", "perfil_acesso.id", "usuario.perfil_id")
        .leftJoin("colaborador", "colaborador.usuario_id", "usuario.id")
        .leftJoin("conveniado", "conveniado.usuario_id", "usuario.id")
        .select(
            "usuario.id",
            "usuario.nome",
            "usuario.email",
            "usuario.senha",
            "usuario.perfil_id",
            "usuario.status",
            "usuario.data_criacao",
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
    async buscarDados(usuarioId: number, escopo?: string) {
        if (escopo === undefined) {
            const perfil = await db("usuario")
                .join("perfil_acesso", "perfil_acesso.id", "usuario.perfil_id")
                .select("perfil_acesso.escopo")
                .where("usuario.id", usuarioId)
                .first();
            escopo = perfil?.escopo;
        }
        const colaborador = escopo === "COLABORADOR"
            ? await db("colaborador")
                .select("id", "usuario_id", "matricula", "setor", "cargo", "telefone", "data_admissao", "status")
                .where({ usuario_id: usuarioId }).first()
            : null;
        const conveniado = escopo === "CONVENIADO"
            ? await db("conveniado")
                .select("id", "usuario_id", "nome_fantasia", "razao_social", "categoria", "cnpj", "endereco", "status")
                .where({ usuario_id: usuarioId }).first()
            : null;
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
