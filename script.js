
    const OLLAMA_URL = 'http://localhost:11434';



const STORAGE_KEY = 'ollama_chat_sessions';

const SYSTEM_MESSAGE = {
    role: 'system',
    content: 'Bạn là một trợ lý AI thân thiện. Hãy trả lời bằng tiếng Việt.'
};

const DEFAULT_SYSTEM_PROMPT =
    'Bạn là một trợ lý AI thân thiện. Hãy trả lời bằng tiếng Việt.';

function createSystemMessage(content = DEFAULT_SYSTEM_PROMPT) {
    return {
        role: 'system',
        content: content
    };
}

const toggleSystemPromptButton =
    document.getElementById('toggleSystemPromptButton');

const systemPromptPanel =
    document.getElementById('systemPromptPanel');

const systemPromptInput =
    document.getElementById('systemPromptInput');

const saveSystemPromptButton =
    document.getElementById('saveSystemPromptButton');

const resetSystemPromptButton =
    document.getElementById('resetSystemPromptButton');

const chatBox = document.getElementById('chatBox');
const chatList = document.getElementById('chatList');
const chatTitle = document.getElementById('chatTitle');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');
const newChatButton = document.getElementById('newChatButton');
const modelInput = document.getElementById('model');
const responseModeInput = document.getElementById('responseMode');
const statusElement = document.getElementById('status');
const historyLimitInput = document.getElementById('historyLimit');


const imageInput =
    document.getElementById('imageInput');

const selectImageButton =
    document.getElementById('selectImageButton');

const imagePreviewList =
    document.getElementById('imagePreviewList');

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

let selectedImages = [];
let currentModelSupportsVision = false;

const scrollLeftButton =
    document.getElementById('scrollLeftButton');

const scrollRightButton =
    document.getElementById('scrollRightButton');
	
	
let isGenerating = false;
//let chats = loadChats();
//let activeChatId = chats[0]?.id || null;

function generateId() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 8)
    );
}


async function checkModelVisionCapability(modelName) {
    currentModelSupportsVision = false;

    if (!modelName) {
        updateImageInputState();
        return false;
    }

    try {
        const response = await fetch(`${OLLAMA_URL}/api/show`, {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                model: modelName
            })
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const data = await response.json();
        const capabilities = Array.isArray(data.capabilities)
            ? data.capabilities
            : [];

        currentModelSupportsVision =
            capabilities.includes('vision');

        updateImageInputState();

        return currentModelSupportsVision;
    } catch (error) {
        console.error(
            'Không kiểm tra được khả năng vision:',
            error
        );

        currentModelSupportsVision = false;
        updateImageInputState();

        return false;
    }
}

function updateImageInputState() {
    selectImageButton.disabled =
        !currentModelSupportsVision;

    selectImageButton.title =
        currentModelSupportsVision
            ? 'Đính kèm ảnh'
            : 'Model này không hỗ trợ ảnh';

    if (!currentModelSupportsVision) {
        clearSelectedImages();
    }
}

function generateImageId() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8)
    );
}

function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();

        reader.onload = function () {
            resolve(reader.result);
        };

        reader.onerror = function () {
            reject(
                reader.error ||
                new Error('Không đọc được ảnh')
            );
        };

        reader.readAsDataURL(file);
    });
}

function loadHtmlImage(dataUrl) {
    return new Promise(function (resolve, reject) {
        const image = new Image();

        image.onload = function () {
            resolve(image);
        };

        image.onerror = function () {
            reject(new Error('Ảnh không hợp lệ'));
        };

        image.src = dataUrl;
    });
}

async function resizeImageFile(
    file,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.85
) {
    const originalDataUrl = await readFileAsDataUrl(file);
    const image = await loadHtmlImage(originalDataUrl);

    let width = image.naturalWidth;
    let height = image.naturalHeight;

    const scale = Math.min(
        1,
        maxWidth / width,
        maxHeight / height
    );

    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Trình duyệt không hỗ trợ canvas');
    }

    context.drawImage(image, 0, 0, width, height);

    // Chuyển sang JPEG để giảm dung lượng.
    const dataUrl = canvas.toDataURL(
        'image/jpeg',
        quality
    );

    return {
        id: generateImageId(),
        name: file.name,
        mimeType: 'image/jpeg',

        // Phần Ollama cần, không chứa data:image/...;base64,
        base64: dataUrl.split(',')[1],

        // Dùng để hiển thị trong giao diện.
        previewUrl: dataUrl
    };
}
selectImageButton.addEventListener('click', function () {
    if (!currentModelSupportsVision) {
        alert('Model hiện tại không hỗ trợ hình ảnh.');
        return;
    }

    imageInput.click();
});

