import { Request, Response } from "express";
import { beneficioCampanhaModel } from "../models/beneficioCampanhaModel";
import { mensagemExclusaoBloqueada } from "../models/historicoModel";

export const beneficioCampanhaController = {
  async listar(req: Request, res: Response) {
    const lista = await beneficioCampanhaModel.listar(req.query);
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
    const id = Number(req.params.id);
    if (await beneficioCampanhaModel.contarUtilizacoes(id)) {
      res.status(409).json({ erro: mensagemExclusaoBloqueada("item-campanha") });
      return;
    }
    const excluidos = await beneficioCampanhaModel.excluir(id);
    if (!excluidos) {
      res.status(404).json({ erro: "Item de campanha não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
