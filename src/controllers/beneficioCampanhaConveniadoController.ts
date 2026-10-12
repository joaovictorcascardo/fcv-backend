import { Request, Response } from "express";
import { beneficioCampanhaConveniadoModel } from "../models/beneficioCampanhaConveniadoModel";

export const beneficioCampanhaConveniadoController = {
  async listar(req: Request, res: Response) {
    const lista = await beneficioCampanhaConveniadoModel.listar();
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const item =
      await beneficioCampanhaConveniadoModel.buscarPorId(
        Number(req.params.id)
      );

    if (!item) {
      res.status(404).json({
        erro: "Oferta do item de campanha não encontrada"
      });
      return;
    }

    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const id = await beneficioCampanhaConveniadoModel.criar(
      req.body
    );

    const novo =
      await beneficioCampanhaConveniadoModel.buscarPorId(id);

    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);

    const alterados =
      await beneficioCampanhaConveniadoModel.atualizar(
        id,
        req.body
      );

    if (!alterados) {
      res.status(404).json({
        erro: "Oferta do item de campanha não encontrada"
      });
      return;
    }

    const atualizado =
      await beneficioCampanhaConveniadoModel.buscarPorId(id);

    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const excluidos =
      await beneficioCampanhaConveniadoModel.excluir(
        Number(req.params.id)
      );

    if (!excluidos) {
      res.status(404).json({
        erro: "Oferta do item de campanha não encontrada"
      });
      return;
    }

    res.status(204).send();
  },
};