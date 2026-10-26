import { Request, Response } from "express";
import { beneficioCampanhaModel } from "../models/beneficioCampanhaModel";
import { campanhaEventoModel } from "../models/campanhaEventoModel";
import { mensagemExclusaoBloqueada } from "../models/historicoModel";
import { MENSAGEM_ID_INVALIDO, validarId, validarItemCampanha } from "../utils/validacoesCatalogo";

// Confere a campanha enviada e impede mudar de campanha um item que já foi usado.
async function conferirVinculos(dados: Record<string, any>, atual?: Record<string, any>) {
  if (dados.campanha_id === undefined || dados.campanha_id === atual?.campanha_id) return null;
  if (!(await campanhaEventoModel.buscarPorId(dados.campanha_id))) {
    return { status: 400, erro: "Campanha informada não existe" };
  }
  if (atual && (await beneficioCampanhaModel.contarUtilizacoes(atual.id))) {
    return {
      status: 409,
      erro: "Não é possível trocar a campanha de um item com utilizações registradas. Inative este item (status INATIVO) e crie outro",
    };
  }
  return null;
}

export const beneficioCampanhaController = {
  async listar(req: Request, res: Response) {
    const lista = await beneficioCampanhaModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    const item = await beneficioCampanhaModel.buscarPorId(id);
    if (!item) {
      res.status(404).json({ erro: "Item de campanha não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const validacao = validarItemCampanha(req.body);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }
    const conflito = await conferirVinculos(validacao.dados);
    if (conflito) {
      res.status(conflito.status).json({ erro: conflito.erro });
      return;
    }
    const id = await beneficioCampanhaModel.criar(validacao.dados);
    const novo = await beneficioCampanhaModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    const atual = await beneficioCampanhaModel.buscarPorId(id);
    if (!atual) {
      res.status(404).json({ erro: "Item de campanha não encontrado" });
      return;
    }
    const validacao = validarItemCampanha(req.body, atual);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }
    const conflito = await conferirVinculos(validacao.dados, atual);
    if (conflito) {
      res.status(conflito.status).json({ erro: conflito.erro });
      return;
    }
    await beneficioCampanhaModel.atualizar(id, validacao.dados);
    const atualizado = await beneficioCampanhaModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
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
