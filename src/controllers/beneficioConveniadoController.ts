import { Request, Response } from "express";
import { beneficioConveniadoModel } from "../models/beneficioConveniadoModel";
import { mensagemExclusaoBloqueada } from "../models/historicoModel";

export const beneficioConveniadoController = {
  async listar(req: Request, res: Response) {
    const lista = await beneficioConveniadoModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const item = await beneficioConveniadoModel.buscarPorId(
      Number(req.params.id)
    );

    if (!item) {
      res.status(404).json({
        erro: "Oferta não encontrada"
      });
      return;
    }

    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const id = await beneficioConveniadoModel.criar(req.body);

    const novo = await beneficioConveniadoModel.buscarPorId(id);

    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);

    const alterados = await beneficioConveniadoModel.atualizar(
      id,
      req.body
    );

    if (!alterados) {
      res.status(404).json({
        erro: "Oferta não encontrada"
      });
      return;
    }

    const atualizado = await beneficioConveniadoModel.buscarPorId(id);

    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (await beneficioConveniadoModel.contarUtilizacoes(id)) {
      res.status(409).json({ erro: mensagemExclusaoBloqueada("oferta") });
      return;
    }
    const excluidos = await beneficioConveniadoModel.excluir(
      id
    );

    if (!excluidos) {
      res.status(404).json({
        erro: "Oferta não encontrada"
      });
      return;
    }

    res.status(204).send();
  },
};
