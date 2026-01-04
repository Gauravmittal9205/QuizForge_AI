import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import ProfileHeader from './components/ProfileHeader.tsx';
import PersonalInfo from './components/PersonalInfo.tsx';
import AIUsage from './components/AIUsage.tsx';
import ActivitySummary from './components/ActivitySummary.tsx';
import Subscription from './components/Subscription.tsx';

const Profile = () => {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Mock user data - in a real app, this would come from your backend
  const [userData, setUserData] = useState({
    fullName: currentUser?.displayName || 'User Name',
    email: currentUser?.email || '',
    photoURL: currentUser?.photoURL || '',
    phone: '',
    country: 'India',
    language: 'English',
    bio: '',
    role: 'Free User',
    joinDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    aiCredits: 75,
    totalCredits: 100,
    videosProcessed: 12,
    quizzesGenerated: 8,
    avgProcessingTime: '2.5',
    lastQuizDate: '2025-12-20',
    mostUsedSource: 'YouTube',
    drafts: 2,
    subscriptionPlan: 'Free',
    renewalDate: '2025-12-31',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser?.uid) return;

      try {
        const res = await fetch(`http://localhost:5001/api/profile?uid=${encodeURIComponent(currentUser.uid)}`);
        if (!res.ok) {
          return;
        }

        const profile = await res.json();

        setUserData(prev => ({
          ...prev,
          fullName: profile.fullName ?? prev.fullName,
          email: profile.email ?? prev.email,
          phone: profile.phone ?? prev.phone,
          country: profile.country ?? prev.country,
          language: profile.language ?? prev.language,
          photoURL: profile.photoURL ?? prev.photoURL,
        }));
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [currentUser?.uid]);

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 0.5, // Max size in MB (500KB)
      maxWidthOrHeight: 800, // Max width/height in pixels
      useWebWorker: true,
    };

    try {
      // @ts-ignore - We'll handle the type mismatch
      const compressedFile = await import('browser-image-compression').then(module => 
        module.default(file, options)
      );
      console.log('Compressed file size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
      return compressedFile as File;
    } catch (error) {
      console.error('Error compressing image:', error);
      return file; // Return original if compression fails
    }
  };

  const handleImageChange = async (file: File) => {
    try {
      // Compress the image first
      const compressedFile = await compressImage(file);
      
      // Create a base64 string from the compressed file
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Update local state immediately
        setUserData(prev => ({
          ...prev,
          photoURL: base64String
        }));
        
        // If not in edit mode, save immediately
        if (!isEditing) {
          try {
            await handleSave({ photoURL: base64String });
          } catch (error) {
            console.error('Failed to save image:', error);
            // Optionally show error to user
          }
        }
      };
      
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error processing image:', error);
      // Optionally show error to user
    }
  };

  const handleSave = async (updatedData: any = {}) => {
    console.log('Starting save with data:', updatedData);
    
    // Only update state if there's actual data to update
    const hasUpdates = Object.keys(updatedData).length > 0;
    const nextData = hasUpdates ? { ...userData, ...updatedData } : userData;

    if (hasUpdates) {
      console.log('Updating local state with:', updatedData);
      setUserData(nextData);
    }

    if (!currentUser?.uid) {
      console.error('No user ID available');
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      console.log('Saving profile...');

      // Prepare the data to send to the server
      const dataToSend = {
        uid: currentUser.uid,
        fullName: nextData.fullName,
        email: nextData.email,
        phone: nextData.phone || '',
        country: nextData.country || '',
        language: nextData.language || 'en',
        photoURL: nextData.photoURL || '',
        bio: nextData.bio || ''
      };

      console.log('Sending data to server:', dataToSend);

      const res = await fetch('http://localhost:5001/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const responseData = await res.json().catch(() => ({}));
      console.log('Server response:', { status: res.status, data: responseData });

      if (!res.ok) {
        console.error('Profile save failed with status:', res.status);
        throw new Error(responseData.message || `Server responded with status ${res.status}`);
      }

      // Only update state if we get a response
      if (responseData) {
        console.log('Profile saved successfully:', responseData);
        setUserData(prev => ({
          ...prev,
          fullName: responseData.fullName ?? prev.fullName,
          email: responseData.email ?? prev.email,
          phone: responseData.phone ?? prev.phone,
          country: responseData.country ?? prev.country,
          language: responseData.language ?? prev.language,
          photoURL: responseData.photoURL ?? prev.photoURL,
          bio: responseData.bio ?? prev.bio,
        }));
      }
      
      // Only exit edit mode if this was a manual save (not an auto-save from image upload)
      if (Object.keys(updatedData).length === 0) {
        console.log('Exiting edit mode');
        setIsEditing(false);
      }
      
      return responseData;
    } catch (error) {
      console.error('Error in handleSave:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Re-throw the error so it can be handled by the caller if needed
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pt-24 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Profile Header */}
        <ProfileHeader 
          userData={userData} 
          isEditing={isEditing} 
          onEditToggle={() => setIsEditing(!isEditing)}
          onSave={() => {
            if (!isSaving) {
              void handleSave();
            }
          }}
          onImageChange={handleImageChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information */}
            <PersonalInfo 
              userData={userData} 
              isEditing={isEditing} 
              onInputChange={(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const { name, value } = e.target;
                setUserData(prev => ({
                  ...prev,
                  [name]: value
                }));
              }}
            />

            {/* AI Usage & Limits */}
            <AIUsage userData={userData} />

            {/* Activity Summary */}
            <ActivitySummary userData={userData} />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Subscription & Billing */}
            <Subscription userData={userData} />
            
            {/* Quick Actions */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-gray-700">Create New Quiz</span>
                  <span className="text-indigo-600">+</span>
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-gray-700">View All Quizzes</span>
                  <span className="text-indigo-600">→</span>
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-gray-700">Upgrade Plan</span>
                  <span className="text-indigo-600">↑</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
