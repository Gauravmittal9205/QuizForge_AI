"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const syllabusController_1 = require("../controllers/syllabusController");
const router = (0, express_1.Router)();
router.route('/')
    .post(syllabusController_1.createSyllabus)
    .get(syllabusController_1.getSyllabuses);
router.route('/:id')
    .put(syllabusController_1.updateSyllabus)
    .delete(syllabusController_1.deleteSyllabus);
exports.default = router;
