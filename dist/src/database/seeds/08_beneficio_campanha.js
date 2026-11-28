"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
async function seed(knex) {
    await knex("beneficio_campanha").insert([
        {
            id: 1,
            campanha_id: 1,
            nome: "Avaliação física gratuita",
            tipo_beneficio: "VALOR_FIXO",
            valor: 80,
            quantidade_maxima_utilizacoes: 1,
        },
        {
            id: 2,
            campanha_id: 1,
            nome: "Kit autocuidado com desconto",
            tipo_beneficio: "PERCENTUAL",
            valor: 25,
        },
        {
            id: 3,
            campanha_id: 2,
            nome: "Aula experimental em grupo",
            tipo_beneficio: "VALOR_FIXO",
            valor: 30,
            quantidade_maxima_utilizacoes: 1,
        },
    ]);
}
