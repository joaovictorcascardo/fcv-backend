import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("colaborador").insert([
    {
      id: 1, usuario_id: 3, matricula: "FCV0001", setor: "Enfermagem",
      cargo: "Enfermeira", data_admissao: "2019-03-11", telefone: "32999990001",
    },
    {
      id: 2, usuario_id: 4, matricula: "FCV0002", setor: "Administrativo",
      cargo: "Assistente administrativo", data_admissao: "2021-08-02", telefone: "32999990002",
    },
    {
      id: 3, usuario_id: 5, matricula: "FCV0003", setor: "Laboratório",
      cargo: "Biomédica", data_admissao: "2023-01-16", status: "AFASTADO",
    },
    {
      id: 4, usuario_id: 6, matricula: "FCV0004", setor: "Recepção",
      cargo: "Recepcionista", data_admissao: "2018-05-21", status: "INATIVO",
    },
  ]);
}
