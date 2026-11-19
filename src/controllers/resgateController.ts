import { Request, Response } from "express";
import { ErroResgate, resgateModel } from "../models/resgateModel";
import { normalizarCodigo } from "../utils/codigo";
import { CANAIS_VALIDACAO_VALIDOS, MENSAGEM_ID_INVALIDO, validarId } from "../utils/validacoesCatalogo";

function responderErro(res: Response, erro: unknown) {
  if (!(erro instanceof ErroResgate)) throw erro;
  res.status(erro.status).json({ erro: erro.message, ...erro.extra });
}

function lerCanal(valor: unknown): string | null {
  if (valor === undefined || valor === null || valor === "") return "APP_CONVENIADO";
  return (CANAIS_VALIDACAO_VALIDOS as readonly string[]).includes(String(valor)) ? String(valor) : null;
}

function lerMotivo(valor: unknown): string | undefined | null {
  if (valor === undefined || valor === null || valor === "") return undefined;
  if (typeof valor !== "string" || valor.trim().length > 500) return null;
  return valor.trim() || undefined;
}

async function decidir(req: Request, res: Response, aprovar: boolean) {
  const codigo = normalizarCodigo(req.params.codigo);
  if (!codigo) {
    res.status(400).json({ erro: "Informe o código do QR ou o código de 6 letras" });
    return;
  }
  const canal = lerCanal(req.body?.canal_validacao);
  if (!canal) {
    res.status(400).json({ erro: "canal_validacao inválido. Use APP_CONVENIADO ou TERMINAL_IOT" });
    return;
  }
  const motivo = lerMotivo(req.body?.motivo);
  if (motivo === null) {
    res.status(400).json({ erro: "O motivo deve ser um texto de até 500 caracteres" });
    return;
  }
  try {
    res.json(await resgateModel.decidir(res.locals.usuario.id, codigo, aprovar, canal, motivo));
  } catch (erro) {
    responderErro(res, erro);
  }
}

export const resgateController = {
  async solicitar(req: Request, res: Response) {
    const beneficioId = validarId(req.body?.beneficio_id);
    if (!beneficioId) {
      res.status(400).json({ erro: "Informe o beneficio_id (número inteiro positivo)" });
      return;
    }
    try {
      res.status(201).json(await resgateModel.solicitar(res.locals.usuario.id, beneficioId));
    } catch (erro) {
      responderErro(res, erro);
    }
  },

  async buscar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    const resgate = await resgateModel.buscarDoColaborador(res.locals.usuario.id, id);
    if (!resgate) {
      res.status(404).json({ erro: "Resgate não encontrado" });
      return;
    }
    res.json(resgate);
  },

  async cancelar(req: Request, res: Response) {
    const id = validarId(req.params.id);
    if (!id) {
      res.status(400).json({ erro: MENSAGEM_ID_INVALIDO });
      return;
    }
    try {
      res.json(await resgateModel.cancelar(res.locals.usuario.id, id));
    } catch (erro) {
      responderErro(res, erro);
    }
  },

  async consultar(req: Request, res: Response) {
    const codigo = normalizarCodigo(req.params.codigo);
    if (!codigo) {
      res.status(400).json({ erro: "Informe o código do QR ou o código de 6 letras" });
      return;
    }
    try {
      const { resgate } = await resgateModel.conferirParaValidar(res.locals.usuario.id, codigo);
      res.json(resgate);
    } catch (erro) {
      responderErro(res, erro);
    }
  },

  aprovar(req: Request, res: Response) {
    return decidir(req, res, true);
  },

  reprovar(req: Request, res: Response) {
    return decidir(req, res, false);
  },
};
