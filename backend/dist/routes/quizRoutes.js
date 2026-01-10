"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quizController_1 = require("../controllers/quizController");
const router = (0, express_1.Router)();
router.post('/generate', quizController_1.generateQuiz);
exports.default = router;
