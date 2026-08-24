// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDDfZGneTi8hGDULI2-HXRiQjntZH_xrrw",
  authDomain: "turbo-erp-3dd21.firebaseapp.com",
  projectId: "turbo-erp-3dd21",
  storageBucket: "turbo-erp-3dd21.firebasestorage.app",
  messagingSenderId: "788081495732",
  appId: "1:788081495732:web:507c7c85846b70c53e11e1",
  measurementId: "G-VR1ZG9R164"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app);

export { app, analytics, auth, googleProvider, db, storage, updateProfile };

