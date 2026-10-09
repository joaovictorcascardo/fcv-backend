import express from "express";
import cors from "cors";
import rotas from "./routes";
import { tratarErros } from "./middlewares/erros";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ mensagem: "API da Plataforma FCV no ar" });
});

app.use("/api/v1", rotas);

app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

app.use(tratarErros);

export default app;
