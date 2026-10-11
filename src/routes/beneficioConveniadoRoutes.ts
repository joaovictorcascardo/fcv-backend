import { Router } from "express";
import { beneficioConveniadoController } from "../controllers/beneficioConveniadoController";

const router = Router();

router.get("/", beneficioConveniadoController.listar);

router.get("/:id", beneficioConveniadoController.buscar);

router.post("/", beneficioConveniadoController.criar);

router.put("/:id", beneficioConveniadoController.atualizar);

router.delete("/:id", beneficioConveniadoController.excluir);

export default router;