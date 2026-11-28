"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expirarResgates = expirarResgates;
exports.iniciarRotinaExpiracao = iniciarRotinaExpiracao;
const db_1 = __importDefault(require("../database/db"));
const tempo_1 = require("../utils/tempo");
const TRAVA = "fcv_expirar_resgates";
async function expirarResgates(conexao = db_1.default, momento = (0, tempo_1.agora)()) {
    return conexao.transaction(async (trx) => {
        const [linhas] = await trx.raw("SELECT GET_LOCK(?, 0) AS livre", [TRAVA]);
        if (Number(linhas[0]?.livre) !== 1)
            return null;
        try {
            return await trx("utilizacao")
                .where("status", "PENDENTE")
                .where("data_expiracao", "<=", momento)
                .update({ status: "EXPIRADA" });
        }
        finally {
            await trx.raw("SELECT RELEASE_LOCK(?)", [TRAVA]);
        }
    });
}
function iniciarRotinaExpiracao(minutos = Number(process.env.EXPIRACAO_MINUTOS) || 5) {
    const rodar = async () => {
        try {
            const total = await expirarResgates();
            if (total)
                console.log(`Rotina de expiração: ${total} resgate(s) marcados como EXPIRADA`);
        }
        catch (erro) {
            console.error("Rotina de expiração falhou:", erro instanceof Error ? erro.message : erro);
        }
    };
    void rodar();
    return setInterval(rodar, minutos * 60_000);
}
