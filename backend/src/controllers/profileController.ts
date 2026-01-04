import { Request, Response } from 'express';
import Profile from '../models/profileModel';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const uid = (req.query.uid as string) || req.body?.uid;

    if (!uid) {
      return res.status(400).json({ message: 'UID is required' });
    }

    const profile = await Profile.findOne({ uid });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error('Error in getProfile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { uid, fullName, email, phone, country, language, photoURL, bio } = req.body;

    if (!uid) {
      return res.status(400).json({ message: 'UID is required' });
    }

    const existingProfile = await Profile.findOne({ uid });

    if (!existingProfile) {
      if (!fullName || !email) {
        return res.status(400).json({ message: 'fullName and email are required to create a profile' });
      }

      const newProfile = new Profile({
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

    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (country !== undefined) updateData.country = country;
    if (language !== undefined) updateData.language = language;
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    if (bio !== undefined) updateData.bio = bio;

    const updatedProfile = await Profile.findOneAndUpdate(
      { uid },
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedProfile);
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
