import { Router } from "express";
import { resgateController } from "../controllers/resgateController";

const router = Router();

router.get("/:codigo", resgateController.consultar);
router.post("/:codigo/aprovar", resgateController.aprovar);
router.post("/:codigo/reprovar", resgateController.reprovar);

export default router;
