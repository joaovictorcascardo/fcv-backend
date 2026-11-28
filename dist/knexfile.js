"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config = {
    client: "mysql2",
    connection: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORTA),
        user: process.env.DB_USUARIO,
        password: process.env.DB_SENHA,
        database: process.env.DB_NOME,
        dateStrings: true,
        decimalNumbers: true,
    },
    migrations: { directory: "./src/database/migrations" },
    seeds: { directory: "./src/database/seeds" },
};
exports.default = config;
