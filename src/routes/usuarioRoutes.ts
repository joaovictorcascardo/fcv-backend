import { Router } from "express";
import { usuarioController } from "../controllers/usuarioController";

const router = Router();

router.get("/", usuarioController.listar);
router.get("/:id", usuarioController.buscar);
router.post("/", usuarioController.criar);
router.put("/:id", usuarioController.atualizar);
router.delete("/:id", usuarioController.excluir);

export default router;
