const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const apiFetch = async (endpoint, options = {}) => {
    const url = `${BASE_URL}/${endpoint}`;
    return fetch(url, options);
};