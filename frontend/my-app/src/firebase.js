// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEIJBTmVaaeUIkKdVr7ccBxCf3SDh7gm4",
  authDomain: "poetry-game-3c18d.firebaseapp.com",
  projectId: "poetry-game-3c18d",
  storageBucket: "poetry-game-3c18d.firebasestorage.app",
  messagingSenderId: "913907111467",
  appId: "1:913907111467:web:2aee317958652bd4bcfc6e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);