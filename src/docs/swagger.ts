import { recursosListagem, type NomeRecursoListagem } from "../queries/recursos";
import type { ConfiguracaoListagem } from "../queries/listagem";
import { configuracaoHistorico } from "../queries/historico";
import { mensagemExclusaoBloqueada } from "../models/historicoModel";

const texto = (maxLength: number) => ({ type: "string", maxLength });
const textoLivre = { type: "string" };
const inteiro = { type: "integer" };
const decimal = { type: "number" };
const data = { type: "string", format: "date", example: "2026-10-12" };
const dataHora = { type: "string", example: "2026-10-12 14:30:00" };
const opcoes = (valores: string[], padrao?: string) => ({
  type: "string",
  enum: valores,
  ...(padrao ? { default: padrao } : {}),
});
const opcional = (campo: object) => ({ ...campo, nullable: true });
const textoObrigatorio = (maxLength: number) => ({ type: "string", minLength: 1, maxLength });
const positivo = (descricao?: string) => ({ type: "number", minimum: 0, exclusiveMinimum: true, ...(descricao ? { description: descricao } : {}) });
const inteiroPositivo = { type: "integer", minimum: 1 };

const erro = (mensagem: string) => ({
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Erro" },
      example: { erro: mensagem },
    },
  },
});

const respostasComuns = {
  401: { description: "Token não enviado, inválido ou expirado", ...erro("Token não enviado") },
  403: {
    description: "Usuário, perfil ou vínculo inativo. O acesso é conferido no banco a cada requisição",
    ...erro("Colaborador inativo ou afastado")
  },
};

const respostasFcv = {
  ...respostasComuns,
  403: { description: "Usuário sem escopo FCV, ou usuário, perfil ou vínculo inativo", ...erro("Seu perfil não tem acesso a esta rota") },
};
const respostasAdministrador = {
  ...respostasComuns, 403: { description: "Só o perfil FCV_ADMINISTRADOR cria, altera e exclui", ...erro("Seu perfil não tem permissão para esta ação") },
};

const parametroId = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer", minimum: 1 },
};

const jsonResposta = (schema: object) => ({ content: { "application/json": { schema } } });
const parametroBusca = (description: string) => ({ name: "busca", in: "query", required: false, description, schema: { type: "string", maxLength: 100 } });
const parametroCategoria = { name: "categoria_id", in: "query", required: false, description: "Id da categoria", schema: { type: "integer", minimum: 1 } };
const parametroCodigo = {
  name: "codigo",
  in: "path",
  required: true,
  description: "Conteúdo do QR (token_qrcode) ou o código de 6 letras",
  schema: { type: "string", example: "2X6MPN" },
};

function decisao(summary: string, description: string) {
  return {
    parameters: [parametroCodigo],
    post: {
      tags: ["Validação"],
      summary,
      description,
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                canal_validacao: { ...opcoes(["APP_CONVENIADO", "TERMINAL_IOT"], "APP_CONVENIADO"), description: "O totem envia TERMINAL_IOT" },
                motivo: { type: "string", maxLength: 500 },
              },
            },
            example: { canal_validacao: "APP_CONVENIADO" },
          },
        },
      },
      responses: {
        200: { description: "Resgate com o novo status", ...jsonResposta({ $ref: "#/components/schemas/Resgate" }) },
        400: { description: "canal_validacao ou motivo inválido", ...erro("canal_validacao inválido. Use APP_CONVENIADO ou TERMINAL_IOT") },
        404: { description: "Não existe ou não é aceito neste estabelecimento", ...erro("Resgate não encontrado neste estabelecimento. Confira o código e se o benefício é aceito aqui") },
        409: { description: "Expirado, já decidido (inclusive por outra leitura ao mesmo tempo), benefício ou colaborador inativo", ...erro("Este resgate já foi aprovado") },
        429: { description: "Muitos códigos errados", ...erro("Muitos códigos errados. Tente de novo em 15 minuto(s)") },
        ...respostasComuns,
      },
    },
  };
}

type Recurso = {
  caminho: string;
  tag: string;
  nome: string;
  schema: string;
  exemplo: object;
  naoEncontrado: string;
  soFcv?: boolean;
  soAdministrador?: boolean;
  observacao?: string;
  exclusao?: { descricao: string; conflito: string };
  cancelamento?: string;
  observacaoAlteracao?: string;
};

function parametrosListagem(caminho: string) {
  const config: ConfiguracaoListagem & { periodo?: string } = recursosListagem[caminho.slice(1) as NomeRecursoListagem];
  return parametrosConsulta(config);
}

function parametrosConsulta(config: ConfiguracaoListagem & { periodo?: string }) {
  const parametro = (name: string, description: string, schema: object) => ({ name, in: "query", required: false, description, schema });
  return [
    parametro("pagina", "Ativa o formato paginado. Inteiro positivo; padrão 1 quando pagina ou limite é enviado.", { type: "integer", minimum: 1 }),
    parametro("limite", "Ativa o formato paginado. Entre 1 e 100; padrão 20 quando pagina ou limite é enviado.", { type: "integer", minimum: 1, maximum: 100 }),
    parametro("ordenarPor", "Campo permitido; id é usado como desempate. Não aceita expressão SQL.", { type: "string", enum: Object.keys(config.ordenarPor), default: config.padrao?.ordenarPor ?? "id" }),
    parametro("ordem", "Sentido da ordenação principal. Desempate por id crescente.", { type: "string", enum: ["asc", "desc"], default: config.padrao?.ordem ?? "asc" }),
    ...(config.busca?.length ? [parametro("busca", "Substring literal nos campos textuais permitidos. % e _ são literais.", { type: "string", minLength: 1, maxLength: 150 })] : []),
    ...Object.entries(config.filtros ?? {}).map(([nome, filtro]) => parametro(
      nome,
      filtro.tipo === "data" ? config.periodo ?? "Dia no formato YYYY-MM-DD; intervalo inclusivo."
        : nome === "beneficio_id" ? "ID do benefício comum. Não inclui item promocional de mesmo ID; combinado por AND com os demais filtros."
          : nome === "beneficio_campanha_id" ? "ID do item promocional. Não inclui benefício comum de mesmo ID; combinado por AND com os demais filtros."
            : "Filtro de igualdade, combinado por AND com os demais filtros.",
      filtro.tipo === "inteiro" ? { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER }
        : filtro.tipo === "enum" ? { type: "string", enum: [...(filtro.valores ?? [])] }
          : filtro.tipo === "data" ? { type: "string", format: "date" }
            : { type: "string", minLength: 1, maxLength: 150 },
    )),
  ];
}

