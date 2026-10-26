import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import db from "../database/db";
import { acessoModel, motivoBloqueio } from "../models/acessoModel";
import { redefinicaoSenhaModel } from "../models/redefinicaoSenhaModel";
export const authController = {
  async login(req: Request, res: Response) {
    const { email, senha } = req.body ?? {};
    if (!email || !senha) {
      res.status(400).json({ erro: "Informe e-mail e senha" });
      return;
    }
    const usuario = await acessoModel.buscarPorEmail(email);
    const senhaConfere =
      usuario && (await bcrypt.compare(String(senha), usuario.senha));
    if (!senhaConfere) {
      res.status(401).json({ erro: "E-mail ou senha incorretos" });
      return;
    }
    const bloqueio = motivoBloqueio(usuario);
    if (bloqueio) {
      res.status(403).json({ erro: bloqueio });
      return;
    }
    const token = jwt.sign(
      { id: usuario.id, perfil_id: usuario.perfil_id, escopo: usuario.escopo },
      process.env.JWT_SEGREDO as string,
      {
        expiresIn: (process.env.JWT_EXPIRA_EM ||
          "8h") as SignOptions["expiresIn"],
      },
    );
    delete usuario.senha;
    const dados = await acessoModel.buscarDados(usuario.id, usuario.escopo);
    res.json({ token, usuario: { ...usuario, ...dados } });
  },
  async eu(req: Request, res: Response) {
    const usuario = await acessoModel.buscarPorId(res.locals.usuario.id);
    if (!usuario) {
      res.status(404).json({ erro: "Usuário não encontrado" });
      return;
    }
    delete usuario.senha;
    const dados = await acessoModel.buscarDados(usuario.id, usuario.escopo);
    res.json({ ...usuario, ...dados });
  },
  async esqueciSenha(req: Request, res: Response) {
    const { email } = req.body ?? {};
    if (!email) {
      res.status(400).json({ erro: "Informe o e-mail" });
      return;
    }
    const usuario = await db("usuario").where({ email }).first();
    if (usuario) {
      const codigo = String(crypto.randomInt(100000, 1000000));
      const gerado = await redefinicaoSenhaModel.gerarCodigo(usuario.id, await bcrypt.hash(codigo, 10));
      if (gerado && process.env.NODE_ENV !== "production") {
        console.log(`Código de redefinição para ${email}: ${codigo}`);
      }
    }
    res.json({
      mensagem: "Se o e-mail estiver cadastrado, um código foi enviado. Ele vale 15 minutos",
    });
  },
  async redefinirSenha(req: Request, res: Response) {
    const { email, codigo, nova_senha } = req.body ?? {};
    if (!email || !codigo || !nova_senha) {
      res.status(400).json({ erro: "Informe e-mail, código e nova senha" });
      return;
    }
    const alterada = await redefinicaoSenhaModel.redefinir(email, String(codigo), String(nova_senha));
    if (!alterada) {
      res.status(400).json({ erro: "Código inválido ou expirado" });
      return;
    }
    res.json({ mensagem: "Senha alterada" });
  },
  async registrar(req: Request, res: Response) {
    const {
      nome,
      email,
      senha,
      matricula,
      setor,
      cargo,
      data_admissao,
      telefone,
    } = req.body ?? {};
    if (
      !nome ||
      !email ||
      !senha ||
      !matricula ||
      !setor ||
      !cargo ||
      !data_admissao
    ) {
      res.status(400).json({
        erro: "Informe nome, e-mail, senha, matrícula, setor, cargo e data de admissão",
      });
      return;
    }
    const perfil = await db("perfil_acesso")
      .where({ escopo: "COLABORADOR" })
      .first();
    const senhaCriptografada = await bcrypt.hash(String(senha), 10);
    const usuarioId = await db.transaction(async (trx) => {
      const [id] = await trx("usuario").insert({
        nome,
        email,
        senha: senhaCriptografada,
        perfil_id: perfil.id,
        status: "INATIVO",
      });
      await trx("colaborador").insert({
        usuario_id: id,
        matricula,
        setor,
        cargo,
        data_admissao,
        telefone,
      });
      return id;
    });
    const usuario = await acessoModel.buscarPorId(usuarioId);
    delete usuario.senha;
    res.status(201).json({
      mensagem: "Cadastro enviado. Aguarde a FCV liberar o acesso",
      usuario,
    });
  },
};
