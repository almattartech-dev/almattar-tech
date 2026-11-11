import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  getIdTokenResult,
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
  }
  if (file.size > maxSize) {
    throw new Error(`The selected file is too large. Maximum size: ${isImage ? "20 MB" : "100 MB"}.`);
  }
}

async function addPageContent(event) {
  event.preventDefault();
  if (!contentForm || !contentPage) {
    return;
  }

  const user = auth.currentUser;
  const page = contentPage.dataset.contentPage;
  const fileInput = contentForm.querySelector('input[type="file"]');
  const descriptionInput = contentForm.querySelector('textarea');
  const submitButton = contentForm.querySelector('[type="submit"]');
  const file = fileInput.files[0];
  const description = descriptionInput.value.trim();

  showContentStatus("");

  if (!user) {
    showContentStatus("Admin access is required to add content.");
    return;
  }
  if (!file || !description) {
    showContentStatus("Choose a file and enter its description.");
    return;
  }

  let uploadedFileRef;
  let uploadCompleted = false;
  submitButton.disabled = true;
  showContentStatus("Uploading content...");

  try {
    if (!(await checkAdminAccess(user))) {
      showContentStatus("Admin access is required to add content.");
      return;
    }

    getAllowedFile(file, page);
    const itemRef = push(databaseRef(database, `content/${page}`));
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    uploadedFileRef = storageRef(storage, `site-content/${page}/${itemRef.key}-${safeFileName}`);
    await uploadBytes(uploadedFileRef, file, { contentType: file.type });
    uploadCompleted = true;
    const mediaUrl = await getDownloadURL(uploadedFileRef);

    await set(itemRef, {
      description,
      mediaUrl,
      mediaType: file.type.startsWith("image/") ? "image" : "video",
      createdAt: Date.now()
    });

    contentForm.reset();
    contentForm.hidden = true;
    showContentStatus("Content added successfully.");
  } catch (error) {
    console.error("Could not add page content:", error);
    if (uploadCompleted && uploadedFileRef) {
      try {
        await deleteObject(uploadedFileRef);
      } catch (cleanupError) {
        console.error("Could not remove the incomplete uploaded file:", cleanupError);
      }
    }
    showContentStatus(error instanceof Error ? error.message : "Could not add content. Check Firebase setup and rules.");
  } finally {
    submitButton.disabled = false;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (addContentButton) {
    addContentButton.hidden = true;
  }

  if (!user || !addContentButton) {
    return;
  }

  try {
    addContentButton.hidden = !(await checkAdminAccess(user));
  } catch (error) {
    console.error("Could not verify admin permissions:", error);
    showContentStatus("Could not verify admin permissions. Please sign in again.");
  }
});

document.getElementById("adminLoginButton")?.addEventListener("click", () => {
  if (loginModal) {
    loginModal.hidden = false;
  }
});

document.getElementById("closeLoginModal")?.addEventListener("click", () => {
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
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    if (!(await checkAdminAccess(user))) {
      await signOut(auth);
      showLoginMessage("This account does not have admin access.");
      return;
    }

    if (loginModal) {
      loginModal.hidden = true;
    }
  } catch (error) {
    console.error("Login error:", error.code, error.message);
    showLoginMessage("Login failed. Check your email and password, then try again.");
  }
});

document.getElementById("googleLoginBtn")?.addEventListener("click", async () => {
  showLoginMessage("");

  try {
    const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
    if (!(await checkAdminAccess(user))) {
      await signOut(auth);
      showLoginMessage("This account does not have admin access.");
      return;
    }

    if (loginModal) {
      loginModal.hidden = true;
    }
  } catch (error) {
    console.error("Google login error:", error.code, error.message);
    showLoginMessage(getGoogleLoginErrorMessage(error));
  }
});

addContentButton?.addEventListener("click", () => {
  if (contentForm) {
    contentForm.hidden = !contentForm.hidden;
  }
});

document.querySelector(".content-form-cancel")?.addEventListener("click", () => {
  if (contentForm) {
    contentForm.reset();
    contentForm.hidden = true;
  }
});

contentForm?.addEventListener("submit", addPageContent);

if (contentPage) {
  loadPageContent(contentPage.dataset.contentPage);
}