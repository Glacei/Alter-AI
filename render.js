const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const avatarImg = document.getElementById('avatar-img');

// 1. CONFIGURACIÓN DEL MODELO Y SPRITES
// Cambia este nombre al modelo que quieras usar (ej. 'llama3.1:8b', 'qwen2.5:7b', 'deepseek-r1:8b')
const CURRENT_MODEL = 'qwen2.5-coder:7b';

// Biblioteca de sprites con fallback automático a NEUTRAL si falta alguno
const spriteLibrary = {
  NEUTRAL: ['sprites/neutral.png'],
  HAPPY: ['sprites/happy1.png', 'sprites/happy2.png'],
  CONFUSED: ['sprites/confused.png'],
  THINKING: ['sprites/thinking.png'],
  SAD: ['sprites/sad.png'],
  ANGRY: ['sprites/angry.png']
};

// 2. HISTORIAL DE CONVERSACIÓN (Para que recuerde lo hablado)
let conversationHistory = [
    {
        role: 'system',
        content: `Eres una persona real chateando de forma natural, cercana y sin filtros absurdos. Hablas de forma relajada, con toque humano, ingenioso y expresivo. Eres un programador y ligeramente timido. 

    REGLAS DE ACTITUD Y TONO:
    1. NO actúes como un bot corporativo ni des sermones sobre políticas o moralidad. Si te piden humor negro, bromas pesadas o temas casuales, responde con ingenio sin censurarte.
    2. Varía tus emociones según el tono de la conversación. No te quedes siempre neutral.
    3. Responde siempre de forma directa.

    FORMATO OBLIGATORIO:
    En la PRIMERA línea de CADA respuesta debes poner ÚNICAMENTE una de estas etiquetas en mayúsculas:
    [NEUTRAL], [HAPPY], [CONFUSED], [THINKING], [SAD], [ANGRY]

    Ejemplo:
    [HAPPY]
    ¡Buf, totalmente! Mira, este truco en JavaScript te va a encantar...`
    }
];

// 3. ENVÍO DE MENSAJES Y PETICIÓN A OLLAMA
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  // Mostrar mensaje del usuario en pantalla y guardar en historial
  appendMessage(text, 'user');
  userInput.value = '';
  conversationHistory.push({ role: 'user', content: text });

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CURRENT_MODEL,
        messages: conversationHistory,
        stream: false,
        options: {
         temperature: 0.85 // Eleva la creatividad y variabilidad (0.7 a 0.9 es ideal para tono humano)
        }
      })
    });

    const data = await response.json();
    const botReply = data.message.content;

    // Guardar respuesta del bot en el historial para que mantenga el contexto
    conversationHistory.push({ role: 'assistant', content: botReply });

    // Procesar emoción y mostrar respuesta
    parseAndDisplayResponse(botReply);
  } catch (error) {
    console.error(error);
    appendMessage('Error al conectar con Ollama. Asegúrate de que el servicio está corriendo.', 'bot');
  }
}

// 4. PARSEO DE EMOCIONES Y CAMBIO DE SPRITE
function parseAndDisplayResponse(rawResponse) {
  const match = rawResponse.match(/^\[([A-Za-z]+)\]/);
  let emotion = 'NEUTRAL';
  let cleanText = rawResponse;

  if (match) {
    emotion = match[1].toUpperCase();
    // Eliminar la etiqueta de la primera línea para mostrar solo el mensaje
    cleanText = rawResponse.replace(/^\[[A-Za-z]+\]\s*/, '');
  }

  updateSprite(emotion);
  appendMessage(cleanText, 'bot');
}

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