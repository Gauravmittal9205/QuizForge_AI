import { Request, Response } from 'express';
import User, { IUser } from '../models/userModel';

export const createOrUpdateUser = async (req: Request, res: Response) => {
  try {
    const { uid, email, name, displayName: displayNameFromReq, photoURL } = req.body;
    
    // Use name if provided, otherwise use displayName, or fallback to null
    const displayName = name || displayNameFromReq || null;

    // Check if user already exists
    let user = await User.findOne({ uid });

    if (user) {
      // Update existing user
      user = await User.findOneAndUpdate(
        { uid },
        { 
          email, 
          displayName: displayName || user.displayName, // Only update if new value is provided
          photoURL: photoURL || user.photoURL // Only update if new value is provided
        },
        { new: true }
      );
    } else {
      // Create new user
      user = new User({
        uid,
        email,
        displayName,
        photoURL,
      });
      await user.save();
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error in getUser:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
