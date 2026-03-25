import { getIdToken } from '@/src/lib/api/AuthAPI';
import { API } from '../axios';

API.interceptors.request.use(async config => {
    const token = await getIdToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
