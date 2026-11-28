"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permitir_1 = require("../middlewares/permitir");
const euController_1 = require("../controllers/euController");
const router = (0, express_1.Router)();
router.get("/utilizacoes", euController_1.euController.utilizacoes);
router.get("/aguardando", (0, permitir_1.permitir)("COLABORADOR"), euController_1.euController.aguardando);
exports.default = router;
