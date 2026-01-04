"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.isAuthenticated = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const constants_1 = require("../config/constants");
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jsonwebtoken_1.default.verify(token, constants_1.JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    }
    else {
        res.sendStatus(401);
    }
};
exports.authenticateJWT = authenticateJWT;
// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.user) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};
exports.isAuthenticated = isAuthenticated;
// Middleware to check if user has admin role
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === constants_1.ROLES.ADMIN) {
        return next();
    }
    res.status(403).json({ error: 'Forbidden - Admin access required' });
};
exports.isAdmin = isAdmin;
