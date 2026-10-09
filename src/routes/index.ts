import { Router } from "express";
import authRoutes from "./authRoutes";
import { autenticar } from "../middlewares/autenticar";
import { permitir } from "../middlewares/permitir";
import perfilAcessoRoutes from "./perfilAcessoRoutes";
import usuarioRoutes from "./usuarioRoutes";

const rotas = Router();
rotas.use("/auth", authRoutes);
rotas.use("/perfis", autenticar, permitir("FCV"), perfilAcessoRoutes);
rotas.use("/usuarios", autenticar, permitir("FCV"), usuarioRoutes);
export default rotas;
