"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resgateController_1 = require("../controllers/resgateController");
const router = (0, express_1.Router)();
router.post("/", resgateController_1.resgateController.solicitar);
router.get("/:id", resgateController_1.resgateController.buscar);
router.post("/:id/cancelar", resgateController_1.resgateController.cancelar);
exports.default = router;
