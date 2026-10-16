import { Router } from "express";
import { permitir } from "../middlewares/permitir";
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
  permitir("FCV"),
  beneficioCampanhaConveniadoController.criar
);

router.put(
  "/:id",
  permitir("FCV"),
  beneficioCampanhaConveniadoController.atualizar
);

router.delete(
  "/:id",
  permitir("FCV"),
  beneficioCampanhaConveniadoController.excluir
);

export default router;