import { Request, Response } from "express";
import { beneficioConveniadoModel } from "../models/beneficioConveniadoModel";

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
    const excluidos = await beneficioConveniadoModel.excluir(
      Number(req.params.id)
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