imageInput.addEventListener('change', async function () {
    const files = Array.from(imageInput.files || []);

    imageInput.value = '';

    if (!files.length) {
        return;
    }

    const remainingSlots =
        MAX_IMAGES - selectedImages.length;

    if (remainingSlots <= 0) {
        alert(`Chỉ được chọn tối đa ${MAX_IMAGES} ảnh.`);
        return;
    }

    const acceptedFiles = files.slice(0, remainingSlots);

    for (const file of acceptedFiles) {
        if (!file.type.startsWith('image/')) {
            continue;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            alert(
                `${file.name} lớn hơn 5 MB nên không được thêm.`
            );

            continue;
        }

        try {
            const image = await resizeImageFile(file);
            selectedImages.push(image);
        } catch (error) {
            console.error(error);
            alert(`Không xử lý được ảnh ${file.name}.`);
        }
    }

    renderSelectedImages();
});

function removeSelectedImage(imageId) {
    selectedImages = selectedImages.filter(function (image) {
        return image.id !== imageId;
    });

    renderSelectedImages();
}

function clearSelectedImages() {
    selectedImages = [];
    imageInput.value = '';
    renderSelectedImages();
}

function renderSelectedImages() {
    imagePreviewList.innerHTML = '';

    selectedImages.forEach(function (image) {
        const item = document.createElement('div');
        item.className = 'image-preview-item';

        const imageElement = document.createElement('img');
        imageElement.src = image.previewUrl;
        imageElement.alt = image.name;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-image-button';
        removeButton.textContent = '×';

        removeButton.addEventListener('click', function () {
            removeSelectedImage(image.id);
        });

        item.appendChild(imageElement);
        item.appendChild(removeButton);

        imagePreviewList.appendChild(item);
    });
}



function createNewChat() {
    const selectedModel = modelInput.value || '';

    const chat = {
        id: generateId(),
        title: 'Chat mới',
        model: selectedModel,
        messages: [
            { ...SYSTEM_MESSAGE }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    chats.unshift(chat);
    activeChatId = chat.id;

    saveChats();
    renderChatList();
    renderActiveChat();

    messageInput.focus();
}

historyLimitInput.addEventListener(
    'change',
    async function () {
        const chat = getActiveChat();

        if (!chat) {
            return;
        }

        chat.historyLimit = historyLimitInput.value;
        chat.updatedAt = new Date().toISOString();

        try {
            await saveChat(chat);
        } catch (error) {
            console.error(
                'Không lưu được history limit:',
                error
            );
        }
    }
);

function getMessagesForApi(chat) {
    const limit = Number(
        chat.historyLimit || 8
    );

    const systemMessage = {
        role: 'system',
        content: getChatSystemPrompt(chat)
    };

    let conversationMessages =
        chat.messages.filter(function (message) {
            return message.role !== 'system';
        });

    if (limit > 0) {
        conversationMessages =
            conversationMessages.slice(-limit);
    }

    return [
        systemMessage,
        ...conversationMessages
    ].map(convertMessageForApi);
}




const DB_NAME = 'ollama_chat_db';
const DB_VERSION = 1;
const CHAT_STORE = 'chats';
const SETTINGS_STORE = 'settings';

// Phải khai báo trước khi gọi bất kỳ function database nào.
let chatDb = null;

function openChatDatabase() {
    return new Promise(function (resolve, reject) {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function (event) {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(CHAT_STORE)) {
                const chatStore = database.createObjectStore(
                    CHAT_STORE,
                    {
                        keyPath: 'id'
                    }
                );

                chatStore.createIndex(
                    'updatedAt',
                    'updatedAt',
                    {
                        unique: false
                    }
                );
            }

            if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
                database.createObjectStore(
                    SETTINGS_STORE,
                    {
                        keyPath: 'key'
                    }
                );
            }
        };

        request.onsuccess = function () {
            chatDb = request.result;

            chatDb.onversionchange = function () {
                chatDb.close();
                chatDb = null;
            };

            resolve(chatDb);
        };

        request.onerror = function () {
            reject(
                request.error ||
                new Error('Không mở được IndexedDB')
            );
        };

        request.onblocked = function () {
            reject(
                new Error(
                    'IndexedDB đang bị chặn bởi tab khác.'
                )
            );
        };
    });
}

