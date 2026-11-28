"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
async function seed(knex) {
    await knex("beneficio_conveniado").insert([
        {
            id: 1,
            beneficio_id: 1,
            conveniado_id: 1,
        },
        {
            id: 2,
            beneficio_id: 2,
            conveniado_id: 2,
        },
        {
            id: 3,
            beneficio_id: 3,
            conveniado_id: 3,
        },
    ]);
}
