"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// db.ts
const mongoose_1 = __importDefault(require("mongoose"));
// Ensure required environment variables are set
if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in environment variables');
}
const connectDB = async () => {
    try {
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };
        const connection = await mongoose_1.default.connect(process.env.MONGO_URI, options);
        console.log(`MongoDB Connected: ${connection.connection.host}`);
        return connection.connection;
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};
exports.default = connectDB;