async function getDatabase() {
    if (chatDb) {
        return chatDb;
    }

    return await openChatDatabase();
}

async function saveChat(chat) {
    if (!chat || !chat.id) {
        throw new Error('Chat không hợp lệ');
    }

    const database = await getDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = database.transaction(
            CHAT_STORE,
            'readwrite'
        );

        const store = transaction.objectStore(CHAT_STORE);

        store.put(chat);

        transaction.oncomplete = function () {
            resolve();
        };

        transaction.onerror = function () {
            reject(
                transaction.error ||
                new Error('Không lưu được chat')
            );
        };

        transaction.onabort = function () {
            reject(
                transaction.error ||
                new Error('Transaction bị hủy')
            );
        };
    });
}

async function loadChats() {
    const database = await getDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = database.transaction(
            CHAT_STORE,
            'readonly'
        );

        const store = transaction.objectStore(CHAT_STORE);
        const request = store.getAll();

        request.onsuccess = function () {
            const result = request.result || [];

            result.sort(function (a, b) {
                return new Date(b.updatedAt) -
                    new Date(a.updatedAt);
            });

            resolve(result);
        };

        request.onerror = function () {
            reject(
                request.error ||
                new Error('Không đọc được chats')
            );
        };
    });
}

async function deleteChatFromDatabase(chatId) {
    const database = await getDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = database.transaction(
            CHAT_STORE,
            'readwrite'
        );

        transaction
            .objectStore(CHAT_STORE)
            .delete(chatId);

        transaction.oncomplete = function () {
            resolve();
        };

        transaction.onerror = function () {
            reject(
                transaction.error ||
                new Error('Không xóa được chat')
            );
        };
    });
}



async function clearAllChatsFromDatabase() {
    const database = await getDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = database.transaction(
            CHAT_STORE,
            'readwrite'
        );

        transaction
            .objectStore(CHAT_STORE)
            .clear();

        transaction.oncomplete = function () {
            resolve();
        };

        transaction.onerror = function () {
            reject(
                transaction.error ||
                new Error('Không xóa được dữ liệu chat')
            );
        };
    });
}

