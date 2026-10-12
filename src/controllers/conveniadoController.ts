import { Request, Response } from "express";
import { conveniadoModel } from "../models/conveniadoModel";

export const conveniadoController = {
  async listar(req: Request, res: Response) {
    const lista = await conveniadoModel.listar();
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const item = await conveniadoModel.buscarPorId(Number(req.params.id));
    if (!item) {
      res.status(404).json({ erro: "Conveniado não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const id = await conveniadoModel.criar(req.body);
    const novo = await conveniadoModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);
    const alterados = await conveniadoModel.atualizar(id, req.body);
    if (!alterados) {
      res.status(404).json({ erro: "Conveniado não encontrado" });
      return;
    }
    const atualizado = await conveniadoModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const excluidos = await conveniadoModel.excluir(Number(req.params.id));
    if (!excluidos) {
      res.status(404).json({ erro: "Conveniado não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
