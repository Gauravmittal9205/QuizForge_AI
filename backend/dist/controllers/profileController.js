"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = void 0;
const profileModel_1 = __importDefault(require("../models/profileModel"));
const getProfile = async (req, res) => {
    var _a;
    try {
        const uid = req.query.uid || ((_a = req.body) === null || _a === void 0 ? void 0 : _a.uid);
        if (!uid) {
            return res.status(400).json({ message: 'UID is required' });
        }
        const profile = await profileModel_1.default.findOne({ uid });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.status(200).json(profile);
    }
    catch (error) {
        console.error('Error in getProfile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const { uid, fullName, email, phone, country, language, photoURL, bio } = req.body;
        if (!uid) {
            return res.status(400).json({ message: 'UID is required' });
        }
        const existingProfile = await profileModel_1.default.findOne({ uid });
        if (!existingProfile) {
            if (!fullName || !email) {
                return res.status(400).json({ message: 'fullName and email are required to create a profile' });
            }
            const newProfile = new profileModel_1.default({
                uid,
                fullName,
                email,
                phone: phone || '',
                country: country || '',
                language: language || 'en',
                photoURL: photoURL || '',
                bio: bio || '',
            });
            await newProfile.save();
            return res.status(200).json(newProfile);
        }
        const updateData = {};
        if (fullName !== undefined)
            updateData.fullName = fullName;
        if (email !== undefined)
            updateData.email = email;
        if (phone !== undefined)
            updateData.phone = phone;
        if (country !== undefined)
            updateData.country = country;
        if (language !== undefined)
            updateData.language = language;
        if (photoURL !== undefined)
            updateData.photoURL = photoURL;
        if (bio !== undefined)
            updateData.bio = bio;
        const updatedProfile = await profileModel_1.default.findOneAndUpdate({ uid }, updateData, { new: true, runValidators: true });
        res.status(200).json(updatedProfile);
    }
    catch (error) {
        console.error('Error in updateProfile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateProfile = updateProfile;
