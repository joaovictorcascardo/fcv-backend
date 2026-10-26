import { Router } from "express";
import { euController } from "../controllers/euController";

const router = Router();

router.get("/utilizacoes", euController.utilizacoes);

export default router;
