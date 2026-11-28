"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const expirarResgates_1 = require("./jobs/expirarResgates");
const porta = Number(process.env.PORTA) || 3333;
app_1.default.listen(porta, () => {
    console.log(`API rodando em http://localhost:${porta}`);
    (0, expirarResgates_1.iniciarRotinaExpiracao)();
});
