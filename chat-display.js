// Display OpenAI thread messages
function displayOpenAIThread(thread_id, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Container not found: ${containerSelector}`);
        return;
    }
    
    container.innerHTML = '';
    
    const loadingDiv = document.createElement('div');
    loadingDiv.textContent = 'Loading conversation...';
    container.appendChild(loadingDiv);
    
    fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/thread?thread_id=${thread_id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        return response.json();
    })
    .then(messages => {
        container.removeChild(loadingDiv);
        
        const sortedMessages = messages.sort((a, b) => a.created_at - b.created_at);
        
        sortedMessages.forEach(message => {
            const role = message.role;
            
            let contentText = '';
            try {
                if (message.content && message.content.length > 0) {
                    const contentObj = message.content[0];
                    if (contentObj.type === 'text' && contentObj.text && contentObj.text.value) {
                        try {
                            const parsedValue = JSON.parse(contentObj.text.value);
                            contentText = parsedValue.text || parsedValue.value || '';
                        } catch (e) {
                            contentText = contentObj.text.value;
                        }
                    }
                }
            } catch (error) {
                console.error('Error parsing message content:', error);
                contentText = 'Error displaying message content';
            }
            
            const timestamp = new Date(message.created_at * 1000);
            const formattedTime = formatDateTime(timestamp);
            
            if (role === 'user') {
                createUserMessage(container, contentText, formattedTime);
            } else if (role === 'assistant') {
                createAssistantMessage(container, contentText, formattedTime);
            }
        });
    })
    .catch(error => {
        console.error('Error fetching thread messages:', error);
        container.innerHTML = `<div class="error-message">Error loading conversation: ${error.message}</div>`;
    });
}

// Format date and time
function formatDateTime(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = days[date.getDay()];
    const month = months[date.getMonth()];
    const dayOfMonth = date.getDate();
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}, ${month} ${dayOfMonth}, ${year} at ${hours}:${minutes}`;
}

// Create user message bubble
function createUserMessage(container, text, time) {
    const userContainer = document.createElement('div');
    userContainer.className = 'user_content_container';
    
    const footnote = document.createElement('div');
    footnote.className = 'bubble-footnote';
    footnote.textContent = `role: user. time: ${time}`;
    
    const userBubble = document.createElement('div');
    userBubble.className = 'user_bubble';
    userBubble.textContent = text;
    
    userContainer.appendChild(footnote);
    userContainer.appendChild(userBubble);
    
    container.appendChild(userContainer);
}

// Create assistant message bubble
function createAssistantMessage(container, text, time) {
    const aiContainer = document.createElement('div');
    aiContainer.className = 'ai_content_container';
    
    const footnote = document.createElement('div');
    footnote.className = 'bubble-footnote';
    footnote.textContent = `role: assistant. time: ${time}`;
    
    const aiBubble = document.createElement('div');
    aiBubble.className = 'ai_bubble';
    
    const aiText = document.createElement('div');
    aiText.className = 'ai_text';
    aiText.textContent = text;
    
    aiBubble.appendChild(aiText);
    aiContainer.appendChild(footnote);
    aiContainer.appendChild(aiBubble);
    
    container.appendChild(aiContainer);
}