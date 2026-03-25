import axios from 'axios';
import { getAuth } from 'firebase/auth';
export const API = axios.create();

API.interceptors.request.use(async (config) => {
	const auth = getAuth();
	const user = auth.currentUser;

	if (user) {
		const token = await user.getIdToken();
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});