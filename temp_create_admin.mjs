import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBb5lPlb7GDJsDrG3aBSzWloDeInm_yRNI",
  authDomain: "erise-4c083.firebaseapp.com",
  projectId: "erise-4c083"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function createAdmin() {
  try {
    await createUserWithEmailAndPassword(auth, "admin@erise.club", "erise2026!");
    console.log("SUCCESS_USER_CREATED");
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("SUCCESS_USER_ALREADY_EXISTS");
      process.exit(0);
    }
    console.error("ERROR " + error.code + " " + error.message);
    process.exit(1);
  }
}

createAdmin();
