import { Router } from "express";
import { conveniadoController } from "../controllers/conveniadoController";

const router = Router();

router.get("/", conveniadoController.listar);
router.get("/:id", conveniadoController.buscar);
router.post("/", conveniadoController.criar);
router.put("/:id", conveniadoController.atualizar);
router.delete("/:id", conveniadoController.excluir);

export default router;
