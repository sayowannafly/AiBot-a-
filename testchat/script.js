const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessage = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const languageButton = document.querySelector('.language-button');
const clearChatButton = document.querySelector("#clear-chat");

const API_KEY = "AIzaSyB_axM-MKSvvbCHYywYQHitDWbsUafvSz4";
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const userData = {
  message: null,
  file: {
    data: null,
    mime_type: null,
  },
};

let chatHistory = []; 
const initialInputHeight = messageInput.scrollHeight;

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const updateChatHistory = () => {
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
};

window.addEventListener("load", () => {
  const savedHistory = localStorage.getItem("chatHistory");
  if (savedHistory) {
    chatHistory = JSON.parse(savedHistory);
    chatHistory.forEach(item => {
      const messageContent = item.parts[0].text;
      const messageDiv = createMessageElement(
        messageContent,
        item.role === "user" ? "user-message" : "bot-message"
      );
      chatBody.appendChild(messageDiv);
    });
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
});

const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");

  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: userData.file }] : [])],
  });
  updateChatHistory();

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: chatHistory,
    }),
  };

  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const apiResponseText = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, "$1").trim();
    messageElement.innerText = apiResponseText;

    chatHistory.push({
      role: "model",
      parts: [{ text: apiResponseText }],
    });
    updateChatHistory();
  } catch (error) {
    console.log(error);
    messageElement.innerText = error.message;
    messageElement.style.color = "#ff0000";
  } finally {
    userData.file = {};
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
};

const languages = {
  'RU': {
    greeting: 'Привет! Чем я могу помочь?',
    placeholder: 'Сұрақ...',
  },
  'KZ': {
    greeting: 'Сәлем! Қалай көмектесе аламын?',
    placeholder: 'Сұрақ...',
  },
  'ENG': {
    greeting: 'Hello! How can I help?',
    placeholder: 'Question...',
  }
};

let currentLanguage = 'RU';

const setLanguage = (language) => {
  currentLanguage = language;
  languageButton.textContent = language;
  document.querySelector('.message-text').innerText = languages[language].greeting;
  messageInput.placeholder = languages[language].placeholder;
};

const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  messageInput.value = "";
  messageInput.dispatchEvent(new Event("input"));
  fileUploadWrapper.classList.remove("file-uploaded");

  const messageContent = `<div class="message-text"></div>${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />` : ""}`;
  const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
  outgoingMessageDiv.querySelector(".message-text").innerText = userData.message;
  chatBody.appendChild(outgoingMessageDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  
  setTimeout(() => {
    const incomingMessageDiv = createMessageElement('<div class="message-text">...</div>', "bot-message", "thinking");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    generateBotResponse(incomingMessageDiv);
  }, 600);
};

messageInput.addEventListener("input", () => {
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;
  document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && e.target.value.trim() && window.innerWidth > 768) {
    handleOutgoingMessage(e);
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    fileInput.value = "";
    fileUploadWrapper.querySelector("img").src = e.target.result;
    fileUploadWrapper.classList.add("file-uploaded");
    userData.file = {
      data: e.target.result.split(",")[1],
      mime_type: file.type,
    };
  };

  reader.readAsDataURL(file);
});

fileCancelButton.addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-uploaded");
});

// Обработчик кнопки отправки сообщения
sendMessage.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));

let currentIndex = 0;

languageButton.addEventListener('click', () => {
  const languageKeys = Object.keys(languages);
  currentIndex = (currentIndex + 1) % languageKeys.length;
  setLanguage(languageKeys[currentIndex]);
});

const clearChat = () => {
  chatBody.innerHTML = "";
  chatHistory.length = 0;
  localStorage.removeItem("chatHistory");
};

clearChatButton.addEventListener("click", clearChat);
