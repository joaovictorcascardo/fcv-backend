import { Request, Response } from "express";
import { colaboradorModel } from "../models/colaboradorModel";
import { usuarioModel } from "../models/usuarioModel";
import {
  validarCargo,
  validarDataAdmissao,
  validarId,
  validarMatricula,
  validarSetor,
  validarStatusColaborador,
  validarTelefone,
} from "../utils/validacoes";

export const colaboradorController = {
  async listar(req: Request, res: Response) {
    const lista = await colaboradorModel.listar(req.query);
    res.json(lista);
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: "ID inválido. Informe um número inteiro positivo" });
      return;
    }
    const item = await colaboradorModel.buscarPorId(id);
    if (!item) {
      res.status(404).json({ erro: "Colaborador não encontrado" });
      return;
    }
    res.json(item);
  },

  async criar(req: Request, res: Response) {
    const { usuario_id, matricula, setor, cargo, data_admissao, status, telefone } = req.body ?? {};

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

    const usuarioJaVinculado = await colaboradorModel.buscarPorUsuarioId(idUsuario);
    if (usuarioJaVinculado) {
      res.status(409).json({ erro: "Este usuário já possui um colaborador vinculado" });
      return;
    }

    const valMatricula = validarMatricula(matricula);
    if (valMatricula.erro) {
      res.status(valMatricula.status).json({ erro: valMatricula.erro });
      return;
    }

    const matriculaEmUso = await colaboradorModel.buscarPorMatricula(valMatricula.valor!);
    if (matriculaEmUso) {
      res.status(409).json({ erro: "Já existe um colaborador com essa matrícula" });
      return;
    }

    const valSetor = validarSetor(setor);
    if (valSetor.erro) {
      res.status(valSetor.status).json({ erro: valSetor.erro });
      return;
    }

    const valCargo = validarCargo(cargo);
    if (valCargo.erro) {
      res.status(valCargo.status).json({ erro: valCargo.erro });
      return;
    }

    const valData = validarDataAdmissao(data_admissao);
    if (valData.erro) {
      res.status(valData.status).json({ erro: valData.erro });
      return;
    }

    const valStatus = validarStatusColaborador(status);
    if (valStatus.erro) {
      res.status(valStatus.status).json({ erro: valStatus.erro });
      return;
    }

    const valTelefone = validarTelefone(telefone);
    if (valTelefone.erro) {
      res.status(valTelefone.status).json({ erro: valTelefone.erro });
      return;
    }

    const id = await colaboradorModel.criar({
      usuario_id: idUsuario,
      matricula: valMatricula.valor,
      setor: valSetor.valor,
      cargo: valCargo.valor,
      data_admissao: valData.valor,
      status: valStatus.valor ?? "ATIVO",
      telefone: valTelefone.valor ?? null,
    });

    const novo = await colaboradorModel.buscarPorId(id);
    res.status(201).json(novo);
  },

  async atualizar(req: Request, res: Response) {
    const id = Number(req.params.id);
    const alterados = await colaboradorModel.atualizar(id, req.body);
    if (!alterados) {
      res.status(404).json({ erro: "Colaborador não encontrado" });
      return;
    }
    const atualizado = await colaboradorModel.buscarPorId(id);
    res.json(atualizado);
  },

  async excluir(req: Request, res: Response) {
    const excluidos = await colaboradorModel.excluir(Number(req.params.id));
    if (!excluidos) {
      res.status(404).json({ erro: "Colaborador não encontrado" });
      return;
    }
    res.status(204).send();
  },
};
