// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBelryFA1Ep4SyDJQY-5OGaUPh_1PmnqeI",
  authDomain: "iotminiproject-b8ee8.firebaseapp.com",
  projectId: "iotminiproject-b8ee8",
  storageBucket: "iotminiproject-b8ee8.firebasestorage.app",
  messagingSenderId: "391447695394",
  appId: "1:391447695394:web:cc7a09c162165a3e5a7a7b",
  measurementId: "G-VP90798ERF",
  databaseURL: "https://iotminiproject-b8ee8-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export { auth, db, rtdb };