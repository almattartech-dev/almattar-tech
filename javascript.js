import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getAnalytics,
  isSupported as isAnalyticsSupported
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  getDatabase,
  onValue,
  push,
  ref as databaseRef,
  remove,
  set,
  update
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";
import {
  deleteObject,
  getStorage,
  ref as storageRef
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-storage.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
isAnalyticsSupported()
  .then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  })
  .catch((error) => console.warn("Could not initialize Firebase Analytics:", error));

const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .catch((error) => console.error("خطأ في حفظ جلسة الدخول:", error));

const database = getDatabase(app);
const storage = getStorage(app);
const supabase = createClient(
  "https://thahdmqouequojtccldz.supabase.co",
  "sb_publishable_hrzcBWpLyQtMzh83fuYFJw_84Ra8tga",
  {
    accessToken: async () => auth.currentUser?.getIdToken() ?? null
  }
);
const newsMediaBucket = "news-media";
const adminEmail = "almattartech@gmail.com";
let isAdminUser = false;

const contentPage = document.querySelector("[data-content-page]");
const addContentButton = document.querySelector(".content-add");
const contentForm = document.querySelector(".content-form");
const contentDialog = document.querySelector(".content-dialog");
const contentList = document.querySelector(".content-list");
const contentStatus = document.querySelector(".content-status");
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("adminLoginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("adminLoginButton");
const logoutButton = document.getElementById("adminLogoutButton");
const navigation = document.querySelector("nav");
const contactForm = document.getElementById("contactForm");
const contactStatus = document.getElementById("contactStatus");
let editingNewsKey = null;
let editingNewsItem = null;

document.querySelectorAll("[data-nav-page]").forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = button.dataset.navPage;
  });
});

const mobileNav = document.querySelector("nav[data-database-url]");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");

