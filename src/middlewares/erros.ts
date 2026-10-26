import { Request, Response, NextFunction } from "express";
import { ConsultaInvalida } from "../queries/listagem";

const errosConhecidos: Record<string, [number, string]> = {
  ER_DUP_ENTRY: [
    409,
    "Já existe um registro com esse valor (campo único repetido)",
  ],
  ER_NO_REFERENCED_ROW_2: [
    400,
    "Um dos ids de referência (campo _id) não existe",
  ],
  ER_ROW_IS_REFERENCED_2: [
    409,
    "Não é possível excluir: há outros registros ligados a este",
  ],
  ER_CHECK_CONSTRAINT_VIOLATED: [400, "Os dados quebram uma regra da tabela"],
  ER_BAD_NULL_ERROR: [400, "Um campo obrigatório veio vazio"],
  ER_NO_DEFAULT_FOR_FIELD: [400, "Faltou enviar um campo obrigatório"],
  ER_BAD_FIELD_ERROR: [400, "Foi enviado um campo que não existe na tabela"],
  WARN_DATA_TRUNCATED: [400, "Valor fora das opções permitidas para um campo"],
  ER_TRUNCATED_WRONG_VALUE: [
    400,
    "Valor em formato inválido (confira datas e números)",
  ],
  ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: [
    400,
    "Valor em formato inválido (confira datas e números)",
  ],
  ER_DATA_TOO_LONG: [400, "Um dos textos passou do tamanho máximo"],
};
export function tratarErros(
  erro: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (erro instanceof ConsultaInvalida) {
    res.status(400).json({ erro: erro.message });
    return;
  }
  const codigo = typeof erro?.code === "string" && Object.hasOwn(errosConhecidos, erro.code) ? erro.code : undefined;
  const conhecido = codigo ? errosConhecidos[codigo] : undefined;
  if (conhecido) {
    // Nunca registrar o objeto bruto: SQL e mensagens do driver podem conter dados do usuário.
    console.error("Erro de banco de dados", {
      codigo,
      ...(Number.isSafeInteger(erro.errno) ? { errno: erro.errno } : {}),
      ...(typeof erro.sqlState === "string" && /^[A-Z0-9]{5}$/.test(erro.sqlState) ? { sqlState: erro.sqlState } : {}),
    });
    res.status(conhecido[0]).json({ erro: conhecido[1] });
    return;
  }
  if (erro?.type === "entity.parse.failed") {
    res.status(400).json({ erro: "O JSON enviado está mal formatado" });
    return;
  }
  if (String(erro?.message).includes("Empty .update()")) {
    res.status(400).json({ erro: "Nenhum campo enviado para atualizar" });
    return;
  }
  console.error("Erro interno no servidor", { categoria: "ERRO_NAO_TRATADO" });
  res.status(500).json({ erro: "Erro interno no servidor" });
}
