import { Router } from "express";
import { beneficioCampanhaConveniadoController } from "../controllers/beneficioCampanhaConveniadoController";

const router = Router();

router.get(
  "/",
  beneficioCampanhaConveniadoController.listar
);

router.get(
  "/:id",
  beneficioCampanhaConveniadoController.buscar
);

router.post(
  "/",
  beneficioCampanhaConveniadoController.criar
);

router.put(
  "/:id",
  beneficioCampanhaConveniadoController.atualizar
);

router.delete(
  "/:id",
  beneficioCampanhaConveniadoController.excluir
);

export default router;