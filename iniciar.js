require("dotenv/config");
const path = require("path");
const knex = require("knex");

if (process.env.PORT && !process.env.PORTA) process.env.PORTA = process.env.PORT;

const banco = knex({
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORTA) || 3306,
    user: process.env.DB_USUARIO,
    password: process.env.DB_SENHA,
    database: process.env.DB_NOME,
    dateStrings: true,
    decimalNumbers: true,
  },
  migrations: { directory: path.join(__dirname, "dist/src/database/migrations"), loadExtensions: [".js"] },
  seeds: { directory: path.join(__dirname, "dist/src/database/seeds"), loadExtensions: [".js"] },
});

async function preparar() {
  await banco.migrate.latest();
  const [{ total }] = await banco("usuario").count({ total: "*" });
  if (Number(total) === 0) await banco.seed.run();
}

preparar()
  .catch((erro) => console.error("Falha ao preparar o banco:", erro))
  .finally(() => banco.destroy())
  .then(() => require("./dist/src/server.js"));
