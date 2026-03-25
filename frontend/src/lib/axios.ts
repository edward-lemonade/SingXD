import axios from 'axios';
import { getAuth } from 'firebase/auth';
export const API = axios.create();
API.defaults.withCredentials = true;
