"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = exports.createOrUpdateUser = void 0;
const userModel_1 = __importDefault(require("../models/userModel"));
const createOrUpdateUser = async (req, res) => {
    try {
        const { uid, email, displayName, photoURL } = req.body;
        // Check if user already exists
        let user = await userModel_1.default.findOne({ uid });
        if (user) {
            // Update existing user
            user = await userModel_1.default.findOneAndUpdate({ uid }, { email, displayName, photoURL }, { new: true });
        }
        else {
            // Create new user
            user = new userModel_1.default({
                uid,
                email,
                displayName,
                photoURL,
            });
            await user.save();
        }
        res.status(200).json(user);
    }
    catch (error) {
        console.error('Error in createOrUpdateUser:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createOrUpdateUser = createOrUpdateUser;
const getUser = async (req, res) => {
    try {
        const { uid } = req.params;
        const user = await userModel_1.default.findOne({ uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    }
    catch (error) {
        console.error('Error in getUser:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getUser = getUser;
