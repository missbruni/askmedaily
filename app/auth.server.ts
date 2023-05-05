import admin from "firebase-admin";
import {
  applicationDefault,
  initializeApp as initializeAdminApp,
} from "firebase-admin/app";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
<<<<<<< Updated upstream
=======
  getAuth,
  signOut,
>>>>>>> Stashed changes
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCFfzm1FG6gL_dXkr3T79f9jAtJtvHY75s",
  authDomain: "ask-me-daily.firebaseapp.com",
  projectId: "ask-me-daily",
  storageBucket: "ask-me-daily.appspot.com",
  messagingSenderId: "795832040753",
  appId: "1:795832040753:web:2de9ca1a7f85ca11e3c410",
  measurementId: "G-QEP3DH9ESX",
};

if (admin.apps.length === 0) {
  initializeAdminApp({
    credential: applicationDefault(),
  });
}

let app: any;

if (!app?.apps?.length) {
  app = initializeApp(firebaseConfig);
}

const adminAuth = admin.auth();

export function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(getAuth(), email, password);
}

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(getAuth(), email, password);
}

export function logoutFirebase() {
  return signOut(getAuth());
}

export async function getSessionToken(idToken: string) {
  const decodedToken = await adminAuth.verifyIdToken(idToken);

  if (new Date().getTime() / 1000 - decodedToken.auth_time > 5 * 60) {
    throw new Error("Recent sign in required");
  }

  const twoWeeks = 60 * 60 * 24 * 14 * 1000;
  return adminAuth.createSessionCookie(idToken, { expiresIn: twoWeeks });
}

<<<<<<< Updated upstream
export async function getUser() {
  return auth.currentUser;
}

export async function login(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  if (userCredential) {
    const user = userCredential.user;

    return user;
  } else {
    return null;
  }
}

export async function logout() {
  await signOut(auth);
}
=======
export { adminAuth };
>>>>>>> Stashed changes
