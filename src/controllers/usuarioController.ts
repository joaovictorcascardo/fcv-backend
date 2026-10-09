import { Request, Response } from "express";
import { usuarioModel } from "../models/usuarioModel";

export const usuarioController = {
  async listar(req: Request, res: Response) {
    const lista = await usuarioModel.listar();
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const item = await usuarioModel.buscarPorId(Number(req.params.id));
    if (!item) {
      res.status(404).json({ erro: "Usuário não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const id = await usuarioModel.criar(req.body);
    const novo = await usuarioModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);
    const alterados = await usuarioModel.atualizar(id, req.body);
    if (!alterados) {
      res.status(404).json({ erro: "Usuário não encontrado" });
      return;
    }
    const atualizado = await usuarioModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const excluidos = await usuarioModel.excluir(Number(req.params.id));
    if (!excluidos) {
      res.status(404).json({ erro: "Usuário não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
