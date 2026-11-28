"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resgateController_1 = require("../controllers/resgateController");
const router = (0, express_1.Router)();
router.get("/:codigo", resgateController_1.resgateController.consultar);
router.post("/:codigo/aprovar", resgateController_1.resgateController.aprovar);
router.post("/:codigo/reprovar", resgateController_1.resgateController.reprovar);
exports.default = router;
