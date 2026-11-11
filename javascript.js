// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  getIdTokenResult
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC9ZpiCHP-AJMHvI1EfnTkTXkovs4-7OE0",
  authDomain: "almattar-tech.firebaseapp.com",
  databaseURL: "https://almattar-tech-default-rtdb.firebaseio.com",
  projectId: "almattar-tech",
  storageBucket: "almattar-tech.firebasestorage.app",
  messagingSenderId: "1050044443184",
  appId: "1:1050044443184:web:7d90d2837159cbe99c9bf5",
  measurementId: "G-N509GMTRDF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const adminButton = document.querySelector(".admine-buttons");
const loginModal = document.getElementById("loginModal");
const closeLoginModalButton = document.getElementById("closeLoginModal");
const loginForm = document.getElementById("adminLoginForm");
const googleLoginButton = document.getElementById("googleLoginBtn");
const loginMessage = document.getElementById("loginMessage");

function showLoginMessage(message) {
  if (loginMessage) {
    loginMessage.textContent = message;
  }
}

function getGoogleLoginErrorMessage(error) {
  switch (error.code) {
    case "auth/unauthorized-domain":
      return "This website domain is not authorized in Firebase. Add it under Authentication > Settings > Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in is disabled. Enable the Google provider under Firebase Authentication > Sign-in method.";
    case "auth/popup-blocked":
      return "The sign-in popup was blocked. Allow popups for this website and try again.";
    case "auth/popup-closed-by-user":
      return "The sign-in window was closed before completing login.";
    case "auth/cancelled-popup-request":
      return "Another sign-in window is already open. Complete or close it, then try again.";
    case "auth/network-request-failed":
      return "A network error interrupted Google sign-in. Check your connection and try again.";
    default:
      return `Google sign-in failed (${error.code || "unknown error"}). Check the browser console for details.`;
  }
}

async function checkAdminAccess(user) {
  const tokenResult = await getIdTokenResult(user, true);
  return tokenResult.claims.admin === true;
}

onAuthStateChanged(auth, async (user) => {
  if (adminButton) {
    adminButton.hidden = true;
  }

  if (!user || !adminButton) {
    return;
  }

  try {
    adminButton.hidden = !(await checkAdminAccess(user));
  } catch (error) {
    console.error("Could not verify admin permissions:", error);
    showLoginMessage("Could not verify admin permissions. Please try again.");
  }
});

document.getElementById("adminLoginButton")?.addEventListener("click", () => {
  if (loginModal) {
    loginModal.hidden = false;
  }
});

closeLoginModalButton?.addEventListener("click", () => {
  if (loginModal) {
    loginModal.hidden = true;
  }
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showLoginMessage("");

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!(await checkAdminAccess(userCredential.user))) {
      await signOut(auth);
      showLoginMessage("This account does not have admin access.");
      return;
    }

    showLoginMessage("Login successful.");
    if (loginModal) {
      loginModal.hidden = true;
    }
  } catch (error) {
    console.error("Login error:", error.code, error.message);
    showLoginMessage("Login failed. Check your email and password, then try again.");
  }
});

googleLoginButton?.addEventListener("click", async () => {
  showLoginMessage("");

  try {
    const userCredential = await signInWithPopup(auth, new GoogleAuthProvider());
    if (!(await checkAdminAccess(userCredential.user))) {
      await signOut(auth);
      showLoginMessage("This account does not have admin access.");
      return;
    }

    showLoginMessage("Login successful.");
    if (loginModal) {
      loginModal.hidden = true;
    }
  } catch (error) {
    console.error("Google login error:", error.code, error.message);
    showLoginMessage(getGoogleLoginErrorMessage(error));
  }
});