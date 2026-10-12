import { Router } from "express";
import { authController } from "../controllers/authController";
import { autenticar } from "../middlewares/autenticar";

const router = Router();

router.post("/login", authController.login);
router.post("/registrar", authController.registrar);
router.get("/eu", autenticar, authController.eu);
router.post("/esqueci-senha", authController.esqueciSenha);
router.post("/redefinir-senha", authController.redefinirSenha);

export default router;
