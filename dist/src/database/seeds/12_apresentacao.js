"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function seed(knex) {
    const senha = bcryptjs_1.default.hashSync("123456", 10);
    await knex("usuario").insert([
        { id: 10, nome: "Drogaria Popular", email: "drogaria@parceiro.com", senha, perfil_id: 4 },
        { id: 11, nome: "Sabor Mineiro", email: "restaurante@parceiro.com", senha, perfil_id: 4 },
        { id: 12, nome: "Cine Muriaé", email: "cinema@parceiro.com", senha, perfil_id: 4 },
        { id: 13, nome: "Studio Equilíbrio", email: "pilates@parceiro.com", senha, perfil_id: 4 },
    ]);
    await knex("conveniado").insert([
        {
            id: 4,
            usuario_id: 10,
            nome_fantasia: "Drogaria Popular",
            razao_social: "Popular Drogarias Ltda",
            cnpj: "44555666000154",
            endereco: "Rua Barão do Monte Alto, 310, Muriaé",
            status: "ATIVO",
        },
        {
            id: 5,
            usuario_id: 11,
            nome_fantasia: "Restaurante Sabor Mineiro",
            razao_social: "Sabor Mineiro Alimentos ME",
            cnpj: "55666777000145",
            endereco: "Praça João Pinheiro, 22, Muriaé",
            status: "ATIVO",
        },
        {
            id: 6,
            usuario_id: 12,
            nome_fantasia: "Cine Muriaé",
            razao_social: "Cine Muriaé Entretenimento Ltda",
            cnpj: "66777888000136",
            endereco: "Av. Maestro Sansão, 236, Muriaé",
            status: "ATIVO",
        },
        {
            id: 7,
            usuario_id: 13,
            nome_fantasia: "Studio Equilíbrio Pilates",
            razao_social: "Equilíbrio Pilates e Fisioterapia Ltda",
            cnpj: "77888999000127",
            endereco: "Rua Santos Dumont, 95, Muriaé",
            status: "ATIVO",
        },
    ]);
    await knex("conveniado_categoria").insert([
        { conveniado_id: 4, categoria_id: 1 },
        { conveniado_id: 4, categoria_id: 2 },
        { conveniado_id: 5, categoria_id: 5 },
        { conveniado_id: 6, categoria_id: 6 },
        { conveniado_id: 6, categoria_id: 7 },
        { conveniado_id: 7, categoria_id: 3 },
        { conveniado_id: 7, categoria_id: 2 },
    ]);
    await knex("beneficio").insert([
        {
            id: 4,
            nome: "Almoço com desconto",
            descricao: "10% de desconto no almoço de segunda a sexta",
            tipo_beneficio: "PERCENTUAL",
            valor: 10,
            quantidade_maxima_utilizacoes: 8,
            tipo_janela: "CALENDARIO_FIXO",
            unidade_ciclo: "MES",
        },
        {
            id: 5,
            nome: "Ingresso de cinema",
            descricao: "R$ 15,00 de desconto no ingresso de qualquer sessão",
            tipo_beneficio: "VALOR_FIXO",
            valor: 15,
            quantidade_maxima_utilizacoes: 2,
            tipo_janela: "CALENDARIO_FIXO",
            unidade_ciclo: "MES",
        },
        {
            id: 6,
            nome: "Aula de pilates",
            descricao: "20% de desconto no plano mensal de pilates",
            tipo_beneficio: "PERCENTUAL",
            valor: 20,
            quantidade_maxima_utilizacoes: 1,
            tipo_janela: "JANELA_MOVEL",
            intervalo_valor: 30,
            intervalo_unidade: "DIA",
            referencia_contagem: "ULTIMA_UTILIZACAO",
        },
    ]);
    await knex("beneficio_conveniado").insert([
        { id: 4, beneficio_id: 1, conveniado_id: 4 },
        { id: 5, beneficio_id: 4, conveniado_id: 5 },
        { id: 6, beneficio_id: 5, conveniado_id: 6 },
        { id: 7, beneficio_id: 6, conveniado_id: 7 },
        { id: 8, beneficio_id: 2, conveniado_id: 7 },
    ]);
}
