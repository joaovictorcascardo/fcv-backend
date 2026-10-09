import "dotenv/config";
import type { Knex } from "knex";

const config: Knex.Config = {
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
export default config;
