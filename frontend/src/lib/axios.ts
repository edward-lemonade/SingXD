import axios from 'axios';

export const API = axios.create();
API.defaults.withCredentials = true;
