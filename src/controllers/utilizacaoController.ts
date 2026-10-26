import { Request, Response } from "express";
import { observacaoAoCancelar, statusAoCancelar, utilizacaoModel } from "../models/utilizacaoModel";
import { colaboradorModel } from "../models/colaboradorModel";
import { beneficioConveniadoModel } from "../models/beneficioConveniadoModel";
import { beneficioCampanhaConveniadoModel } from "../models/beneficioCampanhaConveniadoModel";
import { MENSAGEM_ID_INVALIDO, validarId, validarUtilizacao } from "../utils/validacoesCatalogo";

// Confere se colaborador e oferta existem (cada origem na sua tabela) e se o token já foi usado.
async function conferirVinculos(dados: Record<string, any>, atual?: Record<string, any>) {
  if (dados.colaborador_id !== undefined && !(await colaboradorModel.buscarPorId(dados.colaborador_id))) {
    return { status: 400, erro: "Colaborador informado não existe" };
  }
  if (dados.beneficio_conveniado_id !== undefined && !(await beneficioConveniadoModel.buscarPorId(dados.beneficio_conveniado_id))) {
    return { status: 400, erro: "Oferta comum informada não existe (beneficio_conveniado_id)" };
  }
  if (
    dados.beneficio_campanha_conveniado_id !== undefined &&
    !(await beneficioCampanhaConveniadoModel.buscarPorId(dados.beneficio_campanha_conveniado_id))
  ) {
    return { status: 400, erro: "Oferta de campanha informada não existe (beneficio_campanha_conveniado_id)" };
  }
  if (dados.token_qrcode !== undefined && dados.token_qrcode !== atual?.token_qrcode) {
    const repetida = await utilizacaoModel.buscarPorToken(dados.token_qrcode);
    if (repetida) {
      return { status: 409, erro: "Já existe uma utilização com esse token_qrcode" };
    }
  }
  return null;
}

export const utilizacaoController = {
  async listar(req: Request, res: Response) {
    const lista = await utilizacaoModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    const item = await utilizacaoModel.buscarPorId(id);
    if (!item) {
      res.status(404).json({ erro: "Utilização não encontrada" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const validacao = validarUtilizacao(req.body, true);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }
    const conflito = await conferirVinculos(validacao.dados);
    if (conflito) {
      res.status(conflito.status).json({ erro: conflito.erro });
      return;
    }
    const id = await utilizacaoModel.criar(validacao.dados);
    const novo = await utilizacaoModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    const atual = await utilizacaoModel.buscarPorId(id);
    if (!atual) {
      res.status(404).json({ erro: "Utilização não encontrada" });
      return;
    }
    const validacao = validarUtilizacao(req.body, false);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }
    const conflito = await conferirVinculos(validacao.dados, atual);
    if (conflito) {
      res.status(conflito.status).json({ erro: conflito.erro });
      return;
    }
    await utilizacaoModel.atualizar(id, validacao.dados);
    const atualizado = await utilizacaoModel.buscarPorId(id);
    res.json(atualizado);
  },

  async cancelar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
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