if (mobileNav && mobileMenuButton && mobileMenu) {
  const setMobileMenu = (open) => {
    mobileNav.classList.toggle("mobile-menu-open", open);
    mobileMenuButton.setAttribute("aria-expanded", String(open));
    mobileMenuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  };

  mobileMenuButton.addEventListener("click", () => {
    setMobileMenu(!mobileNav.classList.contains("mobile-menu-open"));
  });

  mobileMenu.addEventListener("click", (event) => {
    if (event.target.closest("button")) {
      setMobileMenu(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!mobileNav.contains(event.target)) {
      setMobileMenu(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMobileMenu(false);
      mobileMenuButton.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 600) {
      setMobileMenu(false);
    }
  });
}

function showLoginMessage(message) {
  if (loginMessage) {
    loginMessage.textContent = message;
  }
}

function closeLoginModal() {
  if (loginModal) {
    loginModal.hidden = true;
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
  return user.email?.trim().toLowerCase() === adminEmail && user.emailVerified;
}

function getAdminAccessErrorMessage(user) {
  if (user?.email?.trim().toLowerCase() === adminEmail && !user.emailVerified) {
    return "Please verify the admin email address before signing in.";
  }
  return "This account does not have admin access.";
}

function createContentCard(item, key, page) {
  const card = document.createElement("article");
  card.className = "content-card";

  if (typeof item.title === "string" && item.title) {
    const title = document.createElement("h4");
    title.className = "content-title";
    title.textContent = item.title;
    card.append(title);
  }

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

  const deleteButton = document.createElement("button");
  deleteButton.className = "content-delete";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.hidden = !isAdminUser;
  deleteButton.addEventListener("click", () => deletePageContent(page, key, item, deleteButton));
  card.append(deleteButton);

  const editButton = document.createElement("button");
  editButton.className = "content-edit";
  editButton.type = "button";
  editButton.textContent = page === "news" && typeof item.title === "string"
    ? "Edit article"
    : "Edit description";
  editButton.hidden = !isAdminUser;
  editButton.addEventListener("click", () => {
    if (page === "news" && typeof item.title === "string") {
      openNewsEditor(item, key);
    } else {
      editContentDescription(page, key, item, editButton);
    }
  });
  card.append(editButton);

  return card;
}

function loadPageContent(page) {
  if (!contentList) {
    return;
  }

  onValue(databaseRef(database, `content/${page}`), (snapshot) => {
    const items = Object.entries(snapshot.val() || {})
      .filter(([, item]) => item && typeof item === "object")
      .sort(([, a], [, b]) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

    contentList.replaceChildren(...items.map(([key, item]) => createContentCard(item, key, page)));
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

async function deletePageContent(page, key, item, button) {
  if (!(await checkAdminAccess(auth.currentUser))) {
    showContentStatus("Verified admin access is required to delete content.");
    return;
  }
  if (!window.confirm("Delete this content? This cannot be undone.")) {
    return;
  }

  button.disabled = true;
  showContentStatus("Deleting content...");

  try {
    await remove(databaseRef(database, `content/${page}/${key}`));
  } catch (error) {
    console.error("Could not delete page content:", error);
    button.disabled = false;
    showContentStatus("Could not delete content. Check the Firebase Realtime Database rules.");
    return;
  }

  if (typeof item.mediaUrl === "string" && item.mediaUrl) {
    try {
      await deleteContentMedia(item);
    } catch (error) {
      if (error.code !== "storage/object-not-found") {
        console.error("Could not remove the deleted content's media file:", error);
        showContentStatus("Content was removed, but its media file could not be deleted.");
        return;
      }
    }
  }

  showContentStatus("Content deleted.");
}

async function deleteContentMedia(item) {
  if (item.mediaProvider === "supabase" && typeof item.mediaPath === "string") {
    await removeSupabaseMedia(item.mediaPath);
    return;
  }

  await deleteObject(storageRef(storage, item.mediaUrl));
}

async function uploadSupabaseMedia(page, itemKey, file) {
  getAllowedFile(file, page);
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const mediaPath = `${page}/${itemKey}-${safeFileName}`;
  const { error } = await supabase.storage
    .from(newsMediaBucket)
    .upload(mediaPath, file, { contentType: file.type, upsert: false });

  if (error) {
    throw error;
  }

  return {
    mediaPath,
    mediaUrl: supabase.storage.from(newsMediaBucket).getPublicUrl(mediaPath).data.publicUrl,
    mediaType: file.type.startsWith("image/") ? "image" : "video",
    mediaProvider: "supabase"
  };
}

async function removeSupabaseMedia(mediaPath) {
  const { error } = await supabase.storage.from(newsMediaBucket).remove([mediaPath]);
  if (error) {
    throw error;
  }
}

async function editContentDescription(page, key, item, button) {
  if (!(await checkAdminAccess(auth.currentUser))) {
    showContentStatus("Verified admin access is required to edit content.");
    return;
  }

  const description = window.prompt("Edit the description:", item.description || "");
  if (description === null) {
    return;
  }

  const updatedDescription = description.trim();
  if (!updatedDescription || updatedDescription.length > 500) {
    showContentStatus("Description must contain 1 to 500 characters.");
    return;
  }

  button.disabled = true;
  try {
    await update(databaseRef(database, `content/${page}/${key}`), {
      description: updatedDescription
    });
    showContentStatus("Description updated.");
  } catch (error) {
    console.error("Could not update content description:", error);
    showContentStatus("Could not update the description. Check the Firebase Realtime Database rules.");
  } finally {
    button.disabled = false;
  }
}

function openNewsEditor(item = null, key = null) {
  if (!contentForm || !contentDialog) {
    return;
  }

  contentForm.reset();
  editingNewsKey = key;
  editingNewsItem = item;
  contentForm.querySelector('[name="title"]').value = item?.title || "";
  contentForm.querySelector('[name="description"]').value = item?.description || "";
  contentForm.querySelector("#newsEditorTitle").textContent = item ? "Edit news" : "Add news";
  contentForm.querySelector('[type="submit"]').textContent = item ? "Save changes" : "Publish";
  contentForm.querySelector(".content-editor-media-status").textContent = item?.mediaUrl
    ? "Current media will stay unless you choose a replacement."
    : "You can publish without selecting a file.";
  contentDialog.showModal();
}

async function saveNewsArticle(form) {
  if (!(await checkAdminAccess(auth.currentUser))) {
    showContentStatus("Verified admin access is required to publish news.");
    return;
  }

  const isEditing = editingNewsKey !== null;
  const title = form.querySelector('[name="title"]').value.trim();
  const description = form.querySelector('[name="description"]').value.trim();
  const file = form.querySelector('input[type="file"]').files[0];
  const submitButton = form.querySelector('[type="submit"]');

  if (!title || title.length > 120 || !description || description.length > 5000) {
    showContentStatus("Enter a title (up to 120 characters) and content (up to 5000 characters).");
    return;
  }

  submitButton.disabled = true;
  let uploadedMediaPath = "";
  let mediaUploadCompleted = false;
  let articleSaved = false;
  const previousMediaUrl = typeof editingNewsItem?.mediaUrl === "string"
    ? editingNewsItem.mediaUrl
    : "";
  const previousMediaItem = editingNewsItem;

  try {
    const articleRef = editingNewsKey
      ? databaseRef(database, `content/news/${editingNewsKey}`)
      : push(databaseRef(database, "content/news"));
    let mediaUrl = previousMediaUrl;
    let mediaType = typeof editingNewsItem?.mediaType === "string"
      ? editingNewsItem.mediaType
      : "";
    let mediaProvider = typeof editingNewsItem?.mediaProvider === "string"
      ? editingNewsItem.mediaProvider
      : "";
    let mediaPath = typeof editingNewsItem?.mediaPath === "string"
      ? editingNewsItem.mediaPath
      : "";

    if (file) {
      showContentStatus("Uploading media...");
      const uploadedMedia = await uploadSupabaseMedia("news", articleRef.key, file);
      uploadedMediaPath = uploadedMedia.mediaPath;
      mediaUploadCompleted = true;
      mediaUrl = uploadedMedia.mediaUrl;
      mediaType = uploadedMedia.mediaType;
      mediaProvider = uploadedMedia.mediaProvider;
      mediaPath = uploadedMedia.mediaPath;
    } else {
      showContentStatus(isEditing ? "Updating news..." : "Publishing news...");
    }

    const article = {
      title,
      description,
      createdAt: editingNewsItem?.createdAt || Date.now()
    };

    if (mediaUrl && mediaType) {
      article.mediaUrl = mediaUrl;
      article.mediaType = mediaType;
      if (mediaProvider === "supabase" && mediaPath) {
        article.mediaProvider = mediaProvider;
        article.mediaPath = mediaPath;
      }
    }

    await set(articleRef, article);
    articleSaved = true;
    contentDialog.close();

    if (file && previousMediaUrl && previousMediaUrl !== mediaUrl) {
      try {
        await deleteContentMedia(previousMediaItem);
      } catch (error) {
        if (error.code !== "storage/object-not-found") {
          console.error("News was updated, but the previous media file could not be deleted:", error);
          showContentStatus("News was saved, but its previous media file could not be deleted.");
          return;
        }
      }
    }

    showContentStatus(isEditing ? "News updated." : "News published.");
  } catch (error) {
    console.error("Could not save news article:", error);
    if (uploadedMediaPath && mediaUploadCompleted && !articleSaved) {
      try {
        await removeSupabaseMedia(uploadedMediaPath);
      } catch (cleanupError) {
        console.error("Could not remove the incomplete news media upload:", cleanupError);
      }
    }
    showContentStatus(error instanceof Error
      ? error.message
      : "Could not save news. Check the Firebase setup and Realtime Database rules.");
  } finally {
    submitButton.disabled = false;
  }
}

function getAllowedFile(file, page) {
  const isImage = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
  const isVideo = file.type === "video/mp4" || file.type === "video/webm";
  const validType = page === "videos" ? isVideo : isImage || isVideo;
  const maxSize = isImage ? 20 * 1024 * 1024 : 50 * 1024 * 1024;

  if (!validType) {
    throw new Error(page === "videos"
      ? "Choose an MP4 or WebM video."
      : "Choose an image or an MP4/WebM video.");
  }
  if (file.size > maxSize) {
    const maxSizeLabel = isImage ? "20 MB" : "50 MB";
    throw new Error(`The selected file is too large. Maximum size: ${maxSizeLabel}.`);
  }
}

async function addPageContent(event) {
  event.preventDefault();
  if (!contentForm || !contentPage) {
    return;
  }

  const page = contentPage.dataset.contentPage;
  if (page === "news") {
    await saveNewsArticle(contentForm);
    return;
  }

  const user = auth.currentUser;
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

  let uploadedMedia;
  let itemSaved = false;
  submitButton.disabled = true;
  showContentStatus("Uploading content...");

  try {
    if (!(await checkAdminAccess(user))) {
      showContentStatus("Admin access is required to add content.");
      return;
    }

    const itemRef = push(databaseRef(database, `content/${page}`));
    uploadedMedia = await uploadSupabaseMedia(page, itemRef.key, file);

    await set(itemRef, {
      description,
      ...uploadedMedia,
      createdAt: Date.now()
    });
    itemSaved = true;

    contentForm.reset();
    contentForm.hidden = true;
    showContentStatus("Content added successfully.");
  } catch (error) {
    console.error("Could not add page content:", error);
    if (uploadedMedia && !itemSaved) {
      try {
        await removeSupabaseMedia(uploadedMedia.mediaPath);
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
  let isAdmin = false;

  try {
    isAdmin = await checkAdminAccess(user);
  } catch (error) {
    console.error("Could not verify admin permissions:", error);
    showLoginMessage("Could not verify admin permissions. Please try again.");
  }

  if (loginButton) {
    loginButton.hidden = isAdmin;
  }
  if (logoutButton) {
    logoutButton.hidden = !isAdmin;
  }
  navigation?.classList.toggle("is-admin", isAdmin);

  isAdminUser = isAdmin;
  document.querySelectorAll(".content-delete, .content-edit").forEach((button) => {
    button.hidden = !isAdmin;
  });

  if (isAdmin) {
    closeLoginModal();
  }

  if (addContentButton) {
    addContentButton.hidden = !isAdmin;
  }
});

document.getElementById("adminLoginButton")?.addEventListener("click", () => {
  if (loginModal) {
    loginModal.hidden = false;
  }
});

if (window.location.hash === "#login" && loginModal) {
  loginModal.hidden = false;
}

document.getElementById("closeLoginModal")?.addEventListener("click", () => {
  closeLoginModal();
});

logoutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    showLoginMessage("Could not sign out. Please try again.");
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
      showLoginMessage(getAdminAccessErrorMessage(user));
      return;
    }

    closeLoginModal();
    if (loginButton) {
      loginButton.hidden = true;
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
      showLoginMessage(getAdminAccessErrorMessage(user));
      return;
    }

    closeLoginModal();
    if (loginButton) {
      loginButton.hidden = true;
    }
  } catch (error) {
    console.error("Google login error:", error.code, error.message);
    showLoginMessage(getGoogleLoginErrorMessage(error));
  }
});

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(contactForm);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const honeypot = String(formData.get("website") || "").trim();

  if (!name || !email || !message) {
    showContactStatus("الرجاء تعبئة جميع الحقول المطلوبة.", true);
    return;
  }

  if (honeypot) {
    contactForm.reset();
    showContactStatus("تم إرسال رسالتك بنجاح! شكراً لك.");
    return;
  }

  const submitButton = contactForm.querySelector('button[type="submit"], input[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
  }
  showContactStatus("جاري إرسال الرسالة...");

  try {
    await push(databaseRef(database, "messages"), {
      name,
      email,
      message,
      website: "",
      createdAt: Date.now()
    });

    contactForm.reset();
    showContactStatus("تم إرسال رسالتك بنجاح! شكراً لك.");
  } catch (error) {
    console.error("خطأ في إرسال الرسالة:", error);
    showContactStatus("حدث خطأ أثناء الإرسال، حاول مجدداً.", true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
});

addContentButton?.addEventListener("click", () => {
  if (contentPage?.dataset.contentPage === "news") {
    openNewsEditor();
    return;
  }

  if (contentForm) {
    contentForm.hidden = !contentForm.hidden;
  }
});

document.querySelector(".content-form-cancel")?.addEventListener("click", () => {
  if (contentDialog?.open) {
    contentDialog.close();
    return;
  }

  if (contentForm) {
    contentForm.reset();
    contentForm.hidden = true;
  }
});

contentDialog?.addEventListener("close", () => {
  contentForm?.reset();
  const mediaStatus = contentForm?.querySelector(".content-editor-media-status");
  if (mediaStatus) {
    mediaStatus.textContent = "You can publish without selecting a file.";
  }
  editingNewsKey = null;
  editingNewsItem = null;
});

contentForm?.addEventListener("submit", addPageContent);

if (contentPage) {
  loadPageContent(contentPage.dataset.contentPage);
}

if (window.matchMedia("(pointer: fine)").matches) {
  const glow = document.createElement("span");
  const ring = document.createElement("span");
  const dot = document.createElement("span");

  glow.className = "cursor-glow";
  ring.className = "cursor-ring";
  dot.className = "cursor-dot";

  document.body.append(glow, ring, dot);

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let ringX = targetX;
  let ringY = targetY;
  let lastSparkTime = 0;

  document.addEventListener("mousemove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;

    glow.style.transform = `translate3d(${targetX - 120}px, ${targetY - 120}px, 0)`;
    dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    glow.style.opacity = "1";
    ring.style.opacity = "1";
    dot.style.opacity = "1";

    const now = performance.now();
    if (now - lastSparkTime > 55) {
      lastSparkTime = now;
      const spark = document.createElement("span");
      spark.className = "cursor-spark";
      spark.style.left = `${targetX}px`;
      spark.style.top = `${targetY}px`;
      document.body.appendChild(spark);
      spark.addEventListener("animationend", () => spark.remove(), { once: true });
    }
  });

  document.addEventListener("mouseleave", () => {
    glow.style.opacity = "0";
    ring.style.opacity = "0";
    dot.style.opacity = "0";
  });

  document.addEventListener("mousedown", () => ring.classList.add("is-clicking"));
  document.addEventListener("mouseup", () => ring.classList.remove("is-clicking"));

  document.addEventListener("click", (event) => {
    const click = document.createElement("span");
    click.className = "cursor-click";
    click.style.left = `${event.clientX}px`;
    click.style.top = `${event.clientY}px`;
    document.body.appendChild(click);
    click.addEventListener("animationend", () => click.remove(), { once: true });
  });

  document.querySelectorAll("a, button, input, textarea, select, [role='button']").forEach((element) => {
    element.addEventListener("mouseenter", () => ring.classList.add("is-active"));
    element.addEventListener("mouseleave", () => ring.classList.remove("is-active"));
  });

  const animatePointer = () => {
    ringX += (targetX - ringX) * 0.16;
    ringY += (targetY - ringY) * 0.16;
    const isActive = ring.classList.contains("is-active");
    const ringSize = isActive ? 46 : 34;
    ring.style.transform = `translate3d(${ringX - ringSize / 2}px, ${ringY - ringSize / 2}px, 0)`;

    if (isActive) {
      ring.style.width = "46px";
      ring.style.height = "46px";
    } else {
      ring.style.width = "";
      ring.style.height = "";
    }

    requestAnimationFrame(animatePointer);
  };

  animatePointer();

  document.querySelectorAll(".content-card").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.transform = `perspective(900px) translateY(-5px) rotateX(${-y * 3}deg) rotateY(${x * 4}deg)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}