import { getIdToken } from '@/src/lib/api/AuthAPI';
import { getCookie } from '@/src/lib/actions/cookies';
import { COOKIE } from '@/src/lib/types/enums';
import { API } from './axios';

console.log("do mid")
API.interceptors.request.use(async config => {
    if (typeof window !== 'undefined') {
        // Client: use Firebase SDK
        const token = await getIdToken();
        console.log("CLIENT CLIENT")
        if (token) config.headers.Authorization = `Bearer ${token}`;
    } else {
        // Server: read from cookie store
        const token = await getCookie(COOKIE.TOKEN);
        console.log("SERVER SERVER")
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});