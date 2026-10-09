import { Router } from "express";
import { authController } from "../controllers/authController";
import { autenticar } from "../middlewares/autenticar";

const router = Router();

router.post("/login", authController.login);
router.get("/eu", autenticar, authController.eu);

export default router;
