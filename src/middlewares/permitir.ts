import { Request, Response, NextFunction } from "express";

export function permitir(...escopos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!escopos.includes(res.locals.usuario.escopo)) {
      res.status(403).json({ erro: "Seu perfil não tem acesso a esta rota" });
      return;
    }
    next();
  };
}
