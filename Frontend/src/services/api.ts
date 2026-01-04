import { getAuth } from '../contexts/AuthContext';

export const updateProfile = async (data: any) => {
  const { getAuthToken } = getAuth();
  const token = await getAuthToken();
  
  const response = await fetch('http://localhost:5001/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update profile');
  }

  return response.json();
};

export const getProfile = async () => {
  const { getAuthToken } = getAuth();
  const token = await getAuthToken();
  
  const response = await fetch('http://localhost:5001/api/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch profile');
  }

  return response.json();
};
