import { Router } from "express";
import { permitir } from "../middlewares/permitir";
import { euController } from "../controllers/euController";

const router = Router();

router.get("/utilizacoes", euController.utilizacoes);
router.get("/aguardando", permitir("COLABORADOR"), euController.aguardando);

export default router;
