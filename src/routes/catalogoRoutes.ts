import { Router } from "express";
import { catalogoController } from "../controllers/catalogoController";

const router = Router();

router.get("/resumo", catalogoController.resumo);

router.get("/beneficios", catalogoController.beneficios);
router.get("/beneficios/:id", catalogoController.beneficio);

router.get("/locais", catalogoController.locais);
router.get("/locais/:id", catalogoController.local);

export default router;