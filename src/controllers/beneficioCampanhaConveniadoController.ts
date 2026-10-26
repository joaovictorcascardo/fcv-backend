import { Request, Response } from "express";
import { beneficioCampanhaConveniadoModel } from "../models/beneficioCampanhaConveniadoModel";
import { beneficioCampanhaModel } from "../models/beneficioCampanhaModel";
import { conveniadoModel } from "../models/conveniadoModel";
import { mensagemExclusaoBloqueada } from "../models/historicoModel";
import { MENSAGEM_ID_INVALIDO, validarId, validarOfertaCampanha } from "../utils/validacoesCatalogo";

// Confere os ids enviados (só os que vieram) e se o par item + conveniado já existe em outra oferta de campanha.
async function conferirVinculos(dados: Record<string, any>, atual?: Record<string, any>) {
  if (dados.beneficio_campanha_id !== undefined && !(await beneficioCampanhaModel.buscarPorId(dados.beneficio_campanha_id))) {
    return { status: 400, erro: "Item de campanha informado não existe" };
  }
  if (dados.conveniado_id !== undefined && !(await conveniadoModel.buscarPorId(dados.conveniado_id))) {
    return { status: 400, erro: "Conveniado informado não existe" };
  }
  const final = { ...atual, ...dados };
  const trocouVinculo = !atual || final.beneficio_campanha_id !== atual.beneficio_campanha_id || final.conveniado_id !== atual.conveniado_id;
  if (!trocouVinculo) return null;

  if (atual && (await beneficioCampanhaConveniadoModel.contarUtilizacoes(atual.id))) {
    return {
      status: 409,
      erro: "Não é possível trocar o item ou o conveniado de uma oferta de campanha com utilizações registradas. Inative esta oferta (status INATIVO) e crie outra",
    };
  }
  const repetida = await beneficioCampanhaConveniadoModel.buscarPorPar(final.beneficio_campanha_id, final.conveniado_id);
  if (repetida && repetida.id !== atual?.id) {
    return { status: 409, erro: "Este conveniado já oferece este item de campanha" };
  }
  return null;
}

export const beneficioCampanhaConveniadoController = {
  async listar(req: Request, res: Response) {
    const lista = await beneficioCampanhaConveniadoModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }

    const item =
      await beneficioCampanhaConveniadoModel.buscarPorId(id);

    if (!item) {
      res.status(404).json({
        erro: "Oferta do item de campanha não encontrada"
      });
      return;
    }

    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const validacao = validarOfertaCampanha(req.body, true);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }

    const conflito = await conferirVinculos(validacao.dados);
    if (conflito) {
      res.status(conflito.status).json({ erro: conflito.erro });
      return;
    }

    const id = await beneficioCampanhaConveniadoModel.criar(
      validacao.dados
    );

    const novo =
      await beneficioCampanhaConveniadoModel.buscarPorId(id);

    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }

    const atual =
      await beneficioCampanhaConveniadoModel.buscarPorId(id);

    if (!atual) {
      res.status(404).json({
        erro: "Oferta do item de campanha não encontrada"
      });
      return;
    }

    const validacao = validarOfertaCampanha(req.body, false);
    if (!validacao.dados) {
      res.status(validacao.status).json({ erro: validacao.erro });
      return;
    }

    const conflito = await conferirVinculos(validacao.dados, atual);
    if (conflito) {
      res.status(conflito.status).json({ erro: conflito.erro });
      return;
    }

    await beneficioCampanhaConveniadoModel.atualizar(
      id,
      validacao.dados
    );

    const atualizado =
      await beneficioCampanhaConveniadoModel.buscarPorId(id);

    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    if (await beneficioCampanhaConveniadoModel.contarUtilizacoes(id)) {
      res.status(409).json({ erro: mensagemExclusaoBloqueada("oferta-campanha") });
      return;
    }
    const excluidos =
      await beneficioCampanhaConveniadoModel.excluir(
        id
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
