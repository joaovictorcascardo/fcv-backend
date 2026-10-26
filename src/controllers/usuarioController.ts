import { Request, Response } from "express";
import { usuarioModel } from "../models/usuarioModel";
import { validarEmailUsuario, validarId, validarNomeUsuario, validarSenha, validarStatusUsuario } from "../utils/validacoes";
import { perfilAcessoModel } from "../models/perfilAcessoModel";

export const usuarioController = {
  async listar(req: Request, res: Response) {
    const lista = await usuarioModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
      return;
    }
    const item = await usuarioModel.buscarPorId(id);
    if (!item) {
      res.status(404).json({ erro: "Usuário não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const { nome, email, senha, perfil_id, status } = req.body ?? {};

    const valNome = validarNomeUsuario(nome);
    if (valNome.erro) {
      res.status(valNome.status).json({ erro: valNome.erro });
      return;
    }

    const valEmail = validarEmailUsuario(email);
    if (valEmail.erro) {
      res.status(valEmail.status).json({ erro: valEmail.erro });
      return;
    }

    const valSenha = validarSenha(senha);
    if (valSenha.erro) {
      res.status(valSenha.status).json({ erro: valSenha.erro });
      return;
    }

    const idPerfil = validarId(perfil_id);
    if (!idPerfil) {
      res.status(400).json({ erro: "Informe um perfil_id válido (número inteiro positivo)" });
      return;
    }

    const perfilExiste = await perfilAcessoModel.buscarPorId(idPerfil);
    if (!perfilExiste) {
      res.status(400).json({ erro: "Perfil de acesso informado não existe" });
      return;
    }

    const valStatus = validarStatusUsuario(status);
    if (valStatus.erro) {
      res.status(valStatus.status).json({ erro: valStatus.erro });
      return;
    }

    const emailEmUso = await usuarioModel.buscarPorEmail(valEmail.valor!);
    if (emailEmUso) {
      res.status(409).json({ erro: "Já existe um usuário com esse e-mail" });
      return;
    }

    const id = await usuarioModel.criar({
      nome: valNome.valor,
      email: valEmail.valor,
      senha: valSenha.valor,
      perfil_id: idPerfil,
      status: valStatus.valor ?? "ATIVO",
    });

    const novo = await usuarioModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
      return;
    }

    const usuarioAtual = await usuarioModel.buscarPorId(id);
    if (!usuarioAtual) {
      res.status(404).json({ erro: "Usuário não encontrado" });
      return;
    }

    const dadosAtualizar: Record<string, any> = {};

    if (req.body?.nome !== undefined) {
      const valNome = validarNomeUsuario(req.body.nome);
      if (valNome.erro) {
        res.status(valNome.status).json({ erro: valNome.erro });
        return;
      }
      dadosAtualizar.nome = valNome.valor;
    }

    if (req.body?.email !== undefined) {
      const valEmail = validarEmailUsuario(req.body.email);
      if (valEmail.erro) {
        res.status(valEmail.status).json({ erro: valEmail.erro });
        return;
      }
    if (valEmail.valor !== usuarioAtual.email) {
        const emailEmUso = await usuarioModel.buscarPorEmail(valEmail.valor!);
        if (emailEmUso) {
          res.status(409).json({ erro: "Já existe um usuário com esse e-mail" });
          return;
        }
      }
      dadosAtualizar.email = valEmail.valor;
    }
    if (req.body?.senha !== undefined) {
      const valSenha = validarSenha(req.body.senha);
      if (valSenha.erro) {
        res.status(valSenha.status).json({ erro: valSenha.erro });
        return;
      }
      dadosAtualizar.senha = valSenha.valor;
    }
    if (req.body?.perfil_id !== undefined) {
      const idPerfil = validarId(req.body.perfil_id);
      if (!idPerfil) {
        res.status(400).json({ erro: "Informe um perfil_id válido (número inteiro positivo)" });
        return;
      }

      const perfilExiste = await perfilAcessoModel.buscarPorId(idPerfil);
      if (!perfilExiste) {
        res.status(400).json({ erro: "Perfil de acesso informado não existe" });
        return;
      }

      dadosAtualizar.perfil_id = idPerfil;
    }

    if (req.body?.status !== undefined) {
      const valStatus = validarStatusUsuario(req.body.status);
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

    await usuarioModel.atualizar(id, dadosAtualizar);
    const atualizado = await usuarioModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
      return;
    }
    const usuario = await usuarioModel.buscarPorId(id);
    if (!usuario) {
      res.status(404).json({ erro: "Usuário não encontrado" });
      return;
    }
    const vinculos = await usuarioModel.contarVinculos(id);
    if (vinculos.colaboradores > 0 || vinculos.conveniados > 0) {
      res.status(409).json({
        erro: "Não é possível excluir usuário com colaborador ou conveniado vinculado. Inative o usuário alterando seu status para INATIVO",
      });
      return;
    }
    await usuarioModel.excluir(id);
    res.status(204).send();
  },
};