function scrollToBottom(force = false) {
    const distanceFromBottom =
        chatBox.scrollHeight -
        chatBox.scrollTop -
        chatBox.clientHeight;

    if (force || distanceFromBottom < 150) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

async function createNewChat() {
    const selectedModel = modelInput.value || '';

    const chat = {
        id: generateId(),
        title: 'Chat mới',
        model: selectedModel,
        historyLimit: '8',
        responseMode: 'normal',

        systemPrompt: DEFAULT_SYSTEM_PROMPT,

        messages: [
            createSystemMessage(DEFAULT_SYSTEM_PROMPT)
        ],

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    chats.unshift(chat);
    activeChatId = chat.id;

    try {
        await saveChat(chat);
    } catch (error) {
        console.error('Không lưu được chat mới:', error);
    }

    renderChatList(true);
    renderActiveChat();

    messageInput.focus();
}


function getChatSystemPrompt(chat) {
    if (!chat) {
        return DEFAULT_SYSTEM_PROMPT;
    }

    if (
        typeof chat.systemPrompt === 'string' &&
        chat.systemPrompt.trim()
    ) {
        return chat.systemPrompt.trim();
    }

    const systemMessage = chat.messages.find(function (message) {
        return message.role === 'system';
    });

    return systemMessage?.content?.trim() ||
        DEFAULT_SYSTEM_PROMPT;
}

function updateChatSystemPrompt(chat, prompt) {
    const normalizedPrompt =
        prompt.trim() || DEFAULT_SYSTEM_PROMPT;

    chat.systemPrompt = normalizedPrompt;

    const systemMessageIndex =
        chat.messages.findIndex(function (message) {
            return message.role === 'system';
        });

    if (systemMessageIndex >= 0) {
        chat.messages[systemMessageIndex] = {
            role: 'system',
            content: normalizedPrompt
        };
    } else {
        chat.messages.unshift({
            role: 'system',
            content: normalizedPrompt
        });
    }

    chat.updatedAt = new Date().toISOString();
}



function getActiveChat() {
    return chats.find(function (chat) {
        return chat.id === activeChatId;
    });
}

function switchChat(chatId) {
    if (isGenerating) {
        alert('Model đang trả lời. Hãy chờ hoàn tất trước khi đổi chat.');
        return;
    }

    activeChatId = chatId;

    renderChatList(true);
    renderActiveChat();
}

async function deleteChat(chatId) {
    if (isGenerating && activeChatId === chatId) {
        alert('Không thể xóa chat khi model đang trả lời.');
        return;
    }

    const chat = chats.find(function (item) {
        return item.id === chatId;
    });

    if (!chat) {
        return;
    }

    const confirmed = confirm(
        `Bạn có chắc muốn xóa "${chat.title}" không?`
    );

    if (!confirmed) {
        return;
    }

    try {
        await deleteChatFromDatabase(chatId);
    } catch (error) {
        console.error(error);
        alert('Không xóa được chat trong IndexedDB.');
        return;
    }

    chats = chats.filter(function (item) {
        return item.id !== chatId;
    });

    if (activeChatId === chatId) {
        activeChatId = chats[0]?.id || null;
    }

    if (chats.length === 0) {
        await createNewChat();
        return;
    }

    renderChatList();
    renderActiveChat();
}


async function clearActiveChat() {
    const chat = getActiveChat();

    if (!chat) {
        return;
    }

    const confirmed = confirm(
        'Bạn có chắc muốn xóa toàn bộ nội dung chat này không?'
    );

    if (!confirmed) {
        return;
    }

    // Lấy prompt đang nhập trên giao diện.
    // Nếu input rỗng thì lấy prompt hiện tại của chat.
    const currentSystemPrompt =
		systemPromptInput.value.trim() ||
		DEFAULT_SYSTEM_PROMPT;

	updateChatSystemPrompt(
		chat,
		currentSystemPrompt
	);

	chat.messages = [
		createSystemMessage(currentSystemPrompt)
	];

    chat.title = 'Chat mới';
    chat.updatedAt = new Date().toISOString();

    try {
        await saveChat(chat);
    } catch (error) {
        console.error(
            'Không lưu được thay đổi sau khi xóa chat:',
            error
        );

        alert('Không lưu được thay đổi.');
        return;
    }

    // Giữ lại nội dung prompt trên input.
    systemPromptInput.value = currentSystemPrompt;

    renderChatList();
    renderActiveChat();

    messageInput.focus();
}


function updateChatTitle(chat) {
    const firstUserMessage = chat.messages.find(function (message) {
        return message.role === 'user';
    });

    if (!firstUserMessage) {
        chat.title = 'Chat mới';
        return;
    }

    const title = firstUserMessage.content.trim();

    chat.title =
        title.length > 35
            ? title.substring(0, 35) + '...'
            : title;
}

function renderChatList(shouldScrollActive = false) {
    chatList.innerHTML = '';

    chats.forEach(function (chat) {
        const item = document.createElement('div');

        item.className =
            'chat-item' +
            (chat.id === activeChatId ? ' active' : '');

        const content = document.createElement('div');
        content.className = 'chat-item-content';

        const title = document.createElement('div');
        title.className = 'chat-item-title';
        title.textContent = chat.title || 'Chat mới';

        const model = document.createElement('div');
        model.className = 'chat-item-model';
        model.textContent =
            chat.model || 'Chưa chọn model';

        const deleteButton =
            document.createElement('button');

        deleteButton.type = 'button';
        deleteButton.className =
            'delete-chat-button';

        deleteButton.textContent = '×';
        deleteButton.title = 'Xóa chat';

        content.appendChild(title);
        content.appendChild(model);

        item.appendChild(content);
        item.appendChild(deleteButton);

        content.addEventListener('click', function () {
            switchChat(chat.id);
        });

        deleteButton.addEventListener(
            'click',
            function (event) {
                event.stopPropagation();
                deleteChat(chat.id);
            }
        );

        chatList.appendChild(item);
    });

    requestAnimationFrame(function () {
        if (shouldScrollActive) {
            scrollActiveChatIntoView();
        }

        updateScrollButtons();
    });
}

function renderActiveChat() {
    const chat = getActiveChat();

    if (!chat) {
        return;
    }

    chatBox.innerHTML = '';

    chatTitle.textContent =
        chat.title || 'Ollama Chat';

    if (chat.model) {
        modelInput.value = chat.model;
    }

    historyLimitInput.value =
        chat.historyLimit || '8';

    responseModeInput.value =
        chat.responseMode || 'normal';

    systemPromptInput.value =
        getChatSystemPrompt(chat);

    const visibleMessages = chat.messages.filter(
        function (message) {
            return message.role !== 'system';
        }
    );

    if (visibleMessages.length === 0) {
        addMessage(
            'assistant',
            'Xin chào! Hãy nhập tin nhắn để bắt đầu.'
        );

        return;
    }

    visibleMessages.forEach(function (message) {
        addMessage(
            message.role,
            message.content,
            message.images || []
        );
    });
}

toggleSystemPromptButton.addEventListener(
    'click',
    function () {
        systemPromptPanel.classList.toggle('active');
    }
);

saveSystemPromptButton.addEventListener(
    'click',
    async function () {
        const chat = getActiveChat();

        if (!chat) {
            return;
        }

        updateChatSystemPrompt(
            chat,
            systemPromptInput.value
        );

        try {
            await saveChat(chat);

            statusElement.className = 'status online';
            statusElement.textContent =
                'Đã lưu System Prompt';
        } catch (error) {
            console.error(
                'Không lưu được System Prompt:',
                error
            );

            alert('Không lưu được System Prompt.');
        }
    }
);
resetSystemPromptButton.addEventListener(
    'click',
    async function () {
        const chat = getActiveChat();

        if (!chat) {
            return;
        }

        systemPromptInput.value =
            DEFAULT_SYSTEM_PROMPT;

        updateChatSystemPrompt(
            chat,
            DEFAULT_SYSTEM_PROMPT
        );

        try {
            await saveChat(chat);
        } catch (error) {
            console.error(
                'Không lưu được System Prompt:',
                error
            );
        }
    }
);

function addMessage(role, content = '', images = []) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${role}`;

    const bubbleElement = document.createElement('div');
    bubbleElement.className = 'bubble';

    if (Array.isArray(images) && images.length > 0) {
        const imagesElement = document.createElement('div');
        imagesElement.className = 'message-images';

        images.forEach(function (imageData) {
            const imageElement = document.createElement('img');

            const base64 =
                typeof imageData === 'string'
                    ? imageData
                    : imageData.base64;

            const mimeType =
                typeof imageData === 'object'
                    ? imageData.mimeType || 'image/jpeg'
                    : 'image/jpeg';

            imageElement.src =
                `data:${mimeType};base64,${base64}`;

            imageElement.alt = 'Ảnh đính kèm';

            imageElement.addEventListener('click', function () {
                window.open(imageElement.src, '_blank');
            });

            imagesElement.appendChild(imageElement);
        });

        bubbleElement.appendChild(imagesElement);
    }

    if (content) {
        const textElement = document.createElement('div');
        textElement.textContent = content;
        bubbleElement.appendChild(textElement);
    }

    messageElement.appendChild(bubbleElement);
    chatBox.appendChild(messageElement);

    scrollToBottom();

    return bubbleElement;
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function setLoading(loading) {
    isGenerating = loading;

    sendButton.disabled = loading;
    modelInput.disabled = loading;
    responseModeInput.disabled = loading;
    newChatButton.disabled = loading;

    sendButton.textContent =
        loading ? 'Đang trả lời...' : 'Gửi';
}

function getModelOptions() {
    switch (responseModeInput.value) {
        case 'fast':
            return {
                think: false,
                options: {
                    num_predict: 150,
                    num_ctx: 2048,
                    temperature: 0.3
                }
            };

        case 'detail':
            return {
                think: true,
                options: {
                    num_predict: 1000,
                    num_ctx: 8192,
                    temperature: 0.7
                }
            };

        default:
            return {
                think: false,
                options: {
                    num_predict: 400,
                    num_ctx: 4096,
                    temperature: 0.5
                }
            };
    }
}


async function sendMessage() {
    if (isGenerating) {
        return;
    }

    const chat = getActiveChat();
    const content = messageInput.value.trim();
    const model = modelInput.value.trim();

    if (!chat) {
        alert('Không tìm thấy cuộc chat hiện tại.');
        return;
    }

    // Cho phép:
    // - Chỉ gửi text
    // - Chỉ gửi ảnh
    // - Gửi ảnh kèm text
    if (!content && selectedImages.length === 0) {
        return;
    }

    if (!model) {
        alert('Vui lòng chọn model.');
        return;
    }

    if (
        selectedImages.length > 0 &&
        !currentModelSupportsVision
    ) {
        alert(
            'Model đang chọn không hỗ trợ hình ảnh. ' +
            'Hãy chọn model vision.'
        );
        return;
    }

    /*
     * Sao chép ảnh trước khi clearSelectedImages().
     *
     * storedImages:
     * - Lưu vào IndexedDB.
     * - Dùng để render lại lịch sử.
     *
     * Ollama sẽ nhận base64 thông qua convertMessageForApi().
     */
    const storedImages = selectedImages.map(function (image) {
        return {
            id: image.id,
            name: image.name,
            mimeType: image.mimeType || 'image/jpeg',
            base64: image.base64
        };
    });

    const userMessage = {
        role: 'user',
        content: content || 'Hãy phân tích hình ảnh này.'
    };

    if (storedImages.length > 0) {
        userMessage.images = storedImages;
    }

    /*
     * Cập nhật chat hiện tại.
     */
    chat.model = model;
    chat.responseMode = responseModeInput.value;
    chat.historyLimit = historyLimitInput.value;

    chat.messages.push(userMessage);

    updateChatTitle(chat);
    chat.updatedAt = new Date().toISOString();

    /*
     * Lưu tin nhắn user vào IndexedDB.
     */
    try {
        await saveChat(chat);
    } catch (error) {
        console.error(
            'Không lưu được tin nhắn user:',
            error
        );

        alert(
            'Tin nhắn vẫn sẽ được gửi nhưng không lưu được vào lịch sử.'
        );
    }

    /*
     * Cập nhật giao diện.
     */
    messageInput.value = '';

    addMessage(
        'user',
        userMessage.content,
        userMessage.images || []
    );
	scrollToBottom(true);
    clearSelectedImages();

    renderChatList();

    const assistantBubble = addMessage(
        'assistant',
        'Đang suy nghĩ...'
    );

    const modelConfig = getModelOptions();

    /*
     * Hàm này cần:
     * - Lấy số history được chọn.
     * - Chuyển images object thành mảng base64 cho Ollama.
     */
    const apiMessages = getMessagesForApi(chat);

    setLoading(true);

    let assistantContent = '';

    try {
        const response = await fetch(
            `${OLLAMA_URL}/api/chat`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    model: model,
                    messages: apiMessages,
                    stream: true,

                    // Tắt hoặc giảm thinking tùy cấu hình.
                    think: modelConfig.think,

                    options: modelConfig.options,

                    // Giữ model trong RAM để lần sau phản hồi nhanh hơn.
                    keep_alive: '10m'
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();

            throw new Error(
                errorText ||
                `Ollama trả về lỗi HTTP ${response.status}`
            );
        }

        if (!response.body) {
            throw new Error(
                'Trình duyệt không hỗ trợ streaming response.'
            );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';

        assistantBubble.textContent = '';

        while (true) {
            const result = await reader.read();

            if (result.done) {
                break;
            }

            buffer += decoder.decode(
                result.value,
                {
                    stream: true
                }
            );

            /*
             * Ollama stream trả về từng JSON trên từng dòng.
             */
            const lines = buffer.split('\n');

            // Dòng cuối có thể chưa nhận đủ JSON.
            buffer = lines.pop() || '';

            for (const line of lines) {
                const jsonLine = line.trim();

                if (!jsonLine) {
                    continue;
                }

                try {
                    const data = JSON.parse(jsonLine);

                    const responseText =
                        data.message?.content || '';

                    assistantContent += responseText;

                    assistantBubble.textContent =
                        assistantContent ||
                        'Đang suy nghĩ...';
					scrollToBottom(true);

                    scrollToBottom();
                } catch (parseError) {
                    console.warn(
                        'Không parse được dòng stream:',
                        jsonLine,
                        parseError
                    );
                }
            }
        }

        /*
         * Xử lý JSON còn sót trong buffer.
         */
        if (buffer.trim()) {
            try {
                const finalData = JSON.parse(buffer.trim());

                const finalText =
                    finalData.message?.content || '';

                assistantContent += finalText;
            } catch (parseError) {
                console.warn(
                    'Không parse được buffer cuối:',
                    buffer,
                    parseError
                );
            }
        }

        if (!assistantContent.trim()) {
            assistantContent =
                'Model không trả về nội dung.';
        }

        assistantBubble.textContent =
            assistantContent;
		scrollToBottom(true);

        /*
         * Lưu phản hồi assistant.
         */
        chat.messages.push({
            role: 'assistant',
            content: assistantContent
        });

        chat.updatedAt = new Date().toISOString();

        try {
            await saveChat(chat);
        } catch (saveError) {
            console.error(
                'Không lưu được câu trả lời assistant:',
                saveError
            );
        }

        renderChatList();

        statusElement.className = 'status online';
        statusElement.textContent =
            `Đang dùng model: ${model}`;
    } catch (error) {
        console.error('Lỗi gửi chat:', error);

        const errorMessage = getChatErrorMessage(error);

        assistantBubble.textContent =
            `Lỗi: ${errorMessage}`;

        /*
         * Có thể lưu lỗi vào lịch sử để reload trang vẫn thấy.
         * Nếu không muốn lưu lỗi, xóa block này.
         */
        chat.messages.push({
            role: 'assistant',
            content: `Lỗi: ${errorMessage}`,
            isError: true
        });

        chat.updatedAt = new Date().toISOString();

        try {
            await saveChat(chat);
        } catch (saveError) {
            console.error(
                'Không lưu được trạng thái lỗi:',
                saveError
            );
        }

        statusElement.className = 'status offline';
        statusElement.textContent =
            'Có lỗi khi gọi Ollama';
    } finally {
        setLoading(false);
        scrollToBottom();
        messageInput.focus();
    }
}

function getChatErrorMessage(error) {
    const message =
        error?.message || String(error);

    if (message.includes('Failed to fetch')) {
        return (
            'Không kết nối được Ollama. ' +
            'Hãy kiểm tra Ollama đang chạy và cấu hình CORS.'
        );
    }

    if (
        message.includes('does not support images') ||
        message.includes('does not support vision')
    ) {
        return 'Model này không hỗ trợ hình ảnh.';
    }

    if (
        message.includes('context length') ||
        message.includes('context window')
    ) {
        return (
            'Lịch sử hoặc ảnh quá lớn, vượt quá context của model. ' +
            'Hãy giảm số history hoặc số lượng ảnh.'
        );
    }

    if (
        message.includes('out of memory') ||
        message.includes('memory')
    ) {
        return (
            'Không đủ RAM hoặc VRAM để chạy model. ' +
            'Hãy dùng model nhỏ hơn hoặc giảm kích thước ảnh.'
        );
    }

    return message;
}



function convertMessageForApi(message) {
    const apiMessage = {
        role: message.role,
        content: message.content || ''
    };

    if (
        Array.isArray(message.images) &&
        message.images.length > 0
    ) {
        apiMessage.images = message.images
            .map(function (image) {
                if (typeof image === 'string') {
                    return image;
                }

                return image.base64 || '';
            })
            .filter(Boolean);
    }

    return apiMessage;
}

function getMessagesForApi(chat) {
    const limit = Number(chat.historyLimit || 8);

    const systemMessages = chat.messages.filter(function (message) {
        return message.role === 'system';
    });

    let conversationMessages = chat.messages.filter(function (message) {
        return message.role !== 'system';
    });

    if (limit > 0) {
        conversationMessages =
            conversationMessages.slice(-limit);
    }

    return [
        ...systemMessages,
        ...conversationMessages
    ].map(convertMessageForApi);
}

modelInput.addEventListener('change', async function () {
    const chat = getActiveChat();

    if (chat) {
        chat.model = modelInput.value;
        chat.updatedAt = new Date().toISOString();

        try {
            await saveChat(chat);
        } catch (error) {
            console.error('Không lưu được model:', error);
        }

        renderChatList();
    }

    await checkModelVisionCapability(modelInput.value);
});

newChatButton.addEventListener(
    'click',
    createNewChat
);

clearButton.addEventListener(
    'click',
    clearActiveChat
);

sendButton.addEventListener(
    'click',
    sendMessage
);

messageInput.addEventListener(
    'keydown',
    function (event) {
        if (
            event.key === 'Enter' &&
            !event.shiftKey
        ) {
            event.preventDefault();
            sendMessage();
        }
    }
);

async function loadModels() {
    modelInput.disabled = true;
    modelInput.innerHTML = `
        <option value="">Đang tải models...</option>
    `;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const models = data.models || [];

        modelInput.innerHTML = '';

        if (models.length === 0) {
            modelInput.innerHTML = `
                <option value="">Chưa có model nào</option>
            `;

            statusElement.className = 'status offline';
            statusElement.textContent =
                'Ollama đang chạy nhưng chưa cài model';

            return;
        }

        models.forEach(function (model, index) {
            const option = document.createElement('option');

            option.value = model.name;
            option.textContent = model.name;

            // Chọn model đầu tiên mặc định.
            if (index === 0) {
                option.selected = true;
            }

            modelInput.appendChild(option);
        });

        statusElement.className = 'status online';
        statusElement.textContent =
            `Ollama đang hoạt động · ${models.length} model đã cài`;
    } catch (error) {
        console.error('Không tải được models:', error);

        modelInput.innerHTML = `
            <option value="">Không tải được models</option>
        `;

        statusElement.className = 'status offline';
        statusElement.textContent =
            'Không kết nối được Ollama tại localhost:11434';
    } finally {
        modelInput.disabled = false;
    }
}



function scrollChatTabs(direction) {
    const scrollDistance = Math.max(
        chatList.clientWidth * 0.7,
        250
    );

    chatList.scrollBy({
        left: direction * scrollDistance,
        behavior: 'smooth'
    });
}

function updateScrollButtons() {
    const maxScrollLeft =
        chatList.scrollWidth - chatList.clientWidth;

    scrollLeftButton.disabled =
        chatList.scrollLeft <= 1;

    scrollRightButton.disabled =
        chatList.scrollLeft >= maxScrollLeft - 1;
}

function scrollActiveChatIntoView() {
    const activeItem =
        chatList.querySelector('.chat-item.active');

    if (!activeItem) {
        return;
    }

    const containerLeft = chatList.scrollLeft;
    const containerRight =
        containerLeft + chatList.clientWidth;

    const itemLeft = activeItem.offsetLeft;
    const itemRight =
        itemLeft + activeItem.offsetWidth;

    if (itemLeft < containerLeft) {
        chatList.scrollTo({
            left: itemLeft - 10,
            behavior: 'smooth'
        });

        return;
    }

    if (itemRight > containerRight) {
        chatList.scrollTo({
            left:
                itemRight -
                chatList.clientWidth +
                10,
            behavior: 'smooth'
        });
    }
}
scrollLeftButton.addEventListener('click', function () {
    scrollChatTabs(-1);
});

scrollRightButton.addEventListener('click', function () {
    scrollChatTabs(1);
});

chatList.addEventListener('scroll', updateScrollButtons);

window.addEventListener('resize', updateScrollButtons);

scrollLeftButton.addEventListener('click', function () {
    scrollChatTabs(-1);
});

scrollRightButton.addEventListener('click', function () {
    scrollChatTabs(1);
});

chatList.addEventListener('scroll', updateScrollButtons);

window.addEventListener('resize', updateScrollButtons);
requestAnimationFrame(function () {
    scrollActiveChatIntoView();
    updateScrollButtons();
});

chatList.addEventListener(
    'wheel',
    function (event) {
        if (
            chatList.scrollWidth <=
            chatList.clientWidth
        ) {
            return;
        }

        event.preventDefault();

        chatList.scrollLeft +=
            event.deltaY || event.deltaX;
    },
    {
        passive: false
    }
);


async function initChatApp() {
    try {
        await openChatDatabase();

        chats = await loadChats();

        await loadModels();

        if (chats.length === 0) {
            await createNewChat();
        } else {
            activeChatId = chats[0].id;

            renderChatList();
            renderActiveChat();
        }

        messageInput.focus();
    } catch (error) {
        console.error('Khởi tạo ứng dụng thất bại:', error);

        statusElement.className = 'status offline';
        statusElement.textContent =
            'Không thể mở bộ nhớ IndexedDB';

        alert(
            'Không thể khởi tạo dữ liệu chat. ' +
            'Hãy kiểm tra trình duyệt có cho phép IndexedDB không.'
        );
    }
}

initChatApp();


