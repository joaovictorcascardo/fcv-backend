import { Request, Response } from "express";
import { catalogoModel } from "../models/catalogoModel";
import { validarId } from "../utils/validacoes";

function lerFiltro(req: Request, res: Response) {
  const { busca, categoria_id } = req.query;

  if (
    busca !== undefined &&
    (typeof busca !== "string" || busca.length > 100)
  ) {
    res.status(400).json({
      erro: "A busca deve ser um texto de até 100 caracteres",
    });
    return null;
  }

  const categoriaId =
    categoria_id === undefined || categoria_id === ""
      ? undefined
      : validarId(categoria_id);

  if (categoriaId === null) {
    res.status(400).json({
      erro: "categoria_id deve ser um número inteiro positivo",
    });
    return null;
  }

  return {
    busca: busca?.trim() || undefined,
    categoriaId,
  };
}

export const catalogoController = {
  async resumo(_req: Request, res: Response) {
    res.json(await catalogoModel.resumo());
  },

  async beneficios(req: Request, res: Response) {
    const filtro = lerFiltro(req, res);
    if (!filtro) return;

    res.json(
      await catalogoModel.listarBeneficios(filtro)
    );
  },

  async beneficio(req: Request, res: Response) {
    const id = validarId(req.params.id);

    if (!id) {
      res.status(400).json({
        erro: "ID inválido. Informe um número inteiro positivo",
      });
      return;
    }

    const beneficio = await catalogoModel.buscarBeneficio(id);

    if (!beneficio) {
      res.status(404).json({
        erro: "Benefício não encontrado ou inativo",
      });
      return;
    }

    res.json(beneficio);
  },

  async locais(req: Request, res: Response) {
    const filtro = lerFiltro(req, res);
    if (!filtro) return;

    res.json(
      await catalogoModel.listarLocais(filtro)
    );
  },

  async local(req: Request, res: Response) {
    const id = validarId(req.params.id);

    if (!id) {
      res.status(400).json({
        erro: "ID inválido. Informe um número inteiro positivo",
      });
      return;
    }

    const local = await catalogoModel.buscarLocal(id);

    if (!local) {
      res.status(404).json({
        erro: "Local não encontrado ou inativo",
      });
      return;
    }

    res.json(local);
  },
};