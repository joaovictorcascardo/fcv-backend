import { Request, Response } from "express";
import { colaboradorModel } from "../models/colaboradorModel";

export const colaboradorController = {
  async listar(req: Request, res: Response) {
    const lista = await colaboradorModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const item = await colaboradorModel.buscarPorId(Number(req.params.id));
    if (!item) {
      res.status(404).json({ erro: "Colaborador não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const id = await colaboradorModel.criar(req.body);
    const novo = await colaboradorModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);
    const alterados = await colaboradorModel.atualizar(id, req.body);
    if (!alterados) {
      res.status(404).json({ erro: "Colaborador não encontrado" });
      return;
    }
    const atualizado = await colaboradorModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const excluidos = await colaboradorModel.excluir(Number(req.params.id));
    if (!excluidos) {
      res.status(404).json({ erro: "Colaborador não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
