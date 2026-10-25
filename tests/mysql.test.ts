import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { Server } from "node:http";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import knex, { type Knex } from "knex";
import mysql, { type Connection } from "mysql2/promise";
import jwt from "jsonwebtoken";
import { criarBaseListagem, recursosListagem, type NomeRecursoListagem } from "../src/queries/recursos";
import { listarComConsulta } from "../src/queries/listagem";

const habilitado = process.env.FCV_TEST_MYSQL === "1";
const nomes = Object.keys(recursosListagem) as NomeRecursoListagem[];
const rotasFcv = ["perfis", "usuarios", "colaboradores", "utilizacoes"];
type Registro = Record<string, any>;
type Pagina = { dados: Registro[]; paginacao: { pagina: number; limite: number; total: number; totalPaginas: number } };

describe("listagens HTTP com MySQL real em banco novo e isolado", { skip: !habilitado && "Defina FCV_TEST_MYSQL=1 e um DB_NOME exclusivo fcv_sprint4_test_... para executar" }, () => {
  let administrador: Connection | undefined;
  let banco: Knex | undefined;
  let server: Server | undefined;
  let criado = false;
  let endereco = "";
  let tokenFcv = "";
  let tokenColaborador = "";
  let nomeBanco = "";

  before(async () => {
    nomeBanco = process.env.DB_NOME ?? "";
    assert.match(nomeBanco, /^fcv_sprint4_test_[a-z0-9_]+$/, "A suíte só aceita um banco NOVO com prefixo fcv_sprint4_test_");
    assert.ok(nomeBanco.length <= 64, "Nome do banco acima do limite do MySQL");
    assert.ok(["127.0.0.1", "localhost", "::1"].includes(process.env.DB_HOST ?? ""), "Use apenas MySQL local para este teste");
    const porta = Number(process.env.DB_PORTA);
    assert.ok(Number.isInteger(porta) && porta > 0 && porta <= 65535, "Informe DB_PORTA válida");
    assert.ok(process.env.DB_USUARIO, "Informe o usuário do MySQL de teste");
    assert.notEqual(process.env.DB_SENHA, undefined, "Informe DB_SENHA, mesmo se for vazia no servidor descartável");

    const conexao = { host: process.env.DB_HOST!, port: porta, user: process.env.DB_USUARIO!, password: process.env.DB_SENHA! };
    administrador = await mysql.createConnection(conexao);
    // Sem IF NOT EXISTS: não reaproveitar, limpar ou migrar um banco preexistente.
    await administrador.query("CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", [nomeBanco]);
    criado = true;
    banco = knex({ client: "mysql2", connection: { ...conexao, database: nomeBanco, dateStrings: true, decimalNumbers: true } });
    await banco.migrate.latest({ directory: path.resolve("src/database/migrations"), loadExtensions: [".ts"] });
    await inserirFixtures(banco);

    // Nunca carregar um arquivo .env ou segredo real na inicialização do app de teste.
    process.env.DOTENV_CONFIG_PATH = path.join(process.cwd(), `.__env_teste_ausente_${randomUUID()}`);
    process.env.DOTENV_CONFIG_OVERRIDE = "false";
    process.env.JWT_SEGREDO = randomUUID();
    // O projeto é CommonJS: require adiado evita a inicialização antes do ambiente isolado.
    const app = require("../src/app").default as import("express").Express;
    const iniciado = app.listen(0, "127.0.0.1");
    server = iniciado;
    await once(iniciado, "listening");
    const address = iniciado.address();
    assert.ok(address && typeof address !== "string");
    endereco = `http://127.0.0.1:${address.port}/api/v1`;
    tokenFcv = jwt.sign({ id: 7, escopo: "FCV" }, process.env.JWT_SEGREDO, { expiresIn: "5m" });
    tokenColaborador = jwt.sign({ id: 1, escopo: "COLABORADOR" }, process.env.JWT_SEGREDO, { expiresIn: "5m" });
  });

  after(async () => {
    if (server) await new Promise<void>((resolve, reject) => server!.close(erro => erro ? reject(erro) : resolve()));
    if (server) {
      const bancoApp = require("../src/database/db").default as Knex;
      await bancoApp.destroy();
    }
    await banco?.destroy();
    if (administrador) {
      // Só remover o banco criado com sucesso por ESTA execução, nunca o banco de apresentação.
      if (criado && /^fcv_sprint4_test_[a-z0-9_]+$/.test(nomeBanco)) await administrador.query("DROP DATABASE ??", [nomeBanco]);
      await administrador.end();
    }
  });

  async function get(caminho: string, token: string | null = tokenFcv) {
    const resposta = await fetch(`${endereco}/${caminho}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return { status: resposta.status, corpo: await resposta.json() as any };
  }

  for (const nome of nomes) {
    test(`${nome}: legado completo, duas páginas, total filtrado e página vazia`, async () => {
      const legado = await get(nome);
      assert.equal(legado.status, 200);
      assert.ok(Array.isArray(legado.corpo));
      assert.ok(legado.corpo.length >= 3);
      assert.deepEqual(legado.corpo.map((r: Registro) => r.id), [...legado.corpo].map((r: Registro) => r.id).sort((a: number, b: number) => a - b));
      const primeira = await get(`${nome}?pagina=1&limite=2`);
      const segunda = await get(`${nome}?pagina=2&limite=2`);
      assert.equal(primeira.status, 200);
      assert.equal(segunda.status, 200);
      const p1 = primeira.corpo as Pagina;
      const p2 = segunda.corpo as Pagina;
      assert.deepEqual(p1.paginacao, { pagina: 1, limite: 2, total: legado.corpo.length, totalPaginas: Math.ceil(legado.corpo.length / 2) });
      assert.equal(p2.paginacao.total, legado.corpo.length);
      assert.ok(p1.dados.every(a => p2.dados.every(b => a.id !== b.id)));
      const fora = await get(`${nome}?pagina=100&limite=2`);
      assert.deepEqual(fora.corpo.dados, []);
      assert.equal(fora.corpo.paginacao.total, legado.corpo.length);

      const status = legado.corpo[0].status;
      const esperado = legado.corpo.filter((r: Registro) => r.status === status);
      const filtrada = await get(`${nome}?status=${encodeURIComponent(status)}&limite=1`);
      assert.equal(filtrada.status, 200);
      assert.equal(filtrada.corpo.paginacao.total, esperado.length);
      assert.equal(filtrada.corpo.dados.length, Math.min(1, esperado.length));
      const filtradaLegada = await get(`${nome}?status=${encodeURIComponent(status)}`);
      assert.ok(Array.isArray(filtradaLegada.corpo));
      assert.equal(filtradaLegada.corpo.length, esperado.length);

      const descendente = await get(`${nome}?ordenarPor=id&ordem=desc`);
      assert.deepEqual(descendente.corpo.map((r: Registro) => r.id), [...legado.corpo].reverse().map((r: Registro) => r.id));
    });
  }

  test("busca combinada: nome vinculado, agrupamento e DTO de colaborador", async () => {
    const r = await get("colaboradores?busca=Ana&status=ATIVO&limite=1&ordenarPor=nome");
    assert.equal(r.status, 200);
    assert.equal(r.corpo.paginacao.total, 1);
    assert.equal(r.corpo.dados[0].id, 1);
    assert.ok(!("nome" in r.corpo.dados[0]));
    assert.ok(!("email" in r.corpo.dados[0]));
    assert.ok(!("senha" in r.corpo.dados[0]));
    const bloqueada = await get("colaboradores?busca=Carla&status=ATIVO&pagina=1");
    assert.deepEqual(bloqueada.corpo.dados, []);
    assert.equal(bloqueada.corpo.paginacao.total, 0);
  });

  test("ordenação por campo repetido usa id para desempatar páginas", async () => {
    const a = await get("beneficios?nome=Mesmo%20nome&ordenarPor=nome&pagina=1&limite=1");
    const b = await get("beneficios?nome=Mesmo%20nome&ordenarPor=nome&pagina=2&limite=1");
    assert.equal(a.corpo.paginacao.total, 2);
    assert.equal(a.corpo.dados[0].id, 1);
    assert.equal(b.corpo.dados[0].id, 2);
  });

  test("busca é substring literal: %, _ e ! não viram coringas SQL", async () => {
    const r = await get(`beneficios?busca=${encodeURIComponent("100%_!")}&pagina=1`);
    assert.equal(r.status, 200);
    assert.deepEqual(r.corpo.dados.map((x: Registro) => x.id), [3]);
    assert.equal(r.corpo.paginacao.total, 1);
    const vazio = await get("beneficios?busca=ausente-na-fixture&pagina=1");
    assert.deepEqual(vazio.corpo, { dados: [], paginacao: { pagina: 1, limite: 20, total: 0, totalPaginas: 0 } });
  });

  test("usuários nunca devolvem senha nas duas formas de resposta", async () => {
    for (const caminho of ["usuarios", "usuarios?limite=100"]) {
      const r = await get(caminho);
      const registros = Array.isArray(r.corpo) ? r.corpo : r.corpo.dados;
      assert.ok(registros.length > 0);
      assert.ok(registros.every((x: Registro) => !Object.hasOwn(x, "senha")));
    }
  });

  test("data final de utilização inclui todo o dia; campanha considera sobreposição", async () => {
    const utilizacoes = await get("utilizacoes?dataInicio=2026-10-24&dataFim=2026-10-24&limite=100");
    assert.equal(utilizacoes.status, 200);
    assert.deepEqual(utilizacoes.corpo.dados.map((x: Registro) => x.id), [1, 2, 5]);
    assert.equal(utilizacoes.corpo.paginacao.total, 3);
    const campanhas = await get("campanhas?dataInicio=2026-10-24&dataFim=2026-10-24&pagina=1");
    assert.equal(campanhas.status, 200);
    assert.deepEqual(campanhas.corpo.dados.map((x: Registro) => x.id), [1]);
  });

  test("conveniado de utilização respeita origem comum/promocional mesmo com IDs iguais", async () => {
    const r = await get("utilizacoes?conveniado_id=1&pagina=1&limite=100");
    assert.equal(r.status, 200);
    assert.deepEqual(r.corpo.dados.map((x: Registro) => x.id), [1, 4]);
    assert.equal(r.corpo.paginacao.total, 2);
    const promocional = await get("utilizacoes?conveniado_id=2&origem=CAMPANHA&pagina=1");
    assert.deepEqual(promocional.corpo.dados.map((x: Registro) => x.id), [2]);
    assert.equal(promocional.corpo.paginacao.total, 1);
  });

  test("dados e total preservam um escopo preexistente na consulta-base", async () => {
    const base = criarBaseListagem(banco!, "utilizacoes").where("utilizacao.colaborador_id", 1);
    const r = await listarComConsulta(base, { pagina: "1", limite: "1", status: "PENDENTE" }, recursosListagem.utilizacoes);
    assert.ok(!Array.isArray(r));
    assert.equal(r.paginacao.total, 2);
    assert.equal(r.dados.length, 1);
    assert.ok(r.dados.every(x => x.colaborador_id === 1));
    assert.equal(base.toSQL().bindings.length, 1, "O builder original não foi alterado");
  });

  test("parâmetros inválidos retornam 400 sem executar SQL inválido", async () => {
    const casos = [
      "beneficios?pagina=0", "beneficios?pagina=1.5", "beneficios?limite=101", "beneficios?limite=-1",
      "beneficios?pagina=1&pagina=2", "beneficios?busca=", "beneficios?campoDesconhecido=1",
      "beneficios?ordenarPor=senha", "beneficios?ordem=DROP", "beneficios?status=PENDENTE",
      "colaboradores?usuario_id=NaN", "usuarios?perfil_id=0", "ofertas?busca=nome",
      "utilizacoes?dataInicio=2026-02-30", "utilizacoes?dataFim=2026-10-23&dataInicio=2026-10-24",
    ];
    for (const caminho of casos) {
      const r = await get(caminho);
      assert.equal(r.status, 400, caminho);
      assert.equal(typeof r.corpo.erro, "string");
      assert.ok(!Object.hasOwn(r.corpo, "sql"));
    }
  });

  test("as dez listagens continuam exigindo token; quatro rotas preservam escopo FCV", async () => {
    for (const nome of nomes) assert.equal((await get(`${nome}?pagina=1`, null)).status, 401, nome);
    for (const nome of rotasFcv) assert.equal((await get(`${nome}?pagina=1`, tokenColaborador)).status, 403, nome);
    assert.equal((await get("beneficios?pagina=1", "token-invalido")).status, 401);
    // Esta suíte verifica os guards existentes; papéis/admin e estados atuais são a entrega de Heitor.
  });
});

async function inserirFixtures(banco: Knex) {
  await banco("perfil_acesso").insert([
    { id: 1, nome: "Administrador teste", escopo: "FCV", status: "ATIVO" },
    { id: 2, nome: "Colaborador teste", escopo: "COLABORADOR", status: "ATIVO" },
    { id: 3, nome: "Conveniado teste", escopo: "CONVENIADO", status: "INATIVO" },
  ]);
  await banco("usuario").insert(["Ana", "Bruno", "Carla", "Loja A", "Loja B", "Loja C", "Administrador"].map((nome, i) => ({
    id: i + 1, nome, email: `fixture${i + 1}@example.test`, senha: "hash-apenas-fixture-nao-usado-para-login",
    perfil_id: i < 3 ? 2 : i < 6 ? 3 : 1, status: i === 5 ? "INATIVO" : "ATIVO", data_criacao: "2026-10-24 12:00:00",
  })));
  await banco("colaborador").insert([1, 2, 3].map(id => ({ id, usuario_id: id, matricula: `M${id}`, setor: "Ensino", cargo: "Técnico", data_admissao: "2026-01-10", status: id === 3 ? "AFASTADO" : "ATIVO" })));
  await banco("conveniado").insert([1, 2, 3].map(id => ({ id, usuario_id: id + 3, nome_fantasia: `Loja ${id}`, razao_social: `Loja ${id} LTDA`, categoria: "Alimentação", cnpj: `${id}`.padStart(14, "0"), endereco: `Rua ${id}`, status: id === 3 ? "EM_ANALISE" : "ATIVO" })));
  await banco("beneficio").insert([1, 2, 3].map(id => ({ id, nome: id < 3 ? "Mesmo nome" : "Plano 100%_!", descricao: id === 2 ? "Plano 100XX!" : "Benefício teste", tipo_beneficio: "VALOR_FIXO", valor: 10, quantidade_maxima_utilizacoes: 2, tipo_janela: "CALENDARIO_FIXO", unidade_ciclo: "MES", status: id === 3 ? "INATIVO" : "ATIVO" })));
  await banco("beneficio_conveniado").insert([1, 2, 3].map(id => ({ id, beneficio_id: id, conveniado_id: id, status: id === 3 ? "INATIVO" : "ATIVO" })));
  await banco("campanha_evento").insert([
    { id: 1, nome: "Campanha vigente", tipo: "CAMPANHA", data_inicio: "2026-10-01", data_fim: "2026-10-31", status: "ATIVA" },
    { id: 2, nome: "Campanha futura", tipo: "CAMPANHA", data_inicio: "2026-11-01", data_fim: "2026-11-30", status: "PLANEJADA" },
    { id: 3, nome: "Campanha encerrada", tipo: "EVENTO_INTERNO", data_inicio: "2026-09-01", data_fim: "2026-09-30", status: "ENCERRADA" },
  ]);
  await banco("beneficio_campanha").insert([1, 2, 3].map(id => ({ id, campanha_id: id, nome: `Item ${id}`, descricao: "Item de teste", tipo_beneficio: "VALOR_FIXO", valor: 5, status: id === 3 ? "INATIVO" : "ATIVO" })));
  await banco("beneficio_campanha_conveniado").insert([1, 2, 3].map(id => ({ id, beneficio_campanha_id: id, conveniado_id: id === 1 ? 2 : id === 2 ? 1 : 3, status: id === 3 ? "INATIVO" : "ATIVO" })));
  await banco("utilizacao").insert([
    { id: 1, colaborador_id: 1, beneficio_conveniado_id: 1, beneficio_campanha_conveniado_id: null, data_solicitacao: "2026-10-24 00:00:00", status: "PENDENTE" },
    { id: 2, colaborador_id: 1, beneficio_conveniado_id: null, beneficio_campanha_conveniado_id: 1, data_solicitacao: "2026-10-24 23:59:59", status: "PENDENTE" },
    { id: 3, colaborador_id: 2, beneficio_conveniado_id: 2, beneficio_campanha_conveniado_id: null, data_solicitacao: "2026-10-25 00:00:00", status: "APROVADA" },
    { id: 4, colaborador_id: 2, beneficio_conveniado_id: null, beneficio_campanha_conveniado_id: 2, data_solicitacao: "2026-10-23 10:00:00", status: "PENDENTE" },
    { id: 5, colaborador_id: 3, beneficio_conveniado_id: 3, beneficio_campanha_conveniado_id: null, data_solicitacao: "2026-10-24 12:30:00", status: "ESTORNADA" },
  ].map(r => ({ ...r, token_qrcode: randomUUID(), valor_aplicado: 5 })));
}
