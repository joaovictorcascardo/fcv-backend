import { Request, Response } from "express";
import { categoriaModel } from "../models/categoriaModel";
import {
  validarId,
  validarNomeCategoria,
  validarStatusCategoria,
} from "../utils/validacoes";

export const categoriaController = {
  async listar(req: Request, res: Response) {
    const status = req.query.status;

    if (
      status !== undefined &&
      validarStatusCategoria(status).erro
    ) {
      res.status(400).json({
        erro: "Status inválido. Use ATIVO ou INATIVO",
      });
      return;
    }

    res.json(
      await categoriaModel.listar(
        status as string | undefined
      )
    );
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);

    if (!id) {
      res.status(400).json({
        erro: "ID inválido. Informe um número inteiro positivo",
      });
      return;
    }

    const categoria = await categoriaModel.buscarPorId(id);

    if (!categoria) {
      res.status(404).json({
        erro: "Categoria não encontrada",
      });
      return;
    }

    res.json(categoria);
  },

  async criar(req: Request, res: Response) {
    const nome = validarNomeCategoria(req.body?.nome);

    if (nome.erro) {
      res.status(nome.status).json({
        erro: nome.erro,
      });
      return;
    }

    const status = validarStatusCategoria(req.body?.status);

    if (status.erro) {
      res.status(status.status).json({
        erro: status.erro,
      });
      return;
    }

    if (await categoriaModel.buscarPorNome(nome.valor!)) {
      res.status(409).json({
        erro: "Já existe uma categoria com esse nome",
      });
      return;
    }

    const id = await categoriaModel.criar({
      nome: nome.valor!,
      status: status.valor ?? "ATIVO",
    });

    res.status(201).json(
      await categoriaModel.buscarPorId(id)
    );
  },

  async atualizar(req: Request, res: Response) {
    const id = validarId(req.params.id);

    if (!id) {
      res.status(400).json({
        erro: "ID inválido. Informe um número inteiro positivo",
      });
      return;
    }

    const atual = await categoriaModel.buscarPorId(id);

    if (!atual) {
      res.status(404).json({
        erro: "Categoria não encontrada",
      });
      return;
    }

    const dados: {
      nome?: string;
      status?: string;
    } = {};

    if (req.body?.nome !== undefined) {
      const nome = validarNomeCategoria(req.body.nome);

      if (nome.erro) {
        res.status(nome.status).json({
          erro: nome.erro,
        });
        return;
      }

      const repetida =
        await categoriaModel.buscarPorNome(nome.valor!);

      if (repetida && repetida.id !== id) {
        res.status(409).json({
          erro: "Já existe uma categoria com esse nome",
        });
        return;
      }

      dados.nome = nome.valor;
    }

    if (req.body?.status !== undefined) {
      const status =
        validarStatusCategoria(req.body.status);

      if (status.erro) {
        res.status(status.status).json({
          erro: status.erro,
        });
        return;
      }

      dados.status = status.valor;
    }

    if (Object.keys(dados).length === 0) {
      res.status(400).json({
        erro: "Nenhum dado válido fornecido para atualização",
      });
      return;
    }

    await categoriaModel.atualizar(id, dados);
    res.json(await categoriaModel.buscarPorId(id));
  },

  async excluir(req: Request, res: Response) {
    const id = validarId(req.params.id);

    if (!id) {
      res.status(400).json({
        erro: "ID inválido. Informe um número inteiro positivo",
      });
      return;
    }

    if (!(await categoriaModel.buscarPorId(id))) {
      res.status(404).json({
        erro: "Categoria não encontrada",
      });
      return;
    }

    const vinculados =
      await categoriaModel.contarConveniados(id);

    if (vinculados > 0) {
      res.status(409).json({
        erro: `Esta categoria tem ${vinculados} conveniado(s) vinculado(s). Inative a categoria alterando o status para INATIVO`,
      });
      return;
    }

    await categoriaModel.excluir(id);
    res.status(204).send();
  },
};