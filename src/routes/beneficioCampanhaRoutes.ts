import { Router } from "express";
import { beneficioCampanhaController } from "../controllers/beneficioCampanhaController";

const router = Router();

router.get("/", beneficioCampanhaController.listar);
router.get("/:id", beneficioCampanhaController.buscar);
router.post("/", beneficioCampanhaController.criar);
router.put("/:id", beneficioCampanhaController.atualizar);
router.delete("/:id", beneficioCampanhaController.excluir);

export default router;