function crud({ caminho, tag, nome, schema, exemplo, naoEncontrado: mensagem, soFcv, soAdministrador, observacao, exclusao, cancelamento, observacaoAlteracao }: Recurso) {
  const ref = { $ref: `#/components/schemas/${schema}` };
  const refEntrada = { $ref: `#/components/schemas/${schema}Entrada` };
  const refAlteracao = { $ref: `#/components/schemas/${schema}Alteracao` };
  const leitura = soFcv ? respostasFcv : respostasComuns;
  const escrita = soAdministrador ? respostasAdministrador : respostasFcv;
  const naoEncontrado = { description: "Não existe registro com esse id", ...erro(mensagem) };
  const corpo = (exigirObrigatorios: boolean) => ({
    required: true,
    content: {
      "application/json": {
        schema: exigirObrigatorios ? refEntrada : refAlteracao,
        example: exemplo,
      },
    },
  });
  const json = (schemaResposta: object) => ({
    content: { "application/json": { schema: schemaResposta } },
  });

  return {
    [caminho]: {
      get: {
        tags: [tag],
        summary: `Lista ${tag.toLowerCase()}`,
        description: "Sem pagina e limite: array completo, inclusive com filtros. Enviar pagina ou limite ativa o envelope paginado. Parâmetros devem ser únicos; desconhecidos, vazios, tipos/enums/datas inválidos e intervalos invertidos geram 400. Total usa os mesmos filtros e escopo dos dados. Página além do fim retorna dados vazio com o total real.",
        parameters: parametrosListagem(caminho),
        responses: {
          200: {
            description: "Array legado ou envelope quando pagina/limite é enviado",
            ...json({
              oneOf: [
                { type: "array", items: ref },
                {
                  type: "object", required: ["dados", "paginacao"], properties: {
                    dados: { type: "array", items: ref },
                    paginacao: { $ref: "#/components/schemas/Paginacao" },
                  }
                },
              ]
            }),
          },
          400: { description: "Parâmetro de consulta inválido", ...erro("limite deve estar entre 1 e 100") },
          ...leitura,
        },
      },
      post: {
        tags: [tag],
        summary: `Cria ${nome.toLowerCase()}`,
        description: observacao,
        requestBody: corpo(true),
        responses: {
          201: { description: "Registro criado", ...json(ref) },
          400: { description: "Campo faltando, inválido ou id de referência inexistente", ...erro("Faltou enviar um campo obrigatório") },
          409: { description: "Valor único repetido", ...erro("Já existe um registro com esse valor (campo único repetido)") },
          ...escrita,
        },
      },
    },
    [`${caminho}/{id}`]: {
      parameters: [parametroId],
      get: {
        tags: [tag],
        summary: `Mostra ${nome.toLowerCase()}`,
        responses: {
          200: { description: "Registro encontrado", ...json(ref) },
          400: { description: "ID inválido", ...erro("ID inválido. Informe um número inteiro positivo") },
          404: naoEncontrado,
          ...leitura,
        },
      },
      put: {
        tags: [tag],
        summary: `Altera ${nome.toLowerCase()}`,
        description: ["Envie só os campos que mudaram.", observacaoAlteracao].filter(Boolean).join(" "),
        requestBody: corpo(false),
        responses: {
          200: { description: "Registro atualizado", ...json(ref) },
          400: { description: "Nenhum campo enviado, ID inválido ou valor inválido", ...erro("Nenhum dado válido fornecido para atualização") },
          404: naoEncontrado,
          409: { description: "Valor único repetido", ...erro("Já existe um registro com esse valor") },
          ...escrita,
        },
      },
      delete: cancelamento ? {
        tags: [tag],
        summary: `Cancela ${nome.toLowerCase()} sem apagar`,
        description: cancelamento,
        responses: {
          200: { description: "Cancelada: o registro continua no histórico com o novo status", ...json(ref) },
          404: naoEncontrado,
          409: { description: "Já está REPROVADA ou ESTORNADA, ou o status mudou durante o cancelamento", ...erro("Utilização já encerrada (status ESTORNADA): não pode ser cancelada") },
          ...escrita,
        },
      } : {
        tags: [tag],
        summary: `Exclui ${nome.toLowerCase()}`,
        description: exclusao?.descricao,
        responses: {
          204: { description: "Registro excluído" },
          400: { description: "ID inválido", ...erro("ID inválido. Informe um número inteiro positivo") },
          404: naoEncontrado,
          409: exclusao
            ? { description: "Há utilizações registradas ligadas a este cadastro, ou outros registros ligados a ele", ...erro(exclusao.conflito) }
            : { description: "Há registros ligados a este", ...erro("Não é possível excluir: há outros registros ligados a este") },
          ...escrita,
        },
      },
    },
  };
}

function modelo(nome: string, campos: Record<string, object>, obrigatorios: string[], somenteLeitura: Record<string, object> = {}, fixos: string[] = []) {
  const alteraveis = Object.fromEntries(Object.entries(campos).filter(([campo]) => !fixos.includes(campo)));
  return {
    [`${nome}Entrada`]: { type: "object", required: obrigatorios, properties: campos },
    [`${nome}Alteracao`]: { type: "object", properties: alteraveis },
    [nome]: {
      type: "object",
      properties: { id: inteiro, ...campos, ...somenteLeitura },
    },
  };
}

