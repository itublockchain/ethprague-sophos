// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBnbnV84Bb0sY3XxLucgoQPIM1teWiW0h4",
  authDomain: "sagittarius-324cd.firebaseapp.com",
  projectId: "sagittarius-324cd",
  storageBucket: "sagittarius-324cd.firebasestorage.app",
  messagingSenderId: "309007949539",
  appId: "1:309007949539:web:58dcc56d36262a81b5afd6",
  measurementId: "G-98KGJJSCBM",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const firestore = getFirestore(app);

export { firestore };
