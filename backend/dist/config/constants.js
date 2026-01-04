"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES = exports.JWT_EXPIRES_IN = exports.JWT_SECRET = void 0;
// JWT Configuration
exports.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
exports.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
// User roles
exports.ROLES = {
    USER: 'user',
    ADMIN: 'admin',
};
