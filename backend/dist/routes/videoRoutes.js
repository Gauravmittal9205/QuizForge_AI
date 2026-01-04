"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const videoController_1 = __importDefault(require("../controllers/videoController"));
const fileUpload_1 = require("../middleware/fileUpload");
const router = (0, express_1.Router)();
// Process video from URL
router.post('/process-url', videoController_1.default.processVideoUrl);
// Process uploaded video file
router.post('/process-upload', fileUpload_1.videoUpload, videoController_1.default.processVideoFile);
exports.default = router;
