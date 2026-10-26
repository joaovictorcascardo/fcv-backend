import { Router } from "express";
import { utilizacaoController } from "../controllers/utilizacaoController";

const router = Router();

router.get("/", utilizacaoController.listar);
router.get("/:id", utilizacaoController.buscar);
router.post("/", utilizacaoController.criar);
router.put("/:id", utilizacaoController.atualizar);
router.delete("/:id", utilizacaoController.cancelar);

export default router;
