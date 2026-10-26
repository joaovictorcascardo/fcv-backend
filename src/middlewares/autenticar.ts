import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { acessoModel, motivoBloqueio } from "../models/acessoModel";
export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
    res.status(401).json({ erro: "Token não enviado" });
    return;
  }
  const token = cabecalho.slice(7);
  let dados: JwtPayload;
  try {
    dados = jwt.verify(token, process.env.JWT_SEGREDO as string) as JwtPayload;
  } catch {
    res.status(401).json({ erro: "Token inválido ou expirado" });
    return;
  }
  const usuario = await acessoModel.buscarPorId(Number(dados.id));
  if (!usuario) {
    res.status(401).json({ erro: "Token inválido ou expirado" });
    return;
  }
  const bloqueio = motivoBloqueio(usuario);
  if (bloqueio) {
    res.status(403).json({ erro: bloqueio });
    return;
  }
  res.locals.usuario = {
    id: usuario.id,
    perfil_id: usuario.perfil_id,
    perfil: usuario.perfil,
    escopo: usuario.escopo,
  };
  next()
}