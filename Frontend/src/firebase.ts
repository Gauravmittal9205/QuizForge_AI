import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDHZ5PjEZ6fS6QlZ80_1p17YJ9Zhkel63A",
  authDomain: "quizforgeai-3a6f5.firebaseapp.com",
  projectId: "quizforgeai-3a6f5",
  storageBucket: "quizforgeai-3a6f5.appspot.com",
  messagingSenderId: "517475089548",
  appId: "1:517475089548:web:56a8087e62043373c20fa9",
  measurementId: "G-R9ZQMQQ6ZZ"
};

import { getFirestore } from "firebase/firestore";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export {
  auth,
  db,
  googleProvider,
  githubProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged
};

export type { User };