const schemas = {
  Paginacao: {
    type: "object",
    required: ["pagina", "limite", "total", "totalPaginas"],
    properties: {
      pagina: { type: "integer", minimum: 1, example: 1 },
      limite: { type: "integer", minimum: 1, maximum: 100, example: 20 },
      total: { type: "integer", minimum: 0, example: 42 },
      totalPaginas: { type: "integer", minimum: 0, example: 3 },
    },
  },
  Erro: {
    type: "object",
    required: ["erro"],
    properties: { erro: textoLivre },
  },
  ...modelo(
    "Perfil",
    {
      nome: texto(50),
      escopo: opcoes(["FCV", "COLABORADOR", "CONVENIADO"]),
      descricao: opcional(texto(255)),
      permissoes: { type: "array", items: textoLivre, nullable: true },
      status: opcoes(["ATIVO", "INATIVO"], "ATIVO"),
    },
    ["nome", "escopo"],
  ),
  ...modelo(
    "Usuario",
    {
      nome: texto(150),
      email: { type: "string", format: "email", maxLength: 150 },
      senha: { type: "string", minLength: 6, writeOnly: true },
      perfil_id: inteiro,
      status: opcoes(["ATIVO", "INATIVO"], "ATIVO"),
    },
    ["nome", "email", "senha", "perfil_id"],
    { data_criacao: dataHora },
  ),
  ...modelo(
    "Colaborador",
    {
      usuario_id: inteiro,
      matricula: texto(30),
      setor: texto(100),
      cargo: texto(100),
      data_admissao: data,
      status: opcoes(["ATIVO", "INATIVO", "AFASTADO"], "ATIVO"),
      telefone: opcional(texto(20)),
    },
    ["usuario_id", "matricula", "setor", "cargo", "data_admissao"],
  ),
  ...modelo(
    "Conveniado",
    {
      usuario_id: inteiro,
      nome_fantasia: texto(150),
      razao_social: texto(150),
      categorias: { type: "array", minItems: 1, items: inteiroPositivo, description: "Ids das categorias (ao menos uma). Na resposta vem a lista de categorias com id, nome e status", example: [1, 2] },
      cnpj: { type: "string", minLength: 14, maxLength: 14, description: "Exatamente 14 dígitos numéricos" },
      endereco: texto(255),
      status: opcoes(["ATIVO", "INATIVO", "EM_ANALISE"], "EM_ANALISE"),
    },
    ["usuario_id", "nome_fantasia", "razao_social", "categorias", "cnpj", "endereco"],
  ),
  ...modelo(
    "Categoria",
    {
      nome: textoObrigatorio(60),
      status: opcoes(["ATIVO", "INATIVO"], "ATIVO"),
    },
    ["nome"],
  ),
  ...modelo(
    "Beneficio",
    {
      nome: textoObrigatorio(150),
      descricao: opcional(textoLivre),
      status: opcoes(["ATIVO", "INATIVO", "DESCONTINUADO"], "ATIVO"),
      tipo_beneficio: opcoes(["PERCENTUAL", "VALOR_FIXO"]),
      valor: positivo("Maior que zero. Se tipo_beneficio for PERCENTUAL, no máximo 100"),
      quantidade_maxima_utilizacoes: inteiroPositivo,
      tipo_janela: opcoes(["CALENDARIO_FIXO", "JANELA_MOVEL"]),
      unidade_ciclo: { ...opcional(opcoes(["ANO", "MES", "SEMANA"])), description: "Obrigatório quando tipo_janela é CALENDARIO_FIXO" },
      dia_reset: opcional(data),
      intervalo_valor: { ...opcional(inteiroPositivo), description: "Obrigatório (com intervalo_unidade e referencia_contagem) quando tipo_janela é JANELA_MOVEL" },
      intervalo_unidade: opcional(opcoes(["DIA", "MES"])),
      referencia_contagem: opcional(opcoes(["ULTIMA_UTILIZACAO", "DATA_ADMISSAO_COLABORADOR"])),
    },
    ["nome", "tipo_beneficio", "valor", "quantidade_maxima_utilizacoes", "tipo_janela"],
  ),
  ...modelo(
    "Oferta",
    {
      beneficio_id: inteiroPositivo,
      conveniado_id: inteiroPositivo,
      status: opcoes(["ATIVO", "INATIVO"], "ATIVO"),
    },
    ["beneficio_id", "conveniado_id"],
  ),
  ...modelo(
    "Campanha",
    {
      nome: textoObrigatorio(150),
      tipo: opcoes(["CAMPANHA", "EVENTO_INTERNO", "EVENTO_PATROCINADO", "VOUCHER", "CORTESIA"]),
      descricao: opcional(textoLivre),
      data_inicio: data,
      data_fim: { ...data, description: "Igual ou posterior a data_inicio" },
      criterio_elegibilidade: opcional(textoLivre),
      patrocinador: opcional(texto(150)),
      status: opcoes(["PLANEJADA", "ATIVA", "ENCERRADA", "CANCELADA"], "PLANEJADA"),
    },
    ["nome", "tipo", "data_inicio", "data_fim"],
  ),
  ...modelo(
    "ItemCampanha",
    {
      campanha_id: inteiroPositivo,
      nome: textoObrigatorio(150),
      descricao: opcional(textoLivre),
      tipo_beneficio: opcoes(["PERCENTUAL", "VALOR_FIXO"]),
      valor: positivo("Maior que zero. Se tipo_beneficio for PERCENTUAL, no máximo 100"),
      quantidade_maxima_utilizacoes: opcional(inteiroPositivo),
      status: opcoes(["ATIVO", "INATIVO"], "ATIVO"),
    },
    ["campanha_id", "nome", "tipo_beneficio", "valor"],
  ),
  ...modelo(
    "OfertaCampanha",
    {
      beneficio_campanha_id: inteiroPositivo,
      conveniado_id: inteiroPositivo,
      status: opcoes(["ATIVO", "INATIVO"], "ATIVO"),
    },
    ["beneficio_campanha_id", "conveniado_id"],
  ),
  ...modelo(
    "Utilizacao",
    {
      colaborador_id: inteiroPositivo,
      beneficio_conveniado_id: { ...opcional(inteiroPositivo), description: "Oferta comum (/ofertas). Envie este ou beneficio_campanha_conveniado_id, nunca os dois" },
      beneficio_campanha_conveniado_id: { ...opcional(inteiroPositivo), description: "Oferta de campanha (/ofertas-campanha). Envie este ou beneficio_conveniado_id, nunca os dois" },
      token_qrcode: { type: "string", minLength: 1, maxLength: 64, description: "Gerado pela API se não for enviado. Não pode repetir" },
      data_solicitacao: { ...dataHora, description: "AAAA-MM-DD HH:MM:SS. Se não for enviada, usa o momento do cadastro" },
      data_validacao: { ...opcional(dataHora), description: "AAAA-MM-DD HH:MM:SS" },
      valor_aplicado: positivo(),
      canal_validacao: opcional(opcoes(["APP_CONVENIADO", "TERMINAL_IOT"])),
      status: opcoes(["PENDENTE", "APROVADA", "REPROVADA", "ESTORNADA", "EXPIRADA", "CANCELADA"], "PENDENTE"),
      observacoes: opcional(textoLivre),
    },
    ["colaborador_id", "valor_aplicado"],
    {
      beneficio_id: { ...inteiro, nullable: true, description: "Benefício do resgate, gravado já na solicitação" },
      codigo_validacao: { type: "string", nullable: true, description: "Código de 6 letras para digitar quando o QR não funciona" },
      data_expiracao: { ...opcional(dataHora), description: "Prazo para validar: o menor entre solicitação + 3 horas e o fim do ciclo do benefício" },
    },
    ["colaborador_id", "beneficio_conveniado_id", "beneficio_campanha_conveniado_id"],
  ),
  UtilizacaoDoUsuario: {
    type: "object",
    properties: {
      id: inteiro,
      status: { ...opcoes(["PENDENTE", "APROVADA", "REPROVADA", "ESTORNADA", "EXPIRADA", "CANCELADA"]), description: "PENDENTE com prazo vencido já vem como EXPIRADA, mesmo antes da rotina rodar" },
      valor_aplicado: decimal,
      canal_validacao: opcional(opcoes(["APP_CONVENIADO", "TERMINAL_IOT"])),
      data_solicitacao: dataHora,
      data_expiracao: opcional(dataHora),
      data_validacao: opcional(dataHora),
      observacoes: opcional(textoLivre),
      origem: opcoes(["BENEFICIO", "CAMPANHA"]),
      beneficio_id: { ...inteiro, nullable: true, description: "Preenchido quando a origem é BENEFICIO" },
      item_campanha_id: { ...inteiro, nullable: true, description: "Preenchido quando a origem é CAMPANHA" },
      beneficio_nome: textoLivre,
      conveniado_id: { ...inteiro, nullable: true, description: "null até o resgate ser validado" },
      conveniado_nome_fantasia: opcional(textoLivre),
      conveniado_endereco: opcional(textoLivre),
      colaborador_nome: textoLivre,
    },
  },
  Resgate: {
    type: "object",
    properties: {
      id: inteiro,
      status: opcoes(["PENDENTE", "APROVADA", "REPROVADA", "ESTORNADA", "EXPIRADA", "CANCELADA"]),
      token_qrcode: { type: "string", description: "Conteúdo do QR Code" },
      codigo_validacao: { type: "string", example: "2X6MPN", description: "Código de 6 letras para mostrar embaixo do QR" },
      data_solicitacao: dataHora,
      data_expiracao: { ...dataHora, description: "O menor entre solicitação + 3 horas e o fim do ciclo do benefício" },
      data_validacao: opcional(dataHora),
      valor_aplicado: decimal,
      canal_validacao: opcional(opcoes(["APP_CONVENIADO", "TERMINAL_IOT"])),
      observacoes: opcional(textoLivre),
      colaborador_id: inteiro,
      colaborador_nome: textoLivre,
      beneficio_id: inteiro,
      beneficio_nome: textoLivre,
      beneficio_descricao: opcional(textoLivre),
      tipo_beneficio: textoLivre,
      beneficio_valor: decimal,
      conveniado_id: { ...inteiro, nullable: true, description: "null até a validação" },
      conveniado_nome: opcional(textoLivre),
      segundos_restantes: { ...inteiro, description: "Tempo até expirar; 0 quando não está mais pendente" },
    },
  },
  ResgateAguardando: {
    type: "object",
    properties: {
      id: inteiro,
      status: { type: "string", example: "PENDENTE" },
      token_qrcode: textoLivre,
      codigo_validacao: textoLivre,
      data_solicitacao: dataHora,
      data_expiracao: dataHora,
      valor_aplicado: decimal,
      beneficio_id: inteiro,
      beneficio_nome: textoLivre,
      tipo_beneficio: textoLivre,
      beneficio_valor: decimal,
      segundos_restantes: inteiro,
    },
  },
  CategoriaResumo: { type: "object", properties: { id: inteiro, nome: textoLivre } },
  BeneficioCatalogo: {
    type: "object",
    properties: {
      id: inteiro,
      nome: textoLivre,
      descricao: opcional(textoLivre),
      tipo_beneficio: opcoes(["PERCENTUAL", "VALOR_FIXO"]),
      valor: decimal,
      quantidade_maxima_utilizacoes: inteiro,
      tipo_janela: opcoes(["CALENDARIO_FIXO", "JANELA_MOVEL"]),
      unidade_ciclo: opcional(opcoes(["ANO", "MES", "SEMANA"])),
      intervalo_valor: opcional(inteiro),
      intervalo_unidade: opcional(opcoes(["DIA", "MES"])),
    },
  },
  LocalCatalogo: {
    type: "object",
    properties: {
      id: inteiro,
      nome_fantasia: textoLivre,
      endereco: textoLivre,
      categorias: { type: "array", items: { $ref: "#/components/schemas/CategoriaResumo" } },
    },
  },
  UsuarioLogado: {
    type: "object",
    properties: {
      id: inteiro,
      nome: textoLivre,
      email: textoLivre,
      perfil_id: inteiro,
      status: textoLivre,
      data_criacao: dataHora,
      perfil: { type: "string", example: "FCV_ADMIN" },
      escopo: opcoes(["FCV", "COLABORADOR", "CONVENIADO"]),
      colaborador: {
        allOf: [{ $ref: "#/components/schemas/Colaborador" }],
        nullable: true,
        description: "Preenchido quando o escopo é COLABORADOR",
      },
      conveniado: {
        allOf: [{ $ref: "#/components/schemas/Conveniado" }],
        nullable: true,
        description: "Preenchido quando o escopo é CONVENIADO",
      },
    },
  },
};

