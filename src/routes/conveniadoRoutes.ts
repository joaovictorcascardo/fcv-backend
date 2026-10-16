import { Router } from "express";
import { permitir } from "../middlewares/permitir";
import { conveniadoController } from "../controllers/conveniadoController";

const router = Router();

router.get("/", conveniadoController.listar);
router.get("/:id", conveniadoController.buscar);
router.post("/", permitir("FCV"), conveniadoController.criar);
router.put("/:id", permitir("FCV"), conveniadoController.atualizar);
router.delete("/:id", permitir("FCV"), conveniadoController.excluir);

export default router;
