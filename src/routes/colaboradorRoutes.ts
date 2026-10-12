import { Router } from "express";
import { colaboradorController } from "../controllers/colaboradorController";

const router = Router();

router.get("/", colaboradorController.listar);
router.get("/:id", colaboradorController.buscar);
router.post("/", colaboradorController.criar);
router.put("/:id", colaboradorController.atualizar);
router.delete("/:id", colaboradorController.excluir);

export default router;
