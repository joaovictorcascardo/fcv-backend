import { Request, Response } from "express";
import { acessoModel } from "../models/acessoModel";
import { utilizacaoModel } from "../models/utilizacaoModel";

const STATUS = ["PENDENTE", "APROVADA", "REPROVADA", "ESTORNADA"];
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export const euController = {
  async utilizacoes(req: Request, res: Response) {
    const { status, de, ate } = req.query as Record<string, string | undefined>;
    if (status && !STATUS.includes(status)) {
      res.status(400).json({ erro: `status deve ser um destes: ${STATUS.join(", ")}` });
      return;
    }
    if ((de && !DATA.test(de)) || (ate && !DATA.test(ate))) {
      res.status(400).json({ erro: "de e ate devem estar no formato AAAA-MM-DD" });
      return;
    }
    const { colaborador, conveniado } = await acessoModel.buscarDados(res.locals.usuario.id);
    const dono =
      res.locals.usuario.escopo === "COLABORADOR"
        ? colaborador && { colaborador_id: colaborador.id }
        : conveniado && { conveniado_id: conveniado.id };
    if (!dono) {
      res.status(404).json({ erro: "Cadastro de colaborador ou conveniado não encontrado" });
      return;
    }
    const lista = await utilizacaoModel.listarDoDono({ ...dono, status, de, ate });
    res.json(lista);
  },
};
