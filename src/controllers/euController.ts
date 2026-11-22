import { Request, Response } from "express";
import { acessoModel } from "../models/acessoModel";
import { utilizacaoModel } from "../models/utilizacaoModel";
import { agora, mesesAtras } from "../utils/tempo";

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
};
