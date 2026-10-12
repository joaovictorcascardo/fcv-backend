import { Router } from "express";
import { campanhaEventoController } from "../controllers/campanhaEventoController";

const router = Router();

router.get("/", campanhaEventoController.listar);
router.get("/:id", campanhaEventoController.buscar);
router.post("/", campanhaEventoController.criar);
router.put("/:id", campanhaEventoController.atualizar);
router.delete("/:id", campanhaEventoController.excluir);

export default router;
