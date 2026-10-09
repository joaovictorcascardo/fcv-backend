import type { Knex } from "knex";
import bcrypt from "bcryptjs";

export async function seed(knex: Knex): Promise<void> {
  const senha = bcrypt.hashSync("123456", 10);

  await knex("usuario").insert([
    {
      id: 1,
      nome: "Ana Gestora",
      email: "admin@fcv.org.br",
      senha,
      perfil_id: 1,
    },
    {
      id: 2,
      nome: "Bruno Operador",
      email: "operador@fcv.org.br",
      senha,
      perfil_id: 2,
    },
    {
      id: 3,
      nome: "Carla Souza",
      email: "carla@fcv.org.br",
      senha,
      perfil_id: 3,
    },
    {
      id: 4,
      nome: "Diego Lima",
      email: "diego@fcv.org.br",
      senha,
      perfil_id: 3,
    },
    {
      id: 5,
      nome: "Elisa Rocha",
      email: "elisa@fcv.org.br",
      senha,
      perfil_id: 3,
    },
    {
      id: 6,
      nome: "Fábio Nunes",
      email: "fabio@fcv.org.br",
      senha,
      perfil_id: 3,
      status: "INATIVO",
    },
    {
      id: 7,
      nome: "Farmácia Vida",
      email: "farmacia@parceiro.com",
      senha,
      perfil_id: 4,
    },
    {
      id: 8,
      nome: "Academia Forma",
      email: "academia@parceiro.com",
      senha,
      perfil_id: 4,
    },
    {
      id: 9,
      nome: "Ótica Visão",
      email: "otica@parceiro.com",
      senha,
      perfil_id: 4,
    },
  ]);
}
