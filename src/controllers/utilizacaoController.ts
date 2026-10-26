import { Request, Response } from "express";
import { observacaoAoCancelar, statusAoCancelar, utilizacaoModel } from "../models/utilizacaoModel";

export const utilizacaoController = {
  async listar(req: Request, res: Response) {
    const lista = await utilizacaoModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const item = await utilizacaoModel.buscarPorId(Number(req.params.id));
    if (!item) {
      res.status(404).json({ erro: "Utilização não encontrada" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const id = await utilizacaoModel.criar(req.body);
    const novo = await utilizacaoModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);
    const alterados = await utilizacaoModel.atualizar(id, req.body);
    if (!alterados) {
      res.status(404).json({ erro: "Utilização não encontrada" });
      return;
    }
    const atualizado = await utilizacaoModel.buscarPorId(id);
    res.json(atualizado);
  },

  async cancelar(req: Request, res: Response) {
    const id = Number(req.params.id);
    const item = await utilizacaoModel.buscarPorId(id);
    if (!item) {
      res.status(404).json({ erro: "Utilização não encontrada" });
      return;
    }
    const novoStatus = statusAoCancelar(item.status);
    if (!novoStatus) {
      res.status(409).json({ erro: `Utilização já encerrada (status ${item.status}): não pode ser cancelada` });
      return;
    }
    const alterados = await utilizacaoModel.cancelar(id, item.status, novoStatus, observacaoAoCancelar(item.observacoes));
    if (!alterados) {
      res.status(409).json({ erro: "O status da utilização mudou durante o cancelamento. Consulte de novo" });
      return;
    }
    const cancelado = await utilizacaoModel.buscarPorId(id);
    res.json(cancelado);
  },
};
