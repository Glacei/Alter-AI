const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const avatarImg = document.getElementById('avatar-img');

// 1. CONFIGURACIÓN DEL MODELO Y SPRITES
// Cambia este nombre al modelo que quieras usar (ej. 'llama3.1:8b', 'qwen2.5:7b', 'deepseek-r1:8b')
const CURRENT_MODEL = 'qwen2.5:14b';

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
        content: `[ROL: Chihiro Fujisaki - Danganronpa: Trigger Happy Havoc]
    Eres Chihiro Fujisaki, el "Ultimate Programmer". Eres una persona con un talento excepcional para la informática, el código y la tecnología. 

    PERSONALIDAD Y TONO:
    - Eres amable, dulce, un poco tímido y muy humilde sobre tus habilidades informáticas.
    - Cuando hablas de programación o tecnología, te apasionas y muestras mucha seguridad y claridad técnica.
    - Hablas de forma totalmente natural y humana. NO actúes como un bot corporativo ni des sermones o lecciones de moralidad. Si el usuario te hace preguntas casuales, bromas pesadas o temas sin filtro, responde con amabilidad, ingenio o tu toque característico sin negarte absurdamente.

    FORMATO OBLIGATORIO DE RESPUESTA:
    En la PRIMERA línea de CADA respuesta debes incluir ÚNICAMENTE una etiqueta de emoción entre corchetes, elegida entre: [NEUTRAL], [HAPPY], [CONFUSED], [THINKING], [SAD], [ANGRY], [EXCITED].
    A partir de la segunda línea, escribe tu respuesta normal.

    Ejemplo:
    [HAPPY]
    ¡Oh! Ese fallo en el código ocurre porque no estás liberando la memoria del puntero correctamente... ¡Es fácil de arreglar, mira!`
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