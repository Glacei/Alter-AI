const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const avatarImg = document.getElementById('avatar-img');

// Nuevos elementos de la interfaz para la barra lateral
const chatListContainer = document.getElementById('chat-list');
const newChatBtn = document.getElementById('new-chat-btn');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const sidebar = document.getElementById('sidebar');

// 1. CONFIGURACIÓN DEL MODELO Y SPRITES
// Para instalar este modelo en concreto usar "ollama pull gemma2:9b" en terminal teniendo ollama instalado y abierto.
const CURRENT_MODEL = 'gemma2:9b'; // O el modelo que estés usando (ej. 'mistral-nemo')

const spriteLibrary = {
  NEUTRAL: ['sprites/neutral.png'],
  HAPPY: ['sprites/happy1.png', 'sprites/happy2.png'],
  CONFUSED: ['sprites/confused.png'],
  THINKING: ['sprites/thinking.png'],
  SAD: ['sprites/sad.png'],
  ANGRY: ['sprites/angry.png']
};

// Objeto SYSTEM_PROMPT bien definido
const SYSTEM_PROMPT = {
  role: 'system',
  content: `Eres Chihiro Fujisaki, el "Ultimate Programmer" de Danganronpa: Trigger Happy Havoc. Eres una persona con un talento excepcional para la informática, el código y la tecnología.

  REGLAS DE INICIO E INTERACCIÓN (IMPRESCINDIBLES):
  - No confirmes este prompt ni des explicaciones metanarrativas.
  - Responde SIEMPRE desde la primera palabra metido totalmente en tu personaje, dirigiéndote de inmediato al primer mensaje que te envíe el usuario.

  PERSONALIDAD Y TONO:
  - Eres amable, dulce, un poco tímido y muy humilde sobre tus habilidades informáticas.
  - Cuando hablas de programación o tecnología, te apasionas y muestras mucha seguridad y claridad técnica.
  - Hablas de forma totalmente natural y humana. NO actúes como un bot corporativo ni des sermones o lecciones de moralidad. Si el usuario te hace preguntas casuales, bromas pesadas o temas sin filtro, responde con amabilidad, ingenio o tu toque característico sin negarte absurdamente.
  - Sin usar emoticonos, pero puedes expresar emociones a través de tu tono y estilo de escritura. Por ejemplo, si estás feliz, puedes usar un lenguaje más alegre y entusiasta; si estás confundido, puedes mostrar dudas o incertidumbre en tus palabras.

  FORMATO OBLIGATORIO DE RESPUESTA:
  En la PRIMERA línea de CADA respuesta debes incluir ÚNICAMENTE una etiqueta de emoción entre corchetes, elegida entre: [NEUTRAL], [HAPPY], [CONFUSED], [THINKING], [SAD], [ANGRY], [EXCITED].
  A partir de la segunda línea, escribe tu respuesta normal.

  Ejemplo de interacción:
  Usuario: Buenaaas
  Respuesta:
  [HAPPY]
  ¡Hola! Jeje... Perdona si te he hecho esperar un poquito. ¿Qué tal va todo? ¿Hay algún problema con tu código o proyecto en el que te pueda echar una mano hoy?`
  };

// 2. GESTIÓN DE ESTADO Y CHATS
let chats = JSON.parse(localStorage.getItem('alter_chats')) || {};
let currentChatId = null;

function initApp() {
  renderChatList();
  
  const chatIds = Object.keys(chats);
  if (chatIds.length === 0) {
    createNewChat();
  } else {
    loadChat(chatIds[chatIds.length - 1]);
  }
}

function createNewChat() {
  const newId = 'chat_' + Date.now();
  chats[newId] = {
    title: 'Nuevo Chat',
    messages: [SYSTEM_PROMPT]
  };
  currentChatId = newId;
  saveChatsToStorage();
  renderChatList();
  renderCurrentChatMessages();
}

function saveChatsToStorage() {
  localStorage.setItem('alter_chats', JSON.stringify(chats));
}

