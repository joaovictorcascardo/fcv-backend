import { Router } from "express";
import { resgateController } from "../controllers/resgateController";

const router = Router();

router.post("/", resgateController.solicitar);
router.get("/:id", resgateController.buscar);
router.post("/:id/cancelar", resgateController.cancelar);

export default router;
