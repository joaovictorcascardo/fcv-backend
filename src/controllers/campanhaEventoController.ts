import { Request, Response } from "express";
import { campanhaEventoModel } from "../models/campanhaEventoModel";
import { mensagemExclusaoBloqueada } from "../models/historicoModel";
import { MENSAGEM_ID_INVALIDO, validarCampanha, validarId } from "../utils/validacoesCatalogo";

export const campanhaEventoController = {
  async listar(req: Request, res: Response) {
    const lista = await campanhaEventoModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    const item = await campanhaEventoModel.buscarPorId(id);
    if (!item) {
      res.status(404).json({ erro: "Campanha/evento não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const validacao = validarCampanha(req.body);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }
    const id = await campanhaEventoModel.criar(validacao.dados);
    const novo = await campanhaEventoModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    const atual = await campanhaEventoModel.buscarPorId(id);
    if (!atual) {
      res.status(404).json({ erro: "Campanha/evento não encontrado" });
      return;
    }
    const validacao = validarCampanha(req.body, atual);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }
    await campanhaEventoModel.atualizar(id, validacao.dados);
    const atualizado = await campanhaEventoModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    if (await campanhaEventoModel.contarUtilizacoes(id)) {
      res.status(409).json({ erro: mensagemExclusaoBloqueada("campanha") });
      return;
    }
    const excluidos = await campanhaEventoModel.excluir(id);
    if (!excluidos) {
      res.status(404).json({ erro: "Campanha/evento não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
