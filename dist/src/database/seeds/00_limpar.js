"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
const tabelas = [
    "conveniado_categoria",
    "categoria_conveniado",
    "utilizacao",
    "beneficio_campanha_conveniado",
    "beneficio_campanha",
    "campanha_evento",
    "beneficio_conveniado",
    "beneficio",
    "conveniado",
    "colaborador",
    "usuario",
    "conveniado",
    "colaborador",
    "usuario",
    "perfil_acesso",
];
async function seed(knex) {
    for (const tabela of tabelas) {
        if (await knex.schema.hasTable(tabela)) {
            await knex(tabela).del();
        }
    }
}
