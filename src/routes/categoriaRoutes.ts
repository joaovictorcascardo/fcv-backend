import { Router } from "express";
import { permitir } from "../middlewares/permitir";
import { categoriaController } from "../controllers/categoriaController";

const router = Router();

router.get("/", categoriaController.listar);
router.get("/:id", categoriaController.buscar);

router.post(
  "/",
  permitir("FCV"),
  categoriaController.criar
);

router.put(
  "/:id",
  permitir("FCV"),
  categoriaController.atualizar
);

router.delete(
  "/:id",
  permitir("FCV"),
  categoriaController.excluir
);

export default router;