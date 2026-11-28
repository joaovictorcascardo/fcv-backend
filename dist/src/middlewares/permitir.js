"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permitir = permitir;
exports.permitirPerfil = permitirPerfil;
function permitir(...escopos) {
    return (req, res, next) => {
        if (!escopos.includes(res.locals.usuario.escopo)) {
            res.status(403).json({ erro: "Seu perfil não tem acesso a esta rota" });
            return;
        }
        next();
    };
}
function permitirPerfil(...perfis) {
    return (req, res, next) => {
        if (!perfis.includes(res.locals.usuario.perfil)) {
            res.status(403).json({ erro: "Seu perfil não tem permissão para esta ação" });
            return;
        }
        next();
    };
}
