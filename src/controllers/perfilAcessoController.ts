import { Request, Response } from "express";
import { perfilAcessoModel } from "../models/perfilAcessoModel";

export const perfilAcessoController = {
  async listar(req: Request, res: Response) {
    const lista = await perfilAcessoModel.listar();
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const item = await perfilAcessoModel.buscarPorId(Number(req.params.id));
    if (!item) {
      res.status(404).json({ erro: "Perfil de acesso não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const id = await perfilAcessoModel.criar(req.body);
    const novo = await perfilAcessoModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);
    const alterados = await perfilAcessoModel.atualizar(id, req.body);
    if (!alterados) {
      res.status(404).json({ erro: "Perfil de acesso não encontrado" });
      return;
    }
    const atualizado = await perfilAcessoModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const excluidos = await perfilAcessoModel.excluir(Number(req.params.id));
    if (!excluidos) {
      res.status(404).json({ erro: "Perfil de acesso não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
