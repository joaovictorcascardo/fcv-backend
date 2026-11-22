import { Request, Response } from "express";
import db from "../database/db";
import { acessoModel } from "../models/acessoModel";
import { utilizacaoModel } from "../models/utilizacaoModel";
import { listarAguardando } from "../queries/aguardando";
import { agora, mesesAtras, segundosEntre } from "../utils/tempo";

type Registro = Record<string, any>;

function statusPelaData(registro: Registro, momento: string): Registro {
  if (registro.status === "PENDENTE" && registro.data_expiracao <= momento) {
    return { ...registro, status: "EXPIRADA" };
  }
  return registro;
}

export const euController = {
  async utilizacoes(req: Request, res: Response) {
    const { colaborador, conveniado } = await acessoModel.buscarDados(res.locals.usuario.id, res.locals.usuario.escopo);
    const dono =
      res.locals.usuario.escopo === "COLABORADOR"
        ? colaborador && { colaborador_id: colaborador.id }
        : conveniado && { conveniado_id: conveniado.id };
    if (!dono) {
      res.status(404).json({ erro: "Cadastro de colaborador ou conveniado não encontrado" });
      return;
    }
    const momento = agora();
    const consulta = { ...req.query };
    if (dono.colaborador_id && consulta.de === undefined && consulta.ate === undefined) {
      consulta.de = mesesAtras(momento, 6).slice(0, 10);
    }
    const lista = await utilizacaoModel.listarDoDono(dono, consulta);
    if (Array.isArray(lista)) {
      res.json(lista.map((item) => statusPelaData(item, momento)));
      return;
    }
    res.json({ ...lista, dados: lista.dados.map((item) => statusPelaData(item, momento)) });
  },

  async aguardando(_req: Request, res: Response) {
    const { colaborador } = await acessoModel.buscarDados(res.locals.usuario.id, "COLABORADOR");
    if (!colaborador) {
      res.status(404).json({ erro: "Cadastro de colaborador não encontrado" });
      return;
    }
    const momento = agora();
    const lista = await listarAguardando(db, colaborador.id, momento);
    res.json(lista.map((item) => ({ ...item, segundos_restantes: Math.max(0, segundosEntre(momento, item.data_expiracao)) })));
  },
};
