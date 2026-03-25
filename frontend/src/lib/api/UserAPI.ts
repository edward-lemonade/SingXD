import { isAxiosError } from 'axios';
import { API } from '../axios';
import type { User } from '../types/models';
import { ROUTE_CONFIG } from '../routes';

export const getCurrentUser = async (cookie?: string): Promise<User | null> => {
    const url = ROUTE_CONFIG.user.me();
    try {
        const response = await API.get<User>(url, {
            withCredentials: true,
            headers: cookie ? { Cookie: cookie } : undefined,
        });
        return response.data;
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
            return null;
        }
        throw error;
    }
};
