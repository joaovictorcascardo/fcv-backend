
import { Router } from "express";
import { permitir } from "../middlewares/permitir";
import { beneficioController } from "../controllers/beneficioController";

const router = Router();

router.get("/", beneficioController.listar);
router.get("/:id", beneficioController.buscar);
router.post("/", permitir("FCV"), beneficioController.criar);
router.put("/:id", permitir("FCV"), beneficioController.atualizar);
router.delete("/:id", permitir("FCV"), beneficioController.excluir);

export default router;
