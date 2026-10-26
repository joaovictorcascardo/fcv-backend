import { Request, Response } from "express";
import { beneficioConveniadoModel } from "../models/beneficioConveniadoModel";
import { beneficioModel } from "../models/beneficioModel";
import { conveniadoModel } from "../models/conveniadoModel";
import { mensagemExclusaoBloqueada } from "../models/historicoModel";
import { MENSAGEM_ID_INVALIDO, validarId, validarOferta } from "../utils/validacoesCatalogo";

// Confere os ids enviados (só os que vieram) e se o par benefício + conveniado já existe em outra oferta.
async function conferirVinculos(dados: Record<string, any>, atual?: Record<string, any>) {
  if (dados.beneficio_id !== undefined && !(await beneficioModel.buscarPorId(dados.beneficio_id))) {
    return { status: 400, erro: "Benefício informado não existe" };
  }
  if (dados.conveniado_id !== undefined && !(await conveniadoModel.buscarPorId(dados.conveniado_id))) {
    return { status: 400, erro: "Conveniado informado não existe" };
  }
  const final = { ...atual, ...dados };
  const trocouVinculo = !atual || final.beneficio_id !== atual.beneficio_id || final.conveniado_id !== atual.conveniado_id;
  if (!trocouVinculo) return null;

  if (atual && (await beneficioConveniadoModel.contarUtilizacoes(atual.id))) {
    return {
      status: 409,
      erro: "Não é possível trocar o benefício ou o conveniado de uma oferta com utilizações registradas. Inative esta oferta (status INATIVO) e crie outra",
    };
  }
  const repetida = await beneficioConveniadoModel.buscarPorPar(final.beneficio_id, final.conveniado_id);
  if (repetida && repetida.id !== atual?.id) {
    return { status: 409, erro: "Este conveniado já oferece este benefício" };
  }
  return null;
}

export const beneficioConveniadoController = {
  async listar(req: Request, res: Response) {
    const lista = await beneficioConveniadoModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }

    const item = await beneficioConveniadoModel.buscarPorId(id);

    if (!item) {
      res.status(404).json({
        erro: "Oferta não encontrada"
      });
      return;
    }

    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const validacao = validarOferta(req.body, true);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }

    const conflito = await conferirVinculos(validacao.dados);
    if (conflito) {
      res.status(conflito.status).json({ erro: conflito.erro });
      return;
    }

    const id = await beneficioConveniadoModel.criar(validacao.dados);

    const novo = await beneficioConveniadoModel.buscarPorId(id);

    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }

    const atual = await beneficioConveniadoModel.buscarPorId(id);
    if (!atual) {
      res.status(404).json({
        erro: "Oferta não encontrada"
      });
      return;
    }

    const validacao = validarOferta(req.body, false);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }

    const conflito = await conferirVinculos(validacao.dados, atual);
    if (conflito) {
      res.status(conflito.status).json({ erro: conflito.erro });
      return;
    }

    await beneficioConveniadoModel.atualizar(id, validacao.dados);

    const atualizado = await beneficioConveniadoModel.buscarPorId(id);

    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    if (await beneficioConveniadoModel.contarUtilizacoes(id)) {
      res.status(409).json({ erro: mensagemExclusaoBloqueada("oferta") });
      return;
    }
    const excluidos = await beneficioConveniadoModel.excluir(
      id
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
