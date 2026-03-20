import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, updatePassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBb5lPlb7GDJsDrG3aBSzWloDeInm_yRNI",
  authDomain: "erise-4c083.firebaseapp.com",
  projectId: "erise-4c083"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const NEW_PASSWORD = "E9x!R2#iS5&E8*c4L9uB";

async function updateAdminPassword() {
  try {
    console.log("Signing in as admin...");
    // Attempt with erise2026! or erise2026
    let user;
    try {
        user = await signInWithEmailAndPassword(auth, "admin@erise.club", "erise2026!");
    } catch (e) {
        user = await signInWithEmailAndPassword(auth, "admin@erise.club", "erise2026");
    }
    
    console.log("Updating password...");
    await updatePassword(user.user, NEW_PASSWORD);
    
    console.log("SUCCESS_PASSWORD_UPDATED");
    process.exit(0);
  } catch (error) {
    console.error("ERROR " + error.code + " " + error.message);
    process.exit(1);
  }
}

updateAdminPassword();
