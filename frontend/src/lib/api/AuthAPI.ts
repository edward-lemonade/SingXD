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
import { redirect } from 'next/navigation';
import { deleteCookie, setCookie } from '../actions/cookies';
import { COOKIE } from '../types/enums';

let authInitializationPromise: Promise<User | null> | null = null;

const waitForAuthInitialization = async (): Promise<User | null> => {
    if (auth.currentUser) return auth.currentUser;
    if (authInitializationPromise) return authInitializationPromise;

    authInitializationPromise = new Promise(resolve => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe();
            authInitializationPromise = null;
            resolve(user);
        });
    });

    return authInitializationPromise;
};

export const getIdToken = async () => {
    const user = auth.currentUser ?? (await waitForAuthInitialization());
    if (!user) return null;
    return user.getIdToken(true); // force refresh to handle expired tokens
};

export const loginWithEmail = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    await setCookie(COOKIE.TOKEN, idToken);
    return credential;
};

export const registerWithEmail = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    await setCookie(COOKIE.TOKEN, idToken);
    return credential;
};

export const loginWithGoogle = async () => {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    const idToken = await credential.user.getIdToken();
    await setCookie(COOKIE.TOKEN, idToken);
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
        await deleteCookie(COOKIE.TOKEN);
    } catch (err) {
        console.error('Failed to clear session cookie', err);
    } finally {
        dispatchAuthEvent(LOGOUT_END_EVENT);
        redirect('/login');
    }
};

export const onAuthChanged = (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb);
