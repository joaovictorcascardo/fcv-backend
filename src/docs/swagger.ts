import { recursosListagem, type NomeRecursoListagem } from "../queries/recursos";
import type { ConfiguracaoListagem } from "../queries/listagem";

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
  schema: { type: "integer" },
};

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
};

function parametrosListagem(caminho: string) {
  const config: ConfiguracaoListagem & { periodo?: string } = recursosListagem[caminho.slice(1) as NomeRecursoListagem];
  const parametro = (name: string, description: string, schema: object) => ({ name, in: "query", required: false, description, schema });
  return [
    parametro("pagina", "Ativa o formato paginado. Inteiro positivo; padrão 1 quando pagina ou limite é enviado.", { type: "integer", minimum: 1 }),
    parametro("limite", "Ativa o formato paginado. Entre 1 e 100; padrão 20 quando pagina ou limite é enviado.", { type: "integer", minimum: 1, maximum: 100 }),
    parametro("ordenarPor", "Campo permitido; id é usado como desempate. Não aceita expressão SQL.", { type: "string", enum: Object.keys(config.ordenarPor), default: "id" }),
    parametro("ordem", "Sentido da ordenação principal. Desempate por id crescente.", { type: "string", enum: ["asc", "desc"], default: "asc" }),
    ...(config.busca?.length ? [parametro("busca", "Substring literal nos campos textuais permitidos. % e _ são literais.", { type: "string", minLength: 1, maxLength: 150 })] : []),
    ...Object.entries(config.filtros ?? {}).map(([nome, filtro]) => parametro(
      nome,
      filtro.tipo === "data" ? config.periodo ?? "Dia no formato YYYY-MM-DD; intervalo inclusivo." : "Filtro de igualdade, combinado por AND com os demais filtros.",
      filtro.tipo === "inteiro" ? { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER }
        : filtro.tipo === "enum" ? { type: "string", enum: [...(filtro.valores ?? [])] }
          : filtro.tipo === "data" ? { type: "string", format: "date" }
            : { type: "string", minLength: 1, maxLength: 150 },
    )),
  ];
}

function crud({ caminho, tag, nome, schema, exemplo, naoEncontrado: mensagem, soFcv, soAdministrador, observacao }: Recurso) {
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
        responses: { 200: { description: "Registro encontrado", ...json(ref) }, 404: naoEncontrado, ...leitura },
      },
      put: {
        tags: [tag],
        summary: `Altera ${nome.toLowerCase()}`,
        description: "Envie só os campos que mudaram.",
        requestBody: corpo(false),
        responses: {
          200: { description: "Registro atualizado", ...json(ref) },
          400: { description: "Nenhum campo enviado ou valor inválido", ...erro("Nenhum campo enviado para atualizar") },
          404: naoEncontrado,
          ...escrita,
        },
      },
      delete: {
        tags: [tag],
        summary: `Exclui ${nome.toLowerCase()}`,
        responses: {
          204: { description: "Registro excluído" },
          404: naoEncontrado,
          409: { description: "Há registros ligados a este", ...erro("Não é possível excluir: há outros registros ligados a este") },
          ...escrita,
        },
      },
    },
  };
}

