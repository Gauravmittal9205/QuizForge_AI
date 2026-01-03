import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  firebaseSignOut, 
  onAuthStateChanged 
};

export type { User };