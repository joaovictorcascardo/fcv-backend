import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import db from "../database/db";

function buscarUsuarioComPerfil() {
  return db("usuario")
    .join("perfil_acesso", "perfil_acesso.id", "usuario.perfil_id")
    .select(
      "usuario.*",
      "perfil_acesso.nome as perfil",
      "perfil_acesso.escopo",
    );
}

export const authController = {
  async login(req: Request, res: Response) {
    const { email, senha } = req.body ?? {};
    if (!email || !senha) {
      res.status(400).json({ erro: "Informe e-mail e senha" });
      return;
    }

    const usuario = await buscarUsuarioComPerfil()
      .where("usuario.email", email)
      .first();
    const senhaConfere =
      usuario && (await bcrypt.compare(String(senha), usuario.senha));
    if (!senhaConfere) {
      res.status(401).json({ erro: "E-mail ou senha incorretos" });
      return;
    }
    if (usuario.status !== "ATIVO") {
      res.status(403).json({ erro: "Usuário inativo" });
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
    res.json({ token, usuario });
  },
  async eu(req: Request, res: Response) {
    const usuario = await buscarUsuarioComPerfil()
      .where("usuario.id", res.locals.usuario.id)
      .first();
    if (!usuario) {
      res.status(404).json({ erro: "Usuário não encontrado" });
      return;
    }
    delete usuario.senha;
    res.json(usuario);
  },
};
