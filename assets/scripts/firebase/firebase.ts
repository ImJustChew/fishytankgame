import firebase from "./firebase-compat.js";

const firebaseConfig = {
    apiKey: "AIzaSyDKACJlb2ur9MnQAfFt4tGFdpFZ7zi_3NI",
    authDomain: "fishytankgame-823c9.firebaseapp.com",
    databaseURL: "https://fishytankgame-823c9-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "fishytankgame-823c9",
    storageBucket: "fishytankgame-823c9.firebasestorage.app",
    messagingSenderId: "448486124631",
    appId: "1:448486124631:web:074e50089cf824f071c712"
};

export const firebaseApp = firebase.initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = firebase.auth(firebaseApp);

// Initialize Realtime Database
export const database = firebase.database(firebaseApp);

// Configure Google Auth Provider
export const googleAuthProvider = new firebase.auth.GoogleAuthProvider();
googleAuthProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleAuthProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

console.log('Firebase Auth initialized successfully');