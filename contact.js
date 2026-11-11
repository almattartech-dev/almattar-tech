const emailJsConfig = {
  serviceId: "YOUR_EMAILJS_SERVICE_ID",
  templateId: "YOUR_EMAILJS_TEMPLATE_ID",
  publicKey: "YOUR_EMAILJS_PUBLIC_KEY"
};

const contactForm = document.getElementById("contactForm");
const contactStatus = document.getElementById("contactStatus");

function showContactStatus(message, isError = false) {
  if (!contactStatus) {
    return;
  }

  contactStatus.textContent = message;
  contactStatus.classList.toggle("is-error", isError);
}

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const { serviceId, templateId, publicKey } = emailJsConfig;
  if ([serviceId, templateId, publicKey].some((value) => value.startsWith("YOUR_"))) {
    showContactStatus("Email sending is not configured yet. Add the EmailJS service, template, and public key.", true);
    return;
  }

  const submitButton = contactForm.querySelector('button[type="submit"], input[type="submit"]');
  const formData = new FormData(contactForm);
  const templateParams = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    reply_to: String(formData.get("email") || "").trim(),
    message: String(formData.get("message") || "").trim()
  };

  if (!templateParams.name || !templateParams.email || !templateParams.message) {
    showContactStatus("Please complete your name, email, and message.", true);
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
  }
  showContactStatus("Sending message...");

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams
      })
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`EmailJS returned ${response.status}: ${errorDetails}`);
    }

    contactForm.reset();
    showContactStatus("Message sent successfully. Thank you!");
  } catch (error) {
    console.error("Could not send contact message:", error);
    showContactStatus("Could not send the message. Check the EmailJS setup and try again.", true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
});
