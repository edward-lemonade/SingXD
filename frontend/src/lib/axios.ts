import axios from 'axios';
import { getIdToken } from './api/AuthAPI';
import { getCookie } from './actions/cookies';
import { COOKIE } from './types/enums';

export const API = axios.create();

API.defaults.withCredentials = true;
API.interceptors.request.use(async config => {
    if (typeof window !== 'undefined') {
        //console.log("CLIENT")
        const token = await getIdToken();
        if (token) config.headers.Authorization = `Bearer ${token}`; // client
    } else {
        //console.log("SERVER")
        const token = await getCookie(COOKIE.TOKEN);
        if (token) config.headers.Authorization = `Bearer ${token}`; // server
    }
    return config;
});