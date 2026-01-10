// Frontend/src/api/syllabusApi.ts
import axios from 'axios';

const API_URL = 'http://localhost:5001/api/syllabus';

// Set up axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Get all syllabuses
export const getSyllabuses = async (userId?: string) => {
  try {
    const response = await api.get('/', {
      params: userId ? { userId } : undefined
    });
    // Map _id to id for frontend compatibility
    return response.data.map((item: any) => ({
      ...item,
      id: item._id
    }));
  } catch (error) {
    console.error('Error fetching syllabuses:', error);
    throw error;
  }
};

// Create a new syllabus
export const createSyllabus = async (syllabusData: any) => {
  try {
    const response = await api.post('/', syllabusData);
    // Map _id to id for frontend compatibility
    return {
      ...response.data,
      id: response.data._id
    };
  } catch (error) {
    console.error('Error creating syllabus:', error);
    throw error;
  }
};

// Update a syllabus
export const updateSyllabus = async (id: string, syllabusData: any) => {
  try {
    const response = await api.put(`/${id}`, syllabusData);
    // Map _id to id for frontend compatibility
    return {
      ...response.data,
      id: response.data._id
    };
  } catch (error) {
    console.error('Error updating syllabus:', error);
    throw error;
  }
};

// Delete a syllabus
export const deleteSyllabus = async (id: string) => {
  try {
    await api.delete(`/${id}`);
  } catch (error) {
    console.error('Error deleting syllabus:', error);
    throw error;
  }
};