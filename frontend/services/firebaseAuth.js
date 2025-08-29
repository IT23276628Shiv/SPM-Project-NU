// Import the functions you need from the SDKs you need
import { initializeApp ,getApps} from "firebase/app";
import {initializeAuth , getReactNativePersistence , getAuth } from "firebase/auth"
import AsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTPLZb9RQNhLi5ZDWqJ7PUCDLVxW8KuD4",
  authDomain: "projectuee-ccb28.firebaseapp.com",
  projectId: "projectuee-ccb28",
  storageBucket: "projectuee-ccb28.firebasestorage.app",
  messagingSenderId: "349588286177",
  appId: "1:349588286177:web:9e50b2fec7c3e12e07e5a0"
};

let authfirebase;
// Initialize Firebase
if(getApps().length == 0){
  const app = initializeApp(firebaseConfig);
  authfirebase = initializeAuth(app , {
  persistence:getReactNativePersistence(AsyncStorage)
});
}
 else{
    authfirebase = getAuth();
}


export default authfirebase;