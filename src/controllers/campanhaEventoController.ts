import { Request, Response } from "express";
import { campanhaEventoModel } from "../models/campanhaEventoModel";
import { mensagemExclusaoBloqueada } from "../models/historicoModel";

export const campanhaEventoController = {
  async listar(req: Request, res: Response) {
    const lista = await campanhaEventoModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const item = await campanhaEventoModel.buscarPorId(Number(req.params.id));
    if (!item) {
      res.status(404).json({ erro: "Campanha/evento não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const id = await campanhaEventoModel.criar(req.body);
    const novo = await campanhaEventoModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);
    const alterados = await campanhaEventoModel.atualizar(id, req.body);
    if (!alterados) {
      res.status(404).json({ erro: "Campanha/evento não encontrado" });
      return;
    }
    const atualizado = await campanhaEventoModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (await campanhaEventoModel.contarUtilizacoes(id)) {
      res.status(409).json({ erro: mensagemExclusaoBloqueada("campanha") });
      return;
    }
    const excluidos = await campanhaEventoModel.excluir(id);
    if (!excluidos) {
      res.status(404).json({ erro: "Campanha/evento não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