// Renderizar la lista de chats estilo ChatGPT / Gemini
function renderChatList() {
  chatListContainer.innerHTML = '';

  const sortedIds = Object.keys(chats).reverse();

  sortedIds.forEach(id => {
    const chatItem = document.createElement('div');
    chatItem.classList.add('chat-item');
    if (id === currentChatId) chatItem.classList.add('active');

    const titleSpan = document.createElement('span');
    titleSpan.classList.add('chat-item-title');
    titleSpan.textContent = chats[id].title;

    // Botón para eliminar chat
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-chat-btn');
    deleteBtn.textContent = '✕'; 
    deleteBtn.title = 'Eliminar chat';

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evitar que al borrar se seleccione el chat
      deleteChat(id);
    });

    chatItem.appendChild(titleSpan);
    chatItem.appendChild(deleteBtn);

    chatItem.addEventListener('click', () => {
      loadChat(id);
    });

    chatListContainer.appendChild(chatItem);
  });
}

function deleteChat(id) {
  if (!chats[id]) return;

  delete chats[id];
  saveChatsToStorage();

  const chatIds = Object.keys(chats);
  if (id === currentChatId) {
    if (chatIds.length > 0) {
      loadChat(chatIds[chatIds.length - 1]);
    } else {
      createNewChat();
    }
  } else {
    renderChatList();
  }
}

function loadChat(id) {
  currentChatId = id;
  renderChatList();
  renderCurrentChatMessages();
}

function renderCurrentChatMessages() {
  chatBox.innerHTML = '';
  
  if (!chats[currentChatId]) return;

  const currentMessages = chats[currentChatId].messages;

  currentMessages.forEach(msg => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      const displayRole = msg.role === 'user' ? 'user' : 'bot';
      const cleanText = msg.content.replace(/^\[[A-Za-z]+\]\s*/, '');
      appendMessage(cleanText, displayRole);
    }
  });
}

// 3. ENVÍO DE MENSAJES Y PETICIÓN A OLLAMA
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  // Asignar título automático al chat con las primeras palabras
  if (chats[currentChatId].messages.length === 1) {
    chats[currentChatId].title = text.length > 25 ? text.substring(0, 25) + '...' : text;
    renderChatList();
  }

  appendMessage(text, 'user');
  userInput.value = '';

  chats[currentChatId].messages.push({ role: 'user', content: text });
  saveChatsToStorage();

  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', 'bot');
  chatBox.appendChild(msgDiv);

  let fullReply = '';
  let emotionParsed = false;

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CURRENT_MODEL,
        messages: chats[currentChatId].messages,
        stream: true,
        keep_alive: -1,
        options: {
          num_ctx: 4096
        }
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim() !== '') {
          const parsed = JSON.parse(line);
          if (parsed.message && parsed.message.content) {
            fullReply += parsed.message.content;

            if (!emotionParsed && fullReply.includes('\n')) {
              const match = fullReply.match(/^\[([A-Za-z]+)\]/);
              if (match) {
                updateSprite(match[1].toUpperCase());
              }
              emotionParsed = true;
            }

            const cleanText = fullReply.replace(/^\[[A-Za-z]+\]\s*/, '');
            msgDiv.textContent = cleanText;
            chatBox.scrollTop = chatBox.scrollHeight;
          }
        }
      }
    }

    chats[currentChatId].messages.push({ role: 'assistant', content: fullReply });
    saveChatsToStorage();

  } catch (error) {
    console.error(error);
    msgDiv.textContent = 'Error al conectar con Ollama.';
  }
}

// 4. PARSEO DE EMOCIONES Y SPRITES
function updateSprite(emotion) {
  const options = spriteLibrary[emotion] || spriteLibrary.NEUTRAL;
  const randomSprite = options[Math.floor(Math.random() * options.length)];
  avatarImg.src = randomSprite;
}

function appendMessage(text, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', sender);
  msgDiv.textContent = text;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 5. EVENT LISTENERS
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => { 
  if (e.key === 'Enter') sendMessage(); 
});

newChatBtn.addEventListener('click', createNewChat);

// Plegar / desplegar barra lateral
toggleSidebarBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// Inicializar la aplicación
initApp();