function modelo(nome: string, campos: Record<string, object>, obrigatorios: string[], somenteLeitura: Record<string, object> = {}) {
  return {
    [`${nome}Entrada`]: { type: "object", required: obrigatorios, properties: campos },
    [`${nome}Alteracao`]: { type: "object", properties: campos },
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
    properties: { erro: textoLivre, detalhe: textoLivre },
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
      senha: { type: "string", writeOnly: true },
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
      categoria: texto(60),
      cnpj: { type: "string", maxLength: 14, description: "Só os 14 dígitos" },
      endereco: texto(255),
      status: opcoes(["ATIVO", "INATIVO", "EM_ANALISE"], "EM_ANALISE"),
    },
    ["usuario_id", "nome_fantasia", "razao_social", "categoria", "cnpj", "endereco"],
  ),
  ...modelo(
    "Beneficio",
    {
      nome: texto(150),
      descricao: opcional(textoLivre),
      status: opcoes(["ATIVO", "INATIVO", "DESCONTINUADO"], "ATIVO"),
      tipo_beneficio: opcoes(["PERCENTUAL", "VALOR_FIXO"]),
      valor: decimal,
      quantidade_maxima_utilizacoes: inteiro,
      tipo_janela: opcoes(["CALENDARIO_FIXO", "JANELA_MOVEL"]),
      unidade_ciclo: opcional(opcoes(["ANO", "MES", "SEMANA"])),
      dia_reset: opcional(data),
      intervalo_valor: opcional(inteiro),
      intervalo_unidade: opcional(opcoes(["DIA", "MES"])),
      referencia_contagem: opcional(opcoes(["ULTIMA_UTILIZACAO", "DATA_ADMISSAO_COLABORADOR"])),
    },
    ["nome", "tipo_beneficio", "valor", "quantidade_maxima_utilizacoes", "tipo_janela"],
  ),
  ...modelo(
    "Oferta",
    {
      beneficio_id: inteiro,
      conveniado_id: inteiro,
      status: opcoes(["ATIVO", "INATIVO"], "ATIVO"),
    },
    ["beneficio_id", "conveniado_id"],
  ),
  ...modelo(
    "Campanha",
    {
      nome: texto(150),
      tipo: opcoes(["CAMPANHA", "EVENTO_INTERNO", "EVENTO_PATROCINADO", "VOUCHER", "CORTESIA"]),
      descricao: opcional(textoLivre),
      data_inicio: data,
      data_fim: data,
      criterio_elegibilidade: opcional(textoLivre),
      patrocinador: opcional(texto(150)),
      status: opcoes(["PLANEJADA", "ATIVA", "ENCERRADA", "CANCELADA"], "PLANEJADA"),
    },
    ["nome", "tipo", "data_inicio", "data_fim"],
  ),
  ...modelo(
    "ItemCampanha",
    {
      campanha_id: inteiro,
      nome: texto(150),
      descricao: opcional(textoLivre),
      tipo_beneficio: opcoes(["PERCENTUAL", "VALOR_FIXO"]),
      valor: decimal,
      quantidade_maxima_utilizacoes: opcional(inteiro),
      status: opcoes(["ATIVO", "INATIVO"], "ATIVO"),
    },
    ["campanha_id", "nome", "tipo_beneficio", "valor"],
  ),
  ...modelo(
    "OfertaCampanha",
    {
      beneficio_campanha_id: inteiro,
      conveniado_id: inteiro,
      status: opcoes(["ATIVO", "INATIVO"], "ATIVO"),
    },
    ["beneficio_campanha_id", "conveniado_id"],
  ),
  ...modelo(
    "Utilizacao",
    {
      colaborador_id: inteiro,
      beneficio_conveniado_id: opcional(inteiro),
      beneficio_campanha_conveniado_id: opcional(inteiro),
      token_qrcode: { type: "string", maxLength: 64, description: "Gerado pela API se não for enviado" },
      data_confirmacao: opcional(dataHora),
      valor_aplicado: decimal,
      canal_validacao: opcional(opcoes(["APP_CONVENIADO", "TERMINAL_IOT"])),
      status: opcoes(["PENDENTE", "APROVADA", "REPROVADA", "ESTORNADA"], "PENDENTE"),
      observacoes: opcional(textoLivre),
    },
    ["colaborador_id", "valor_aplicado"],
    { data_solicitacao: dataHora },
  ),
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
    observacao: "A senha é criptografada antes de ser salva e nunca volta na resposta.",
    exemplo: { nome: "Maria Lima", email: "maria@fcv.org.br", senha: "123456", perfil_id: 3 },
  },
  {
    caminho: "/colaboradores",
    naoEncontrado: "Colaborador não encontrado",
    tag: "Colaboradores",
    nome: "Colaborador",
    schema: "Colaborador",
    soFcv: true,
    observacao: "Crie antes o usuário (POST /usuarios com perfil de colaborador) e use o id dele em usuario_id.",
    exemplo: { usuario_id: 9, matricula: "FCV0100", setor: "Farmácia hospitalar", cargo: "Farmacêutica", data_admissao: "2026-09-01", telefone: "32988887777" },
  },
  {
    caminho: "/conveniados",
    naoEncontrado: "Conveniado não encontrado",
    tag: "Conveniados",
    nome: "Conveniado",
    schema: "Conveniado",
    observacao: "Crie antes o usuário (POST /usuarios com perfil de conveniado) e use o id dele em usuario_id.",
    exemplo: { usuario_id: 10, nome_fantasia: "Padaria Pão Bom", razao_social: "Pão Bom Alimentos Ltda", categoria: "Alimentação", cnpj: "44555666000154", endereco: "Rua Barão do Monte Alto, 300, Muriaé" },
  },
  {
    caminho: "/beneficios",
    naoEncontrado: "Benefício não encontrado",
    tag: "Benefícios",
    nome: "Benefício",
    schema: "Beneficio",
    exemplo: { nome: "Ingresso de cinema", descricao: "R$ 20,00 de desconto no ingresso", tipo_beneficio: "VALOR_FIXO", valor: 20, quantidade_maxima_utilizacoes: 2, tipo_janela: "CALENDARIO_FIXO", unidade_ciclo: "MES" },
  },
  {
    caminho: "/ofertas",
    naoEncontrado: "Oferta não encontrada",
    tag: "Ofertas",
    nome: "Oferta",
    schema: "Oferta",
    observacao: "Liga um benefício a um conveniado. O mesmo par não pode se repetir.",
    exemplo: { beneficio_id: 1, conveniado_id: 2 },
  },
  {
    caminho: "/campanhas",
    naoEncontrado: "Campanha/evento não encontrado",
    tag: "Campanhas",
    nome: "Campanha",
    schema: "Campanha",
    exemplo: { nome: "Novembro Azul", tipo: "CAMPANHA", descricao: "Mês de cuidado com a saúde do homem", data_inicio: "2026-11-01", data_fim: "2026-11-30", criterio_elegibilidade: "Todos os colaboradores ativos" },
  },
  {
    caminho: "/itens-campanha",
    naoEncontrado: "Item de campanha não encontrado",
    tag: "Itens de campanha",
    nome: "Item de campanha",
    schema: "ItemCampanha",
    observacao: "Ao excluir a campanha, os itens dela são excluídos junto.",
    exemplo: { campanha_id: 1, nome: "Check-up com desconto", tipo_beneficio: "PERCENTUAL", valor: 30, quantidade_maxima_utilizacoes: 1 },
  },
  {
    caminho: "/ofertas-campanha",
    naoEncontrado: "Oferta do item de campanha não encontrada",
    tag: "Ofertas de campanha",
    nome: "Oferta de campanha",
    schema: "OfertaCampanha",
    observacao: "Liga um item de campanha a um conveniado. O mesmo par não pode se repetir.",
    exemplo: { beneficio_campanha_id: 1, conveniado_id: 1 },
  },
  {
    caminho: "/utilizacoes",
    naoEncontrado: "Utilização não encontrada",
    tag: "Utilizações",
    nome: "Utilização",
    schema: "Utilizacao",
    soFcv: true,
    observacao: "Informe um entre beneficio_conveniado_id e beneficio_campanha_conveniado_id, nunca os dois. Se token_qrcode não for enviado, a API gera um.",
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
  tags: [{ name: "Autenticação" }, ...recursos.map((r) => ({ name: r.tag }))],
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
    ...Object.assign({}, ...recursos.map(crud)),
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas,
  },
};
