"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
async function seed(knex) {
    await knex("perfil_acesso").insert([
        {
            id: 1,
            nome: "FCV_ADMINISTRADOR",
            escopo: "FCV",
            descricao: "Gestor do setor: tudo do operador + usuários e perfis",
            permissoes: JSON.stringify(["tudo"]),
        },
        {
            id: 2,
            nome: "FCV_OPERADOR",
            escopo: "FCV",
            descricao: "Equipe operacional: cadastros, campanhas e utilizações",
            permissoes: JSON.stringify(["cadastros", "campanhas", "utilizacoes"]),
        },
        {
            id: 3,
            nome: "COLABORADOR",
            escopo: "COLABORADOR",
            descricao: "Funcionário da FCV que usa a carteira de benefícios",
            permissoes: JSON.stringify(["carteira", "qrcode", "historico"]),
        },
        {
            id: 4,
            nome: "CONVENIADO",
            escopo: "CONVENIADO",
            descricao: "Estabelecimento parceiro que valida os resgates",
            permissoes: JSON.stringify(["validar", "historico_estabelecimento"]),
        },
    ]);
}
