import { User, Edit, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChangeEvent, useRef } from 'react';

interface UserData {
  fullName: string;
  email: string;
  photoURL: string;
  role: string;
  joinDate: string;
  [key: string]: any; // Allow additional properties
}

interface ProfileHeaderProps {
  userData: UserData;
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: () => void;
  onImageChange?: (file: File) => void;
}

const ProfileHeader = ({ userData, isEditing, onEditToggle, onSave, onImageChange }: ProfileHeaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Call the parent's onImageChange if provided
        if (onImageChange) {
          onImageChange(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600">
        <div className="absolute -bottom-12 left-6">
          <div className="h-24 w-24 rounded-2xl border-4 border-white bg-white shadow-lg flex items-center justify-center text-3xl font-bold text-indigo-600">
            {userData.photoURL ? (
              <img 
                src={userData.photoURL} 
                alt={userData.fullName} 
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              <span>{getInitials(userData.fullName)}</span>
            )}
          </div>
        </div>
        <div className="absolute bottom-4 right-6 flex space-x-3">
          {isEditing && (
            <button 
              onClick={triggerFileInput}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-gray-900 hover:bg-white/30 transition-colors"
              title="Change Avatar"
              type="button"
            >
              <Camera size={20} />
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageChange}
              />
            </button>
          )}
          <button 
            onClick={isEditing ? onSave : onEditToggle}
            className="flex items-center px-4 py-2 bg-white text-indigo-700 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
          >
            <Edit size={16} className="mr-2" />
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>
      </div>
      
      <div className="pt-16 px-6 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{userData.fullName}</h1>
            <p className="text-gray-600 flex items-center mt-1">
              <User size={14} className="mr-1.5" />
              {userData.role} • Joined {userData.joinDate}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium">
            {userData.email}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileHeader;
