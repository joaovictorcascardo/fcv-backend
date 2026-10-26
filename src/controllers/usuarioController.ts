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
  
    const id = await usuarioModel.criar({
      nome: valNome.valor,
      email: valEmail,
      senha: valSenha,
      perfil_id,
    status: status ?? "ATIVO",
  });

    const novo = await usuarioModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);
    const alterados = await usuarioModel.atualizar(id, req.body);
    if (!alterados) {
      res.status(404).json({ erro: "Usuário não encontrado" });
      return;
    }
    const atualizado = await usuarioModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const excluidos = await usuarioModel.excluir(Number(req.params.id));
    if (!excluidos) {
      res.status(404).json({ erro: "Usuário não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
