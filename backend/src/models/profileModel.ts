import mongoose, { Document, Schema } from 'mongoose';

export interface IProfile extends Document {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
  language?: string;
  photoURL?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    uid: { 
      type: String, 
      required: true, 
      unique: true 
    },
    fullName: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true,
      lowercase: true,
      trim: true
    },
    phone: { 
      type: String, 
      default: '' 
    },
    country: { 
      type: String, 
      default: '' 
    },
    language: { 
      type: String, 
      default: 'en' 
    },
    photoURL: { 
      type: String, 
      default: '' 
    },
    bio: { 
      type: String, 
      default: '' 
    },
  },
  { 
    timestamps: true,
    collection: 'profiles' 
  }
);

// Create a compound index on uid for faster lookups
profileSchema.index({ uid: 1 }, { unique: true });

export default mongoose.models.Profile || mongoose.model<IProfile>('Profile', profileSchema);
