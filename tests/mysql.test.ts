import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { Server } from "node:http";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import knex, { type Knex } from "knex";
import mysql, { type Connection } from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
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

  async function escrever(metodo: "POST" | "PUT" | "DELETE", caminho: string, dados?: unknown, token: string | null = tokenFcv) {
    const resposta = await fetch(`${endereco}/${caminho}`, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(dados === undefined ? {} : { body: JSON.stringify(dados) }),
    });
    const texto = await resposta.text();
    return { status: resposta.status, corpo: texto ? JSON.parse(texto) as Registro : {} };
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
  });

  test("histórico próprio pagina somente o colaborador autenticado, preserva legado e ordena com desempate", async () => {
    const legado = await get("eu/utilizacoes", tokenColaborador);
    assert.equal(legado.status, 200);
    assert.deepEqual(legado.corpo.map((r: Registro) => r.id), [2, 1]);
    for (const [pagina, esperado] of [[1, [2]], [2, [1]], [3, []]] as const) {
      const resposta = await get(`eu/utilizacoes?pagina=${pagina}&limite=1`, tokenColaborador);
      assert.equal(resposta.status, 200);
      assert.deepEqual(resposta.corpo.dados.map((r: Registro) => r.id), esperado);
      assert.deepEqual(resposta.corpo.paginacao, { pagina, limite: 1, total: 2, totalPaginas: 2 });
    }
    const ascendente = await get("eu/utilizacoes?ordenarPor=id&ordem=asc", tokenColaborador);
    assert.deepEqual(ascendente.corpo.map((r: Registro) => r.id), [1, 2]);
    const original = await banco!("utilizacao").where({ id: 1 }).first("data_solicitacao");
    try {
      await banco!("utilizacao").where({ id: 1 }).update({ data_solicitacao: "2026-10-24 23:59:59" });
      const a = await get("eu/utilizacoes?pagina=1&limite=1", tokenColaborador);
      const b = await get("eu/utilizacoes?pagina=2&limite=1", tokenColaborador);
      assert.deepEqual(a.corpo.dados.map((r: Registro) => r.id), [1]);
      assert.deepEqual(b.corpo.dados.map((r: Registro) => r.id), [2]);
      assert.equal(a.corpo.paginacao.total, 2);
    } finally {
      await banco!("utilizacao").where({ id: 1 }).update({ data_solicitacao: original.data_solicitacao });
    }
  });

  test("histórico do conveniado conta apenas o estabelecimento atual nas duas origens", async () => {
    await banco!("perfil_acesso").where({ id: 3 }).update({ status: "ATIVO" });
    const token = jwt.sign({ id: 4, escopo: "CONVENIADO" }, process.env.JWT_SEGREDO!, { expiresIn: "5m" });
    try {
      const legado = await get("eu/utilizacoes", token);
      assert.equal(legado.status, 200);
      assert.deepEqual(legado.corpo.map((r: Registro) => r.id), [1, 4]);
      const pagina = await get("eu/utilizacoes?limite=1&ordenarPor=id&ordem=desc", token);
      assert.equal(pagina.status, 200);
      assert.deepEqual(pagina.corpo.dados.map((r: Registro) => r.id), [4]);
      assert.equal(pagina.corpo.paginacao.total, 2);
      const filtrada = await get("eu/utilizacoes?de=2026-10-24&ate=2026-10-24&limite=1", token);
      assert.deepEqual(filtrada.corpo.dados.map((r: Registro) => r.id), [1]);
      assert.equal(filtrada.corpo.paginacao.total, 1);
    } finally {
      await banco!("perfil_acesso").where({ id: 3 }).update({ status: "INATIVO" });
    }
  });

  test("histórico próprio valida datas, intervalo, paginação e proíbe substituir o dono pela query", async () => {
    for (const query of [
      "ate=2026-02-30", "de=0999-12-31", "de=2026-10-25&ate=2026-10-24", "de=2026-10-24&de=2026-10-25",
      "pagina=0", "limite=101", "status=ATIVO", "ordenarPor=senha", "ordem=SQL",
      "colaborador_id=2", "conveniado_id=2", "desconhecido=1",
    ]) {
      const resposta = await get(`eu/utilizacoes?${query}`, tokenColaborador);
      assert.equal(resposta.status, 400, query);
      assert.equal(typeof resposta.corpo.erro, "string");
    }
    const dia = await get("eu/utilizacoes?de=2026-10-24&ate=2026-10-24&limite=100", tokenColaborador);
    assert.equal(dia.status, 200);
    assert.deepEqual(dia.corpo.dados.map((r: Registro) => r.id), [2, 1]);
    assert.equal(dia.corpo.paginacao.total, 2);
    const vazia = await get("eu/utilizacoes?status=APROVADA&limite=1", tokenColaborador);
    assert.deepEqual(vazia.corpo, { dados: [], paginacao: { pagina: 1, limite: 1, total: 0, totalPaginas: 0 } });
    assert.equal((await get("eu/utilizacoes", null)).status, 401);
    assert.equal((await get("eu/utilizacoes", tokenFcv)).status, 403);
  });

  test("utilizações filtram benefício comum e item de campanha em espaços de IDs separados", async () => {
    const comum = await get("utilizacoes?beneficio_id=1&limite=1");
    assert.equal(comum.status, 200);
    assert.deepEqual(comum.corpo.dados.map((r: Registro) => r.id), [1]);
    assert.equal(comum.corpo.paginacao.total, 1);
    const campanha = await get("utilizacoes?beneficio_campanha_id=1&limite=1");
    assert.equal(campanha.status, 200);
    assert.deepEqual(campanha.corpo.dados.map((r: Registro) => r.id), [2]);
    assert.equal(campanha.corpo.paginacao.total, 1);
    const combinada = await get("utilizacoes?beneficio_id=1&beneficio_campanha_id=1&limite=1");
    assert.equal(combinada.status, 200);
    assert.deepEqual(combinada.corpo.dados, []);
    assert.equal(combinada.corpo.paginacao.total, 0);
    assert.equal((await get("utilizacoes?beneficio_id=0")).status, 400);
    assert.equal((await get("utilizacoes?beneficio_campanha_id=true")).status, 400);
  });

  test("CRUD de usuários rejeita senha vazia sem persistir usuário nem alterar hash", async () => {
    const antes = await banco!("usuario").count({ total: "*" }).first();
    const hash = (await banco!("usuario").where({ id: 2 }).first("senha")).senha;
    const nova = await escrever("POST", "usuarios", { nome: "Entrada inválida", email: "senha-vazia@example.test", senha: "", perfil_id: 2 });
    assert.equal(nova.status, 400);
    const alteracao = await escrever("PUT", "usuarios/2", { senha: "" });
    assert.equal(alteracao.status, 400);
    assert.equal((await banco!("usuario").where({ id: 2 }).first("senha")).senha, hash);
    assert.deepEqual(await banco!("usuario").count({ total: "*" }).first(), antes);
  });

  test("validação HTTP rejeita coerções de IDs e data de admissão inexistente", async () => {
    const antes = await banco!("usuario").count({ total: "*" }).first();
    for (const id of [true, [1], {}, Number.MAX_SAFE_INTEGER + 1, "1e0"]) {
      const usuario = await escrever("POST", "usuarios", { nome: "ID inválido", email: "id-invalido@example.test", senha: "senha-teste-valida", perfil_id: id });
      assert.equal(usuario.status, 400, JSON.stringify(id));
      const oferta = await escrever("POST", "ofertas", { beneficio_id: id, conveniado_id: 1 });
      assert.equal(oferta.status, 400, JSON.stringify(id));
    }
    const dataAntes = (await banco!("colaborador").where({ id: 1 }).first("data_admissao")).data_admissao;
    const data = await escrever("PUT", "colaboradores/1", { data_admissao: "2026-02-30" });
    assert.equal(data.status, 400);
    assert.equal((await banco!("colaborador").where({ id: 1 }).first("data_admissao")).data_admissao, dataAntes);
    assert.deepEqual(await banco!("usuario").count({ total: "*" }).first(), antes);
  });

  test("auth/eu preserva campos públicos e limita os vínculos ao escopo e ao DTO", async () => {
    await banco!.schema.alterTable("colaborador", tabela => tabela.string("campo_interno_auditoria").nullable());
    await banco!("colaborador").where({ id: 1 }).update({ campo_interno_auditoria: "não deve sair do banco" });
    try {
      const colab = await get("auth/eu", tokenColaborador);
      assert.equal(colab.status, 200);
      assert.equal(colab.corpo.id, 1);
      assert.equal(colab.corpo.nome, "Ana");
      assert.equal(colab.corpo.email, "fixture1@example.test");
      assert.equal(colab.corpo.escopo, "COLABORADOR");
      assert.equal(colab.corpo.status, "ATIVO");
      assert.equal(colab.corpo.colaborador.matricula, "M1");
      assert.equal(colab.corpo.colaborador.setor, "Ensino");
      assert.equal(colab.corpo.colaborador.cargo, "Técnico");
      assert.equal(colab.corpo.conveniado, null);
      assert.ok(!Object.hasOwn(colab.corpo, "senha"));
      assert.ok(!Object.hasOwn(colab.corpo.colaborador, "campo_interno_auditoria"));
      await banco!("usuario").where({ id: 1 }).update({ perfil_id: 1 });
      const fcvComVinculo = await get("auth/eu", tokenColaborador);
      assert.equal(fcvComVinculo.status, 200);
      assert.equal(fcvComVinculo.corpo.escopo, "FCV");
      assert.equal(fcvComVinculo.corpo.colaborador, null);
      assert.equal(fcvComVinculo.corpo.conveniado, null);
      await banco!("perfil_acesso").where({ id: 3 }).update({ status: "ATIVO" });
      const token = jwt.sign({ id: 4, escopo: "CONVENIADO" }, process.env.JWT_SEGREDO!, { expiresIn: "5m" });
      const conv = await get("auth/eu", token);
      assert.equal(conv.status, 200);
      assert.equal(conv.corpo.colaborador, null);
      assert.equal(conv.corpo.conveniado.id, 1);
      assert.equal(conv.corpo.conveniado.nome_fantasia, "Loja 1");
    } finally {
      await banco!("usuario").where({ id: 1 }).update({ perfil_id: 2 });
      await banco!("perfil_acesso").where({ id: 3 }).update({ status: "INATIVO" });
      await banco!.schema.alterTable("colaborador", tabela => tabela.dropColumn("campo_interno_auditoria"));
    }
  });

  test("erro real de duplicidade devolve 409 sem SQL, detalhe interno ou dado da consulta", async () => {
    const resposta = await escrever("POST", "auth/registrar", {
      nome: "Duplicado", email: "fixture1@example.test", senha: "senha-teste-valida", matricula: "MAT-DUPLICADA",
      setor: "Ensino", cargo: "Técnico", data_admissao: "2026-01-10",
    }, null);
    assert.equal(resposta.status, 409);
    assert.deepEqual(Object.keys(resposta.corpo), ["erro"]);
    assert.doesNotMatch(JSON.stringify(resposta.corpo), /fixture1|insert into|sqlMessage|sqlState|ER_DUP_ENTRY|detalhe/i);
  });

  test("redefinição concorrente tem um vencedor e a senha final pertence a ele", async () => {
    const email = "fixture2@example.test";
    const codigo = "739152";
    const senhas = ["nova-senha-teste-A", "nova-senha-teste-B"];
    const original = (await banco!("usuario").where({ id: 2 }).first("senha")).senha;
    await banco!("redefinicao_senha").where({ usuario_id: 2 }).delete();
    await banco!("redefinicao_senha").insert({ usuario_id: 2, codigo: await bcrypt.hash(codigo, 10), expira_em: banco!.raw("DATE_ADD(NOW(), INTERVAL 15 MINUTE)") });
    try {
      const respostas = await Promise.all(senhas.map(nova_senha => escrever("POST", "auth/redefinir-senha", { email, codigo, nova_senha }, null)));
      assert.deepEqual(respostas.map(r => r.status).sort(), [200, 400]);
      const vencedor = respostas.findIndex(r => r.status === 200);
      const salvo = (await banco!("usuario").where({ id: 2 }).first("senha")).senha;
      assert.equal(await bcrypt.compare(senhas[vencedor], salvo), true);
      assert.equal(await bcrypt.compare(senhas[1 - vencedor], salvo), false);
      assert.equal(Number((await banco!("redefinicao_senha").where({ usuario_id: 2 }).first()).usado), 1);
      const repetida = await escrever("POST", "auth/redefinir-senha", { email, codigo, nova_senha: "outra-senha-teste" }, null);
      assert.equal(repetida.status, 400);
      assert.equal((await banco!("usuario").where({ id: 2 }).first("senha")).senha, salvo);
      const login = await escrever("POST", "auth/login", { email, senha: senhas[vencedor] }, null);
      assert.equal(login.status, 200);
      assert.equal(typeof login.corpo.token, "string");
      assert.ok(!Object.hasOwn(login.corpo.usuario, "senha"));
    } finally {
      await banco!("usuario").where({ id: 2 }).update({ senha: original });
      await banco!("redefinicao_senha").where({ usuario_id: 2 }).delete();
    }
  });

  test("tentativas concorrentes inválidas respeitam o limite sem liberar um código bloqueado", async () => {
    const original = (await banco!("usuario").where({ id: 2 }).first("senha")).senha;
    await banco!("redefinicao_senha").where({ usuario_id: 2 }).delete();
    await banco!("redefinicao_senha").insert({ usuario_id: 2, codigo: await bcrypt.hash("739152", 10), expira_em: banco!.raw("DATE_ADD(NOW(), INTERVAL 15 MINUTE)") });
    try {
      const respostas = await Promise.all(Array.from({ length: 6 }, () => escrever("POST", "auth/redefinir-senha", { email: "fixture2@example.test", codigo: "000000", nova_senha: "nova-senha-teste" }, null)));
      assert.ok(respostas.every(r => r.status === 400));
      const pedido = await banco!("redefinicao_senha").where({ usuario_id: 2 }).first();
      assert.equal(pedido.tentativas, 5);
      const correto = await escrever("POST", "auth/redefinir-senha", { email: "fixture2@example.test", codigo: "739152", nova_senha: "nova-senha-teste" }, null);
      assert.equal(correto.status, 400);
      assert.equal((await banco!("usuario").where({ id: 2 }).first("senha")).senha, original);
    } finally {
      await banco!("redefinicao_senha").where({ usuario_id: 2 }).delete();
    }
  });

  test("permissões de escrita e estados atuais continuam validados após as correções", async () => {
    await banco!("perfil_acesso").where({ id: 1 }).update({ nome: "FCV_OPERADOR" });
    try {
      assert.equal((await escrever("PUT", "usuarios/2", { nome: "Nome proibido" })).status, 403);
      assert.equal((await escrever("POST", "perfis", { nome: "Perfil proibido", escopo: "FCV" })).status, 403);
    } finally {
      await banco!("perfil_acesso").where({ id: 1 }).update({ nome: "FCV_ADMINISTRADOR" });
    }
    await banco!("colaborador").where({ id: 1 }).update({ status: "AFASTADO" });
    try {
      assert.equal((await get("auth/eu", tokenColaborador)).status, 403);
      assert.equal((await get("eu/utilizacoes?limite=1", tokenColaborador)).status, 403);
    } finally {
      await banco!("colaborador").where({ id: 1 }).update({ status: "ATIVO" });
    }
  });

  test("cancelamento e exclusão de cadastro mantêm o histórico no MySQL", async () => {
    for (const [id, esperado] of [[1, "REPROVADA"], [3, "ESTORNADA"]] as const) {
      const antes = await banco!("utilizacao").where({ id }).first();
      try {
        const resposta = await escrever("DELETE", `utilizacoes/${id}`);
        assert.equal(resposta.status, 200);
        assert.equal(resposta.corpo.status, esperado);
        const salvo = await banco!("utilizacao").where({ id }).first();
        assert.equal(salvo.status, esperado);
        assert.equal(salvo.token_qrcode, antes.token_qrcode);
        assert.equal((await escrever("DELETE", `utilizacoes/${id}`)).status, 409);
      } finally {
        await banco!("utilizacao").where({ id }).update({ status: antes.status, observacoes: antes.observacoes });
      }
    }
    assert.equal((await escrever("DELETE", "beneficios/1")).status, 409);
    assert.ok(await banco!("beneficio").where({ id: 1 }).first());
    assert.ok(await banco!("utilizacao").where({ id: 1 }).first());
  });
});

async function inserirFixtures(banco: Knex) {
  await banco("perfil_acesso").insert([
    { id: 1, nome: "FCV_ADMINISTRADOR", escopo: "FCV", status: "ATIVO" },
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
