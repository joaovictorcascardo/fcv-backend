"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const routes_1 = __importDefault(require("./routes"));
const erros_1 = require("./middlewares/erros");
const swagger_1 = require("./docs/swagger");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.json({ mensagem: "API da Plataforma FCV no ar" });
});
app.use("/api/v1/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.documentacao, { customSiteTitle: "API FCV" }));
app.use("/api/v1", routes_1.default);
app.use((req, res) => {
    res.status(404).json({ erro: "Rota não encontrada" });
});
app.use(erros_1.tratarErros);
exports.default = app;
