import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("conveniado").insert([
    {
      id: 1,
      usuario_id: 7,
      nome_fantasia: "Farmácia Vida",
      razao_social: "Vida Medicamentos Ltda",
      categoria: "Farmácia",
      cnpj: "11222333000181",
      endereco: "Rua Pedro Mestre, 120, Muriaé",
      status: "ATIVO",
    },
    {
      id: 2,
      usuario_id: 8,
      nome_fantasia: "Academia Forma",
      razao_social: "Forma Fitness Ltda",
      categoria: "Academia",
      cnpj: "22333444000172",
      endereco: "Av. Constantino Pinto, 800, Muriaé",
      status: "ATIVO",
    },
    {
      id: 3,
      usuario_id: 9,
      nome_fantasia: "Ótica Visão",
      razao_social: "Visão Óptica ME",
      categoria: "Ótica",
      cnpj: "33444555000163",
      endereco: "Rua Coronel Izalino, 45, Muriaé",
    },
  ]);
}