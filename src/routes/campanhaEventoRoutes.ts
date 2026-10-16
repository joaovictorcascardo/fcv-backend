import { Router } from "express";
import { permitir } from "../middlewares/permitir";
import { campanhaEventoController } from "../controllers/campanhaEventoController";

const router = Router();

router.get("/", campanhaEventoController.listar);
router.get("/:id", campanhaEventoController.buscar);
router.post("/", permitir("FCV"), campanhaEventoController.criar);
router.put("/:id", permitir("FCV"), campanhaEventoController.atualizar);
router.delete("/:id", permitir("FCV"), campanhaEventoController.excluir);

export default router;
