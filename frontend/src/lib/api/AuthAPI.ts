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

export const getIdToken = () => auth.currentUser?.getIdToken() ?? Promise.resolve(null);

export const loginWithEmail = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password);

export const loginWithGoogle = () =>
    signInWithPopup(auth, new GoogleAuthProvider());

export const logout = () => signOut(auth);

export const onAuthChanged = (cb: (user: User | null) => void) =>
    onAuthStateChanged(auth, cb);