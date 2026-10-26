import { Request, Response } from "express";
import { usuarioModel } from "../models/usuarioModel";
import { validarId } from "../utils/validacoes";

export const usuarioController = {
  async listar(req: Request, res: Response) {
    const lista = await usuarioModel.listar(req.query);
    res.json(lista);
  },

    async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
      return;
    }
    const item = await usuarioModel.buscarPorId(id);
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
