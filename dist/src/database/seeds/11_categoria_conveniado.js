"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
async function seed(knex) {
    await knex("categoria_conveniado").insert([
        { id: 1, nome: "Farmácia" },
        { id: 2, nome: "Saúde" },
        { id: 3, nome: "Fitness" },
        { id: 4, nome: "Ótica" },
        { id: 5, nome: "Alimentação" },
        { id: 6, nome: "Cultura" },
        { id: 7, nome: "Lazer" },
    ]);
    await knex("conveniado_categoria").insert([
        { conveniado_id: 1, categoria_id: 1 },
        { conveniado_id: 1, categoria_id: 2 },
        { conveniado_id: 2, categoria_id: 3 },
        { conveniado_id: 2, categoria_id: 2 },
        { conveniado_id: 3, categoria_id: 4 },
    ]);
}
