
import { Request, Response } from "express";
import { beneficioModel } from "../models/beneficioModel";
import { mensagemExclusaoBloqueada } from "../models/historicoModel";
import { MENSAGEM_ID_INVALIDO, validarBeneficio, validarId } from "../utils/validacoesCatalogo";

export const beneficioController = {
  async listar(req: Request, res: Response) {
    const lista = await beneficioModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    const item = await beneficioModel.buscarPorId(id);
    if (!item) {
      res.status(404).json({ erro: "Benefício não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const validacao = validarBeneficio(req.body);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }
    const id = await beneficioModel.criar(validacao.dados);
    const novo = await beneficioModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    const atual = await beneficioModel.buscarPorId(id);
    if (!atual) {
      res.status(404).json({ erro: "Benefício não encontrado" });
      return;
    }
    const validacao = validarBeneficio(req.body, atual);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }
    await beneficioModel.atualizar(id, validacao.dados);
    const atualizado = await beneficioModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    if (await beneficioModel.contarUtilizacoes(id)) {
      res.status(409).json({ erro: mensagemExclusaoBloqueada("beneficio") });
      return;
    }
    const excluidos = await beneficioModel.excluir(id);
    if (!excluidos) {
      res.status(404).json({ erro: "Benefício não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
