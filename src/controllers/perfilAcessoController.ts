import { Request, Response } from "express";
import { perfilAcessoModel } from "../models/perfilAcessoModel";
import { validarId } from "../utils/validacoes";

const ESCOPOS_VALIDOS = ["FCV", "COLABORADOR", "CONVENIADO"] as const;
const STATUS_VALIDOS = ["ATIVO", "INATIVO"] as const;

export const perfilAcessoController = {
  async listar(req: Request, res: Response) {
    const lista = await perfilAcessoModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
      return;
    }

    const item = await perfilAcessoModel.buscarPorId(id);
    if (!item) {
      res.status(404).json({ erro: "Perfil de acesso não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const { nome, escopo, descricao, permissoes, status } = req.body ?? {};

    if (!nome || typeof nome !== "string" || !nome.trim()) {
      res.status(400).json({ erro: "Informe o nome do perfil" });
      return;
    }
    if (nome.trim().length > 50) {
      res.status(400).json({ erro: "O nome do perfil não pode ter mais de 50 caracteres" });
      return;
    }

    if (!escopo || !ESCOPOS_VALIDOS.includes(escopo)) {
      res.status(400).json({ erro: "Escopo inválido. Opções permitidas: FCV, COLABORADOR, CONVENIADO" });
      return;
    }

    if (status && !STATUS_VALIDOS.includes(status)) {
      res.status(400).json({ erro: "Status inválido. Opções permitidas: ATIVO, INATIVO" });
      return;
    }

    const nomeFormatado = nome.trim();
    const jaExiste = await perfilAcessoModel.buscarPorNome(nomeFormatado);
    if (jaExiste) {
      res.status(409).json({ erro: "Já existe um perfil com esse nome" });
      return;
    }

    // Whitelist estrita de campos permitidos
    const dadosCriacao: Record<string, any> = {
      nome: nomeFormatado,
      escopo,
      descricao: descricao ?? null,
      permissoes: permissoes ?? null,
      status: status ?? "ATIVO",
    };

    const id = await perfilAcessoModel.criar(dadosCriacao);
    const novo = await perfilAcessoModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);
    const alterados = await perfilAcessoModel.atualizar(id, req.body);
    if (!alterados) {
      res.status(404).json({ erro: "Perfil de acesso não encontrado" });
      return;
    }
    const atualizado = await perfilAcessoModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const excluidos = await perfilAcessoModel.excluir(Number(req.params.id));
    if (!excluidos) {
      res.status(404).json({ erro: "Perfil de acesso não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
