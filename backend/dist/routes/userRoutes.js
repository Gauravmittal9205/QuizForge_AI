"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const router = express_1.default.Router();
// Create or update user
router.post('/', userController_1.createOrUpdateUser);
// Get user by UID
router.get('/:uid', userController_1.getUser);
exports.default = router;