const recursos: Recurso[] = [
  {
    caminho: "/perfis",
    naoEncontrado: "Perfil de acesso não encontrado",
    tag: "Perfis",
    nome: "Perfil",
    schema: "Perfil",
    soFcv: true,
    soAdministrador: true,
    observacao: "O nome do perfil deve ser único. Perfis com usuários vinculados não podem ser excluídos, devendo ser inativados.",
    exemplo: { nome: "FCV_ESTAGIARIO", escopo: "FCV", descricao: "Só consulta", permissoes: ["consultar"] },
  },
  {
    caminho: "/usuarios",
    naoEncontrado: "Usuário não encontrado",
    tag: "Usuários",
    nome: "Usuário",
    schema: "Usuario",
    soFcv: true,
    soAdministrador: true,
    observacao: "O e-mail deve ser único e a senha ter no mínimo 6 caracteres (criptografada antes de salvar e omitida nas respostas). Usuários vinculados a colaborador ou conveniado não podem ser excluídos.",
    exemplo: { nome: "Maria Lima", email: "maria@fcv.org.br", senha: "123456", perfil_id: 3 },
  },
  {
    caminho: "/colaboradores",
    naoEncontrado: "Colaborador não encontrado",
    tag: "Colaboradores",
    nome: "Colaborador",
    schema: "Colaborador",
    soFcv: true,
    observacao: "Crie antes o usuário (POST /usuarios com perfil de colaborador) e use o id dele em usuario_id. Matrícula e usuario_id são únicos. Colaboradores com histórico de utilizações não podem ser excluídos.",
    exemplo: { usuario_id: 9, matricula: "FCV0100", setor: "Farmácia hospitalar", cargo: "Farmacêutica", data_admissao: "2026-09-01", telefone: "32988887777" },
  },
  {
    caminho: "/conveniados",
    naoEncontrado: "Conveniado não encontrado",
    tag: "Conveniados",
    nome: "Conveniado",
    schema: "Conveniado",
    observacao: "Crie antes o usuário (POST /usuarios com perfil de conveniado) e use o id dele em usuario_id. CNPJ (14 dígitos) e usuario_id são únicos. Conveniados com benefícios ou campanhas vinculados não podem ser excluídos.",
    exemplo: { usuario_id: 10, nome_fantasia: "Padaria Pão Bom", razao_social: "Pão Bom Alimentos Ltda", categoria: "Alimentação", cnpj: "44555666000154", endereco: "Rua Barão do Monte Alto, 300, Muriaé" },
  },
  {
    caminho: "/beneficios",
    naoEncontrado: "Benefício não encontrado",
    tag: "Benefícios",
    nome: "Benefício",
    schema: "Beneficio",
    observacao: "Obrigatórios: nome, tipo_beneficio, valor, quantidade_maxima_utilizacoes e tipo_janela. PERCENTUAL aceita valor até 100. CALENDARIO_FIXO exige unidade_ciclo; JANELA_MOVEL exige intervalo_valor, intervalo_unidade e referencia_contagem. Campos fora da lista são ignorados.",
    observacaoAlteracao: "As regras de percentual e de janela são conferidas com o registro como vai ficar.",
    exclusao: {
      descricao: "Benefício com utilizações registradas em qualquer oferta comum dele não pode ser excluído: altere o status para INATIVO ou DESCONTINUADO. O histórico de uso nunca é apagado.",
      conflito: mensagemExclusaoBloqueada("beneficio"),
    },
    exemplo: { nome: "Ingresso de cinema", descricao: "R$ 20,00 de desconto no ingresso", tipo_beneficio: "VALOR_FIXO", valor: 20, quantidade_maxima_utilizacoes: 2, tipo_janela: "CALENDARIO_FIXO", unidade_ciclo: "MES" },
  },
  {
    caminho: "/ofertas",
    naoEncontrado: "Oferta não encontrada",
    tag: "Ofertas",
    nome: "Oferta",
    schema: "Oferta",
    observacaoAlteracao: "Se a oferta já tem utilizações, trocar beneficio_id ou conveniado_id responde 409: inative a oferta e crie outra.",
    exclusao: {
      descricao: "Oferta comum com utilizações registradas não pode ser excluída: altere o status para INATIVO. A checagem olha só beneficio_conveniado_id; ofertas de campanha ficam em /ofertas-campanha.",
      conflito: mensagemExclusaoBloqueada("oferta"),
    },
    observacao: "Liga um benefício permanente a um conveniado. beneficio_id e conveniado_id precisam existir (senão 400) e o mesmo par não pode se repetir (409). Não aceita beneficio_campanha_id: itens de campanha usam /ofertas-campanha.",
    exemplo: { beneficio_id: 1, conveniado_id: 2 },
  },
  {
    caminho: "/campanhas",
    naoEncontrado: "Campanha/evento não encontrado",
    tag: "Campanhas",
    nome: "Campanha",
    schema: "Campanha",
    observacao: "Obrigatórios: nome, tipo, data_inicio e data_fim (AAAA-MM-DD). data_fim não pode ser anterior a data_inicio.",
    observacaoAlteracao: "Enviando só uma das datas, ela é comparada com a outra já gravada.",
    exclusao: {
      descricao: "Campanha com utilizações registradas em qualquer oferta dos seus itens não pode ser excluída: altere o status para ENCERRADA ou CANCELADA. Sem utilizações, a exclusão apaga junto os itens e as ofertas de campanha dela (CASCADE das tabelas beneficio_campanha e beneficio_campanha_conveniado), pois não há histórico a perder.",
      conflito: mensagemExclusaoBloqueada("campanha"),
    },
    exemplo: { nome: "Novembro Azul", tipo: "CAMPANHA", descricao: "Mês de cuidado com a saúde do homem", data_inicio: "2026-11-01", data_fim: "2026-11-30", criterio_elegibilidade: "Todos os colaboradores ativos" },
  },
  {
    caminho: "/itens-campanha",
    naoEncontrado: "Item de campanha não encontrado",
    tag: "Itens de campanha",
    nome: "Item de campanha",
    schema: "ItemCampanha",
    observacaoAlteracao: "Se o item já tem utilizações, trocar campanha_id responde 409: inative o item e crie outro.",
    exclusao: {
      descricao: "Item com utilizações registradas em qualquer oferta de campanha dele não pode ser excluído: altere o status para INATIVO. Sem utilizações, a exclusão apaga junto as ofertas de campanha do item (CASCADE da tabela beneficio_campanha_conveniado).",
      conflito: mensagemExclusaoBloqueada("item-campanha"),
    },
    observacao: "Obrigatórios: campanha_id (precisa existir, senão 400), nome, tipo_beneficio e valor (PERCENTUAL até 100). Ao excluir a campanha, os itens dela são excluídos junto (só é permitido quando nenhum item tem utilização registrada).",
    exemplo: { campanha_id: 1, nome: "Check-up com desconto", tipo_beneficio: "PERCENTUAL", valor: 30, quantidade_maxima_utilizacoes: 1 },
  },
  {
    caminho: "/ofertas-campanha",
    naoEncontrado: "Oferta do item de campanha não encontrada",
    tag: "Ofertas de campanha",
    nome: "Oferta de campanha",
    schema: "OfertaCampanha",
    observacaoAlteracao: "Se a oferta de campanha já tem utilizações, trocar beneficio_campanha_id ou conveniado_id responde 409: inative a oferta e crie outra.",
    exclusao: {
      descricao: "Oferta de campanha com utilizações registradas não pode ser excluída: altere o status para INATIVO. A checagem olha só beneficio_campanha_conveniado_id; ofertas comuns ficam em /ofertas.",
      conflito: mensagemExclusaoBloqueada("oferta-campanha"),
    },
    observacao: "Liga um item de campanha a um conveniado. beneficio_campanha_id e conveniado_id precisam existir (senão 400) e o mesmo par não pode se repetir (409). Não aceita beneficio_id nem beneficio_conveniado_id: benefícios permanentes usam /ofertas.",
    exemplo: { beneficio_campanha_id: 1, conveniado_id: 1 },
  },
  {
    caminho: "/utilizacoes",
    naoEncontrado: "Utilização não encontrada",
    tag: "Utilizações",
    nome: "Utilização",
    schema: "Utilizacao",
    observacaoAlteracao: "colaborador_id, beneficio_conveniado_id e beneficio_campanha_conveniado_id não podem ser alterados (400): fazem parte do histórico. Para corrigir, cancele com DELETE e registre outra.",
    soFcv: true,
    cancelamento: "Utilizações nunca são apagadas, para preservar o histórico. O DELETE cancela mudando o status: PENDENTE vira REPROVADA e APROVADA vira ESTORNADA, e acrescenta \"Cancelada pela FCV\" nas observações. Se já estiver REPROVADA ou ESTORNADA, responde 409.",
    observacao: "Informe um entre beneficio_conveniado_id e beneficio_campanha_conveniado_id, nunca os dois (400). colaborador_id e a oferta precisam existir, cada uma na sua tabela (400). Se token_qrcode não for enviado, a API gera um; token repetido responde 409.",
    exemplo: { colaborador_id: 1, beneficio_conveniado_id: 1, valor_aplicado: 25 },
  },
];

