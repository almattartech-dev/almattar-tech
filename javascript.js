import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  getDatabase,
  onValue,
  push,
  ref as databaseRef,
  set
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-storage.js";

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

const app = initializeApp(firebaseConfig);
getAnalytics(app);

const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const adminEmail = "almattartech@gmail.com";

const contentPage = document.querySelector("[data-content-page]");
const addContentButton = document.querySelector(".content-add");
const contentForm = document.querySelector(".content-form");
const contentList = document.querySelector(".content-list");
const contentStatus = document.querySelector(".content-status");
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("adminLoginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("adminLoginButton");

const contactForm = document.getElementById("contactForm");
const contactStatus = document.getElementById("contactStatus");

function showLoginMessage(message) {
  if (loginMessage) {
    loginMessage.textContent = message;
  }
}

function showContentStatus(message) {
  if (contentStatus) {
    contentStatus.textContent = message;
  }
}

function showContactStatus(message, isError = false) {
  if (!contactStatus) {
    return;
  }
  contactStatus.textContent = message;
  contactStatus.classList.toggle("is-error", isError);
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
  if (!user) {
    return false;
  }
  return user.email === adminEmail;
}

function createContentCard(item) {
  const card = document.createElement("article");
  card.className = "content-card";

  const mediaUrl = typeof item.mediaUrl === "string" ? item.mediaUrl : "";
  let validMediaUrl = false;
  try {
    validMediaUrl = new URL(mediaUrl).protocol === "https:";
  } catch {
    validMediaUrl = false;
  }

  if (validMediaUrl && item.mediaType === "image") {
    const image = document.createElement("img");
    image.src = mediaUrl;
    image.alt = typeof item.description === "string" ? item.description : "Uploaded content";
    image.loading = "lazy";
    card.append(image);
  } else if (validMediaUrl && item.mediaType === "video") {
    const video = document.createElement("video");
    video.src = mediaUrl;
    video.controls = true;
    video.preload = "metadata";
    card.append(video);
  }

  const description = document.createElement("p");
  description.className = "content-description";
  description.textContent = typeof item.description === "string" ? item.description : "";
  card.append(description);

  return card;
}

function loadPageContent(page) {
  if (!contentList) {
    return;
  }

  onValue(databaseRef(database, `content/${page}`), (snapshot) => {
    const items = Object.values(snapshot.val() || {})
      .filter((item) => item && typeof item === "object")
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

    contentList.replaceChildren(...items.map(createContentCard));
    if (items.length === 0) {
      showContentStatus("No content has been added yet.");
    } else {
      showContentStatus("");
    }
  }, (error) => {
    console.error("Could not load page content:", error);
    showContentStatus("Could not load content. Check the Firebase Realtime Database rules.");
  });
}

function getAllowedFile(file, page) {
  const isImage = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
  const isVideo = file.type === "video/mp4" || file.type === "video/webm";
  const validType = page === "videos" ? isVideo : isImage || isVideo;
  const maxSize = isImage ? 20 * 1024 * 1024 : 100 * 1024 * 1024;

  if (!validType) {
    throw new Error(page === "videos"
      ? "Choose an MP4 or WebM video."
      : "Choose an image or an MP4/WebM video.");