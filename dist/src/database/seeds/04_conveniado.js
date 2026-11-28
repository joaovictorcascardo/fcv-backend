"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
async function seed(knex) {
    await knex("conveniado").insert([
        {
            id: 1,
            usuario_id: 7,
            nome_fantasia: "Farmácia Vida",
            razao_social: "Vida Medicamentos Ltda",
            cnpj: "11222333000181",
            endereco: "Rua Pedro Mestre, 120, Muriaé",
            status: "ATIVO",
        },
        {
            id: 2,
            usuario_id: 8,
            nome_fantasia: "Academia Forma",
            razao_social: "Forma Fitness Ltda",
            cnpj: "22333444000172",
            endereco: "Av. Constantino Pinto, 800, Muriaé",
            status: "ATIVO",
        },
        {
            id: 3,
            usuario_id: 9,
            nome_fantasia: "Ótica Visão",
            razao_social: "Visão Óptica ME",
            cnpj: "33444555000163",
            endereco: "Rua Coronel Izalino, 45, Muriaé",
        },
    ]);
}
