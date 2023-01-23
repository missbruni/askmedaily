import { initializeApp } from "firebase/app";
import {
  getAuth,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

const firebaseApp = initializeApp({
  apiKey: "AIzaSyCFfzm1FG6gL_dXkr3T79f9jAtJtvHY75s",
  authDomain: "ask-me-daily.firebaseapp.com",
  projectId: "ask-me-daily",
  storageBucket: "ask-me-daily.appspot.com",
  messagingSenderId: "795832040753",
  appId: "1:795832040753:web:2de9ca1a7f85ca11e3c410",
  measurementId: "G-QEP3DH9ESX",
});

export const auth = getAuth(firebaseApp);

export async function createUser(email: string, password: string) {
  const userCredentials = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  if (userCredentials) {
    return userCredentials.user;
  }

  return null;
}

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
