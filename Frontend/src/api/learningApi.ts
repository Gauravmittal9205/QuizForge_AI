import axios from 'axios';

const API_URL = 'http://localhost:5001/api/learning-sessions';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

export const startLearningSession = async (sessionData: {
    userId: string;
    subjectId: string;
    subjectName: string;
    topic: string;
    level: string;
}) => {
    try {
        const response = await api.post('/start', sessionData);
        return response.data;
    } catch (error) {
        console.error('Error starting learning session:', error);
        throw error;
    }
};

export const getUserSessions = async (userId: string) => {
    try {
        const response = await api.get(`/user/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching user sessions:', error);
        throw error;
    }
};

export const getSessionById = async (id: string) => {
    try {
        const response = await api.get(`/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching session:', error);
        throw error;
    }
};

export const updateLearningSession = async (id: string, updateData: any) => {
    try {
        const response = await api.put(`/${id}`, updateData);
        return response.data;
    } catch (error) {
        console.error('Error updating session:', error);
        throw error;
    }
};

export const completeTopicInSyllabus = async (subjectId: string, topicName: string) => {
    try {
        const response = await api.post('/complete-topic', { subjectId, topicName });
        return response.data;
    } catch (error) {
        console.error('Error completing topic in syllabus:', error);
        throw error;
    }
};
