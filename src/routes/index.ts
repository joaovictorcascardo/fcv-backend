import { Router } from "express";
import authRoutes from "./authRoutes";

const rotas = Router();
rotas.use("/auth", authRoutes);
export default rotas;