export const documentacao = {
  openapi: "3.0.3",
  info: {
    title: "API da Plataforma FCV",
    version: "1.0.0",
    description:
      "Para testar: faça o login em POST /auth/login, copie o token da resposta, clique em Authorize e cole o token. Usuários de teste usam a senha 123456 (ex.: admin@fcv.org.br).",
  },
  servers: [{ url: "/api/v1" }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Autenticação" },
    { name: "Meus dados" },
    { name: "Catálogo do app", description: "Telas do aplicativo do colaborador: resumo, benefícios e locais" },
    { name: "Resgate", description: "Etapa A: o colaborador pede o resgate sem escolher o local e recebe o QR" },
    { name: "Validação", description: "Etapa B: o conveniado lê o QR ou digita o código e aprova ou reprova" },
    { name: "Categorias" },
    ...recursos.map((r) => ({ name: r.tag })),
  ],
  paths: {
    "/auth/login": {
      post: {
        tags: ["Autenticação"],
        summary: "Faz login e devolve o token",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "senha"],
                properties: { email: textoLivre, senha: textoLivre },
              },
              example: { email: "admin@fcv.org.br", senha: "123456" },
            },
          },
        },
        responses: {
          200: {
            description: "Login feito",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { token: textoLivre, usuario: { $ref: "#/components/schemas/UsuarioLogado" } },
                },
              },
            },
          },
          400: { description: "E-mail ou senha não enviados", ...erro("Informe e-mail e senha") },
          401: { description: "E-mail ou senha incorretos", ...erro("E-mail ou senha incorretos") },
          403: {
            description:
              "Conta bloqueada: usuário ou perfil INATIVO, colaborador INATIVO ou AFASTADO, conveniado INATIVO ou EM_ANALISE",
            ...erro("Colaborador inativo ou afastado"),
          },
        },
      },
    },
    "/auth/eu": {
      get: {
        tags: ["Autenticação"],
        summary: "Dados de quem está logado",
        description: "Preserva os campos do usuário e devolve somente o vínculo correspondente ao escopo atual: colaborador para COLABORADOR, conveniado para CONVENIADO; os demais vínculos são null. As projeções são explícitas e a senha nunca é retornada.",
        responses: {
          200: {
            description: "Usuário do token",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UsuarioLogado" } } },
          },
          ...respostasComuns,
        },
      },
    },
    "/auth/registrar": {
      post: {
        tags: ["Autenticação"],
        summary: "Colaborador cria a própria conta",
        description:
          "Cria o usuário (perfil de colaborador) e os dados de colaborador. A conta nasce INATIVO: o login só funciona depois que a FCV liberar com PUT /usuarios/{id} enviando status ATIVO.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nome", "email", "senha", "matricula", "setor", "cargo", "data_admissao"],
                properties: {
                  nome: texto(150),
                  email: { type: "string", format: "email", maxLength: 150 },
                  senha: textoLivre,
                  matricula: texto(30),
                  setor: texto(100),
                  cargo: texto(100),
                  data_admissao: data,
                  telefone: opcional(texto(20)),
                },
              },
              example: {
                nome: "Renata Alves",
                email: "renata@fcv.org.br",
                senha: "123456",
                matricula: "FCV0200",
                setor: "Enfermagem",
                cargo: "Técnica de Enfermagem",
                data_admissao: "2026-10-01",
                telefone: "32999990000",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Cadastro criado, aguardando liberação",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mensagem: { type: "string", example: "Cadastro enviado. Aguarde a FCV liberar o acesso" },
                    usuario: { $ref: "#/components/schemas/UsuarioLogado" },
                  },
                },
              },
            },
          },
          400: {
            description: "Faltou campo obrigatório",
            ...erro("Informe nome, e-mail, senha, matrícula, setor, cargo e data de admissão"),
          },
          409: { description: "E-mail ou matrícula já cadastrados", ...erro("Já existe um registro com esse valor (campo único repetido)") },
        },
      },
    },
    "/auth/esqueci-senha": {
      post: {
        tags: ["Autenticação"],
        summary: "Pede um código para trocar a senha", description:
          "Gera um código de 6 dígitos que vale 15 minutos e invalida os anteriores. A resposta é sempre a mesma, exista ou não o e-mail, e nunca traz o código. Enquanto não há envio por e-mail, o código aparece só no terminal da API (fora de produção). No máximo 3 códigos por hora para o mesmo usuário.", security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["email"], properties: { email: textoLivre } },
              example: { email: "carla@fcv.org.br" },
            },
          },
        },
        responses: {
          200: {
            description: "Pedido recebido",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mensagem: {
                      type: "string",
                      example: "Se o e-mail estiver cadastrado, um código foi enviado. Ele vale 15 minutos",
                    },
                  },
                },
              },
            },
          },
          400: { description: "E-mail não enviado", ...erro("Informe o e-mail") },
        },
      },
    },
    "/auth/redefinir-senha": {
      post: {
        tags: ["Autenticação"],
        summary: "Troca a senha usando o código",
        description: "O consumo é transacional: requisições simultâneas com o mesmo código têm no máximo um sucesso. A troca de senha e a invalidação dos códigos são confirmadas juntas. Tentativas inválidas contam para o limite de cinco.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "codigo", "nova_senha"],
                properties: { email: textoLivre, codigo: textoLivre, nova_senha: textoLivre },
              },
              example: { email: "carla@fcv.org.br", codigo: "482913", nova_senha: "nova123" },
            },
          },
        },
        responses: {
          200: {
            description: "Senha alterada",
            content: {
              "application/json": {
                schema: { type: "object", properties: { mensagem: { type: "string", example: "Senha alterada" } } },
              },
            },
          },
          400: {
            description: "Campos faltando ou código errado, expirado, já usado ou com 5 tentativas erradas",
            ...erro("Código inválido ou expirado"),
          },
        },
      },
    },
    "/eu/utilizacoes": {
      get: {
        tags: ["Meus dados"],
        summary: "Histórico de utilizações de quem está logado",
        description:
          "Colaborador recebe somente suas utilizações dos últimos 6 meses (envie de para olhar mais longe); conveniado somente as validadas no estabelecimento autenticado. Todos os status. busca procura no nome e na descrição do benefício. PENDENTE vencido já vem como EXPIRADA. Sem pagina/limite preserva array completo; enviar qualquer um ativa o envelope. Padrão: data_solicitacao desc, desempate por id asc. O mesmo dono e os mesmos filtros restringem os dados e o total. IDs de dono na query não são aceitos. Escopo FCV recebe 403 e usa GET /utilizacoes.",
        parameters: parametrosConsulta({ ...configuracaoHistorico, periodo: "Dia válido de 1000-01-01 a 9999-12-31, no formato AAAA-MM-DD. de não pode superar ate; inclui todo o dia final." }),
        responses: {
          200: {
            description: "Array completo ou envelope paginado explícito, preservando os campos das utilizações",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { type: "array", items: { $ref: "#/components/schemas/UtilizacaoDoUsuario" } },
                    { type: "object", required: ["dados", "paginacao"], properties: {
                      dados: { type: "array", items: { $ref: "#/components/schemas/UtilizacaoDoUsuario" } },
                      paginacao: { $ref: "#/components/schemas/Paginacao" },
                    } },
                  ],
                },
              },
            },
          },
          400: { description: "Query desconhecida, estruturada, repetida, paginação/ordenação inválida, data inexistente ou intervalo invertido", ...erro("de não pode ser posterior a ate") },
          ...respostasComuns,
          403: {
            description: "Escopo FCV, ou usuário, perfil ou vínculo inativo",
            ...erro("Seu perfil não tem acesso a esta rota"),
          },
          404: {
            description: "Usuário sem cadastro de colaborador ou conveniado",
            ...erro("Cadastro de colaborador ou conveniado não encontrado"),
          },
        },
      },
    },
    "/eu/aguardando": {
      get: {
        tags: ["Meus dados"],
        summary: "Resgates do colaborador aguardando validação",
        description: "Só os PENDENTE ainda no prazo (confere a data, não só o status), do que expira primeiro para o último. Serve para a Home do app mostrar o QR de novo e o tempo restante. Só COLABORADOR.",
        responses: {
          200: { description: "Lista, vazia quando não há nenhum", ...jsonResposta({ type: "array", items: { $ref: "#/components/schemas/ResgateAguardando" } }) },
          ...respostasComuns,
          403: { description: "Escopo FCV ou CONVENIADO", ...erro("Seu perfil não tem acesso a esta rota") },
        },
      },
    },
    "/catalogo/resumo": {
      get: {
        tags: ["Catálogo do app"],
        summary: "Resumo da Home",
        description: "Quantidade de benefícios disponíveis e de conveniados.",
        responses: {
          200: { description: "Resumo", ...jsonResposta({ type: "object", properties: { beneficios_disponiveis: inteiro, conveniados: inteiro } }) },
          ...respostasComuns,
        },
      },
    },
    "/catalogo/beneficios": {
      get: {
        tags: ["Catálogo do app"],
        summary: "Benefícios ativos com busca e filtro por categoria",
        description: "categoria_id traz os benefícios que têm algum conveniado daquela categoria.",
        parameters: [parametroBusca("Procura no nome e na descrição do benefício"), parametroCategoria],
        responses: {
          200: {
            description: "Lista de benefícios",
            ...jsonResposta({ type: "array", items: { allOf: [{ $ref: "#/components/schemas/BeneficioCatalogo" }, { type: "object", properties: { total_locais: inteiro, categorias: { type: "array", items: { $ref: "#/components/schemas/CategoriaResumo" } } } }] } }),
          },
          400: { description: "busca ou categoria_id inválido", ...erro("categoria_id deve ser um número inteiro positivo") },
          ...respostasComuns,
        },
      },
    },
    "/catalogo/beneficios/{id}": {
      parameters: [parametroId],
      get: {
        tags: ["Catálogo do app"],
        summary: "Detalhe do benefício com os locais onde usar",
        responses: {
          200: {
            description: "Benefício",
            ...jsonResposta({ allOf: [{ $ref: "#/components/schemas/BeneficioCatalogo" }, { type: "object", properties: { categorias: { type: "array", items: { $ref: "#/components/schemas/CategoriaResumo" } }, locais: { type: "array", items: { $ref: "#/components/schemas/LocalCatalogo" } } } }] }),
          },
          400: { description: "ID inválido", ...erro("ID inválido. Informe um número inteiro positivo") },
          404: { description: "Não existe ou não está ativo", ...erro("Benefício não encontrado ou inativo") },
          ...respostasComuns,
        },
      },
    },
    "/catalogo/locais": {
      get: {
        tags: ["Catálogo do app"],
        summary: "Locais (conveniados ativos com benefício ativo)",
        parameters: [parametroBusca("Procura no nome do local"), parametroCategoria],
        responses: {
          200: { description: "Lista de locais", ...jsonResposta({ type: "array", items: { allOf: [{ $ref: "#/components/schemas/LocalCatalogo" }, { type: "object", properties: { total_beneficios: inteiro } }] } }) },
          400: { description: "busca ou categoria_id inválido", ...erro("categoria_id deve ser um número inteiro positivo") },
          ...respostasComuns,
        },
      },
    },
    "/catalogo/locais/{id}": {
      parameters: [parametroId],
      get: {
        tags: ["Catálogo do app"],
        summary: "Detalhe do local com categorias e benefícios ativos",
        responses: {
          200: {
            description: "Local",
            ...jsonResposta({ allOf: [{ $ref: "#/components/schemas/LocalCatalogo" }, { type: "object", properties: { razao_social: textoLivre, beneficios: { type: "array", items: { $ref: "#/components/schemas/BeneficioCatalogo" } } } }] }),
          },
          400: { description: "ID inválido", ...erro("ID inválido. Informe um número inteiro positivo") },
          404: { description: "Não existe ou não está ativo", ...erro("Local não encontrado ou inativo") },
          ...respostasComuns,
        },
      },
    },
    "/resgates": {
      post: {
        tags: ["Resgate"],
        summary: "Colaborador pede o resgate de um benefício",
        description: "Cria a utilização PENDENTE sem conveniado. A expiração é o menor entre agora + 3 horas e o fim do ciclo (CALENDARIO_FIXO); na JANELA_MOVEL vale só as 3 horas. PENDENTE e APROVADA contam no limite do ciclo; só um PENDENTE por benefício. Mostre o QR com token_qrcode e o codigo_validacao em texto embaixo. Só COLABORADOR.",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["beneficio_id"], properties: { beneficio_id: inteiroPositivo } }, example: { beneficio_id: 1 } } } },
        responses: {
          201: { description: "Resgate criado", ...jsonResposta({ $ref: "#/components/schemas/Resgate" }) },
          400: { description: "beneficio_id faltando ou inválido", ...erro("Informe o beneficio_id (número inteiro positivo)") },
          404: { description: "Benefício inexistente", ...erro("Benefício não encontrado") },
          409: { description: "Benefício inativo ou sem local, já existe um pendente (vem utilizacao_id e data_expiracao) ou limite do ciclo atingido", ...erro("Você já tem um resgate deste benefício aguardando validação") },
          ...respostasComuns,
          403: { description: "Não é COLABORADOR ou o colaborador não está ativo", ...erro("Seu perfil não tem acesso a esta rota") },
        },
      },
    },
    "/resgates/{id}": {
      parameters: [parametroId],
      get: {
        tags: ["Resgate"],
        summary: "Situação de um resgate do colaborador",
        description: "Use para atualizar a tela do QR: quando status deixa de ser PENDENTE, o resgate foi validado, reprovado, cancelado ou expirou. Só o dono vê.",
        responses: {
          200: { description: "Resgate", ...jsonResposta({ $ref: "#/components/schemas/Resgate" }) },
          404: { description: "Não existe ou é de outro colaborador", ...erro("Resgate não encontrado") },
          ...respostasComuns,
        },
      },
    },
    "/resgates/{id}/cancelar": {
      parameters: [parametroId],
      post: {
        tags: ["Resgate"],
        summary: "Colaborador desiste do resgate pendente",
        description: "PENDENTE vira CANCELADA e deixa de contar no limite.",
        responses: {
          200: { description: "Cancelado", ...jsonResposta({ $ref: "#/components/schemas/Resgate" }) },
          404: { description: "Não existe ou é de outro colaborador", ...erro("Resgate não encontrado") },
          409: { description: "Já não está pendente", ...erro("Este resgate já foi aprovado") },
          ...respostasComuns,
        },
      },
    },
    "/validacao/{codigo}": {
      parameters: [parametroCodigo],
      get: {
        tags: ["Validação"],
        summary: "Conveniado confere o resgate antes de decidir",
        description: "Aceita o conteúdo lido do QR (token_qrcode) ou o código de 6 letras digitado (maiúsculas ou minúsculas). Resgate inexistente e benefício não aceito neste estabelecimento recebem a mesma resposta 404. Depois de 10 códigos errados em 15 minutos, responde 429. Só CONVENIADO.",
        responses: {
          200: { description: "Resgate pendente e aceito aqui", ...jsonResposta({ $ref: "#/components/schemas/Resgate" }) },
          404: { description: "Não existe ou não é aceito neste estabelecimento", ...erro("Resgate não encontrado neste estabelecimento. Confira o código e se o benefício é aceito aqui") },
          409: { description: "Expirado (grava EXPIRADA na hora), já decidido, benefício ou colaborador inativo. Vem também o campo status", ...erro("Este resgate expirou. Peça para o colaborador solicitar de novo") },
          429: { description: "Muitos códigos errados", ...erro("Muitos códigos errados. Tente de novo em 15 minuto(s)") },
          ...respostasComuns,
          403: { description: "Não é CONVENIADO", ...erro("Seu perfil não tem acesso a esta rota") },
        },
      },
    },
    "/validacao/{codigo}/aprovar": decisao("Aprova o resgate", "Confere tudo de novo (pendente, prazo, estabelecimento, benefício e colaborador ativos) e muda para APROVADA com uma atualização condicional: se duas leituras chegarem juntas, só uma aprova. Grava o conveniado, a data da validação e o canal."),
    "/validacao/{codigo}/reprovar": decisao("Reprova o resgate", "Mesmas conferências da aprovação; muda para REPROVADA e grava o motivo nas observações, se enviado."),
    "/categorias": {
      get: {
        tags: ["Categorias"],
        summary: "Lista as categorias de conveniado",
        description: "Ordenadas por nome. Qualquer usuário logado.",
        parameters: [{ name: "status", in: "query", required: false, schema: opcoes(["ATIVO", "INATIVO"]) }],
        responses: { 200: { description: "Lista", ...jsonResposta({ type: "array", items: { $ref: "#/components/schemas/Categoria" } }) }, ...respostasComuns },
      },
      post: {
        tags: ["Categorias"],
        summary: "Cria uma categoria",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CategoriaEntrada" }, example: { nome: "Educação" } } } },
        responses: {
          201: { description: "Criada", ...jsonResposta({ $ref: "#/components/schemas/Categoria" }) },
          400: { description: "Nome vazio ou longo demais", ...erro("Informe o nome da categoria") },
          409: { description: "Nome repetido", ...erro("Já existe uma categoria com esse nome") },
          ...respostasFcv,
        },
      },
    },
    "/categorias/{id}": {
      parameters: [parametroId],
      get: {
        tags: ["Categorias"],
        summary: "Mostra uma categoria",
        responses: { 200: { description: "Categoria", ...jsonResposta({ $ref: "#/components/schemas/Categoria" }) }, 404: { description: "Não existe", ...erro("Categoria não encontrada") }, ...respostasComuns },
      },
      put: {
        tags: ["Categorias"],
        summary: "Altera nome ou status",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CategoriaAlteracao" }, example: { status: "INATIVO" } } } },
        responses: {
          200: { description: "Alterada", ...jsonResposta({ $ref: "#/components/schemas/Categoria" }) },
          404: { description: "Não existe", ...erro("Categoria não encontrada") },
          409: { description: "Nome repetido", ...erro("Já existe uma categoria com esse nome") },
          ...respostasFcv,
        },
      },
      delete: {
        tags: ["Categorias"],
        summary: "Exclui uma categoria sem conveniados",
        description: "Com conveniado vinculado responde 409: inative alterando o status para INATIVO.",
        responses: {
          204: { description: "Excluída" },
          404: { description: "Não existe", ...erro("Categoria não encontrada") },
          409: { description: "Tem conveniados vinculados", ...erro("Esta categoria tem 1 conveniado(s) vinculado(s). Inative a categoria alterando o status para INATIVO") },
          ...respostasFcv,
        },
      },
    },
    ...Object.assign({}, ...recursos.map(crud)),
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas,
  },
};
