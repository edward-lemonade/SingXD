import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    type User,
} from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { API } from '@/src/lib/axios';
import { ROUTE_CONFIG } from '../routes';
import { redirect } from 'next/navigation';

export const getIdToken = () => auth.currentUser?.getIdToken() ?? Promise.resolve(null);

export const createSessionCookie = (idToken: string) =>
    API.post(
        ROUTE_CONFIG.auth.session(),
        { idToken },
        {
            withCredentials: true,
        }
    );

export const clearSessionCookie = () =>
    API.delete(ROUTE_CONFIG.auth.session(), {
        withCredentials: true,
    });

export const loginWithEmail = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    await createSessionCookie(idToken);
    return credential;
};

export const registerWithEmail = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    await createSessionCookie(idToken);
    return credential;
};

export const loginWithGoogle = async () => {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    const idToken = await credential.user.getIdToken();
    await createSessionCookie(idToken);
    return credential;
};

const LOGOUT_START_EVENT = 'singxd:auth-logout-start';
const LOGOUT_END_EVENT = 'singxd:auth-logout-end';

function dispatchAuthEvent(eventName: string) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(eventName));
}

export const logout = async () => {
    dispatchAuthEvent(LOGOUT_START_EVENT);
    try {
        await signOut(auth);
        await clearSessionCookie();
    } catch (err) {
        console.error('Failed to clear session cookie', err);
    } finally {
        dispatchAuthEvent(LOGOUT_END_EVENT);
        redirect('/login');
    }
};

export const onAuthChanged = (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb);
