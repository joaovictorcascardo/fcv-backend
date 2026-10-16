import { Router } from "express";
import { permitir } from "../middlewares/permitir";
import { beneficioCampanhaController } from "../controllers/beneficioCampanhaController";

const router = Router();

router.get("/", beneficioCampanhaController.listar);
router.get("/:id", beneficioCampanhaController.buscar);
router.post("/", permitir("FCV"), beneficioCampanhaController.criar);
router.put("/:id", permitir("FCV"), beneficioCampanhaController.atualizar);
router.delete("/:id", permitir("FCV"), beneficioCampanhaController.excluir);

export default router;
