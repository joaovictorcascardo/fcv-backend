import { Router } from "express";
import { perfilAcessoController } from "../controllers/perfilAcessoController";

const router = Router();

router.get("/", perfilAcessoController.listar);
router.get("/:id", perfilAcessoController.buscar);
router.post("/", perfilAcessoController.criar);
router.put("/:id", perfilAcessoController.atualizar);
router.delete("/:id", perfilAcessoController.excluir);

export default router;
