
import { Router } from "express";
import { beneficioController } from "../controllers/beneficioController";

const router = Router();

router.get("/", beneficioController.listar);
router.get("/:id", beneficioController.buscar);
router.post("/", beneficioController.criar);
router.put("/:id", beneficioController.atualizar);
router.delete("/:id", beneficioController.excluir);

export default router;
