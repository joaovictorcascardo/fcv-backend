import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
    res.status(401).json({ erro: "Token não enviado" });
    return;
  }

  const token = cabecalho.slice(7);
  try {
    res.locals.usuario = jwt.verify(token, process.env.JWT_SEGREDO as string);
    next();
  } catch {
    res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}
