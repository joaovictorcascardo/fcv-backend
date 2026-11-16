import { Router } from "express";
import { euController } from "../controllers/euController";
import { utilizacaoController } from "../controllers/utilizacaoController";

const router = Router();

router.get("/utilizacoes", euController.utilizacoes);
router.post("/utilizacoes", utilizacaoController.criar);
router.get("/utilizacoes/:id", utilizacaoController.buscar);

export default router;
