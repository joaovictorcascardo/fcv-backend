import { Request, Response } from "express";
import { beneficioCampanhaModel } from "../models/beneficioCampanhaModel";

export const beneficioCampanhaController = {
  async listar(req: Request, res: Response) {
    const lista = await beneficioCampanhaModel.listar();
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const item = await beneficioCampanhaModel.buscarPorId(Number(req.params.id));
    if (!item) {
      res.status(404).json({ erro: "Item de campanha não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const id = await beneficioCampanhaModel.criar(req.body);
    const novo = await beneficioCampanhaModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);
    const alterados = await beneficioCampanhaModel.atualizar(id, req.body);
    if (!alterados) {
      res.status(404).json({ erro: "Item de campanha não encontrado" });
      return;
    }
    const atualizado = await beneficioCampanhaModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const excluidos = await beneficioCampanhaModel.excluir(Number(req.params.id));
    if (!excluidos) {
      res.status(404).json({ erro: "Item de campanha não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
