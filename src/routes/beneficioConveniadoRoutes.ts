import { Router } from "express";
import { permitir } from "../middlewares/permitir";
import { beneficioConveniadoController } from "../controllers/beneficioConveniadoController";

const router = Router();

router.get("/", beneficioConveniadoController.listar);

router.get("/:id", beneficioConveniadoController.buscar);

router.post("/", permitir("FCV"), beneficioConveniadoController.criar);

router.put("/:id", permitir("FCV"), beneficioConveniadoController.atualizar);

router.delete("/:id", permitir("FCV"), beneficioConveniadoController.excluir);

export default router;