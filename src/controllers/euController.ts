import { Request, Response } from "express";
import { acessoModel } from "../models/acessoModel";
import { utilizacaoModel } from "../models/utilizacaoModel";

export const euController = {
  async utilizacoes(req: Request, res: Response) {
    const { colaborador, conveniado } = await acessoModel.buscarDados(res.locals.usuario.id, res.locals.usuario.escopo);
    const dono =
      res.locals.usuario.escopo === "COLABORADOR"
        ? colaborador && { colaborador_id: colaborador.id }
        : conveniado && { conveniado_id: conveniado.id };
    if (!dono) {
      res.status(404).json({ erro: "Cadastro de colaborador ou conveniado não encontrado" });
      return;
    }
    const lista = await utilizacaoModel.listarDoDono(dono, req.query);
    res.json(lista);
  },
};
