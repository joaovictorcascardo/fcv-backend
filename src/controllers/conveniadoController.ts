import { Request, Response } from "express";
import { conveniadoModel } from "../models/conveniadoModel";
import { usuarioModel } from "../models/usuarioModel";
import {
  validarCategoria,
  validarCNPJConveniado,
  validarEndereco,
  validarId,
  validarNomeFantasia,
  validarRazaoSocial,
  validarStatusConveniado,
} from "../utils/validacoes";

export const conveniadoController = {
  async listar(req: Request, res: Response) {
    const lista = await conveniadoModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
      return;
    }
    const item = await conveniadoModel.buscarPorId(id);
    if (!item) {
      res.status(404).json({ erro: "Conveniado não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const { usuario_id, nome_fantasia, razao_social, categoria, cnpj, endereco, status } = req.body ?? {};

    const idUsuario = validarId(usuario_id);
    if (!idUsuario) {
      res.status(400).json({ erro: "Informe um usuario_id válido (número inteiro positivo)" });
      return;
    }

    const usuarioExiste = await usuarioModel.buscarPorId(idUsuario);
    if (!usuarioExiste) {
      res.status(400).json({ erro: "Usuário informado não existe" });
      return;
    }

    const usuarioJaVinculado = await conveniadoModel.buscarPorUsuarioId(idUsuario);
    if (usuarioJaVinculado) {
      res.status(409).json({ erro: "Este usuário já possui um conveniado vinculado" });
      return;
    }

    const valNomeFantasia = validarNomeFantasia(nome_fantasia);
    if (valNomeFantasia.erro) {
      res.status(valNomeFantasia.status).json({ erro: valNomeFantasia.erro });
      return;
    }

    const valRazaoSocial = validarRazaoSocial(razao_social);
    if (valRazaoSocial.erro) {
      res.status(valRazaoSocial.status).json({ erro: valRazaoSocial.erro });
      return;
    }

    const valCategoria = validarCategoria(categoria);
    if (valCategoria.erro) {
      res.status(valCategoria.status).json({ erro: valCategoria.erro });
      return;
    }

    const valCNPJ = validarCNPJConveniado(cnpj);
    if (valCNPJ.erro) {
      res.status(valCNPJ.status).json({ erro: valCNPJ.erro });
      return;
    }

    const cnpjEmUso = await conveniadoModel.buscarPorCnpj(valCNPJ.valor!);
    if (cnpjEmUso) {
      res.status(409).json({ erro: "Já existe um conveniado com esse CNPJ" });
      return;
    }

    const valEndereco = validarEndereco(endereco);
    if (valEndereco.erro) {
      res.status(valEndereco.status).json({ erro: valEndereco.erro });
      return;
    }

    const valStatus = validarStatusConveniado(status);
    if (valStatus.erro) {
      res.status(valStatus.status).json({ erro: valStatus.erro });
      return;
    }

    const id = await conveniadoModel.criar({
      usuario_id: idUsuario,
      nome_fantasia: valNomeFantasia.valor,
      razao_social: valRazaoSocial.valor,
      categoria: valCategoria.valor,
      cnpj: valCNPJ.valor,
      endereco: valEndereco.valor,
      status: valStatus.valor ?? "EM_ANALISE",
    });

    const novo = await conveniadoModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
      return;
    }

    const conveniadoAtual = await conveniadoModel.buscarPorId(id);
    if (!conveniadoAtual) {
      res.status(404).json({ erro: "Conveniado não encontrado" });
      return;
    }

    const dadosAtualizar: Record<string, any> = {};

    if (req.body?.nome_fantasia !== undefined) {
      const valNomeFantasia = validarNomeFantasia(req.body.nome_fantasia);
      if (valNomeFantasia.erro) {
        res.status(valNomeFantasia.status).json({ erro: valNomeFantasia.erro });
        return;
      }
      dadosAtualizar.nome_fantasia = valNomeFantasia.valor;
    }

    if (req.body?.razao_social !== undefined) {
      const valRazaoSocial = validarRazaoSocial(req.body.razao_social);
      if (valRazaoSocial.erro) {
        res.status(valRazaoSocial.status).json({ erro: valRazaoSocial.erro });
        return;
      }
      dadosAtualizar.razao_social = valRazaoSocial.valor;
    }

    if (req.body?.categoria !== undefined) {
      const valCategoria = validarCategoria(req.body.categoria);
      if (valCategoria.erro) {
        res.status(valCategoria.status).json({ erro: valCategoria.erro });
        return;
      }
      dadosAtualizar.categoria = valCategoria.valor;
    }

    if (req.body?.cnpj !== undefined) {
      const valCNPJ = validarCNPJConveniado(req.body.cnpj);
      if (valCNPJ.erro) {
        res.status(valCNPJ.status).json({ erro: valCNPJ.erro });
        return;
      }
      if (valCNPJ.valor !== conveniadoAtual.cnpj) {
        const cnpjEmUso = await conveniadoModel.buscarPorCnpj(valCNPJ.valor!);
        if (cnpjEmUso) {
          res.status(409).json({ erro: "Já existe um conveniado com esse CNPJ" });
          return;
        }
      }
      dadosAtualizar.cnpj = valCNPJ.valor;
    }

    if (req.body?.endereco !== undefined) {
      const valEndereco = validarEndereco(req.body.endereco);
      if (valEndereco.erro) {
        res.status(valEndereco.status).json({ erro: valEndereco.erro });
        return;
      }
      dadosAtualizar.endereco = valEndereco.valor;
    }

    if (req.body?.status !== undefined) {
      const valStatus = validarStatusConveniado(req.body.status);
      if (valStatus.erro) {
        res.status(valStatus.status).json({ erro: valStatus.erro });
        return;
      }
      dadosAtualizar.status = valStatus.valor;
    }

    if (Object.keys(dadosAtualizar).length === 0) {
      res.status(400).json({ erro: "Nenhum dado válido fornecido para atualização" });
      return;
    }

    await conveniadoModel.atualizar(id, dadosAtualizar);
    const atualizado = await conveniadoModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
      return;
    }

    const conveniado = await conveniadoModel.buscarPorId(id);
    if (!conveniado) {
      res.status(404).json({ erro: "Conveniado não encontrado" });
      return;
    }

    const vinculos = await conveniadoModel.contarVinculos(id);
    if (vinculos.beneficios > 0 || vinculos.campanhas > 0) {
      res.status(409).json({
        erro: "Não é possível excluir conveniado com benefícios ou campanhas vinculados. Inative o conveniado alterando seu status para INATIVO",
      });
      return;
    }

    await conveniadoModel.excluir(id);
    res.status(204).send();
  },
};
