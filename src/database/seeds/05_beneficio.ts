
import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("beneficio").insert([
    {
      id: 1,
      nome: "Desconto em farmácia",
      descricao: "15% de desconto em medicamentos",
      tipo_beneficio: "PERCENTUAL",
      valor: 15,
      quantidade_maxima_utilizacoes: 4,
      tipo_janela: "CALENDARIO_FIXO",
      unidade_ciclo: "MES",
    },
    {
      id: 2,
      nome: "Mensalidade de academia",
      descricao: "R$ 50,00 de desconto na mensalidade",
      tipo_beneficio: "VALOR_FIXO",
      valor: 50,
      quantidade_maxima_utilizacoes: 1,
      tipo_janela: "JANELA_MOVEL",
      intervalo_valor: 30,
      intervalo_unidade: "DIA",
      referencia_contagem: "ULTIMA_UTILIZACAO",
    },
    {
      id: 3,
      nome: "Óculos de grau",
      descricao: "20% de desconto em armação e lentes",
      tipo_beneficio: "PERCENTUAL",
      valor: 20,
      quantidade_maxima_utilizacoes: 1,
      tipo_janela: "CALENDARIO_FIXO",
      unidade_ciclo: "ANO",
    },
  ]);
}
