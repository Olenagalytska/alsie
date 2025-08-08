// ============================================================================
// CHAT SHARED FUNCTIONS LIBRARY
// ============================================================================
// Reusable functions for both student and teacher chat interfaces

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const CHAT_CONFIG = {
  API_BASE_URL: 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5',
  ENDPOINTS: {
    UB_SINGLE: 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/ub_single',
    AIR: 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/air',
    PROCESS_CHAT: 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/process_student_chat',
    GENERATE_RESPONSE: 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/generate_user_response'
  }
};

// ============================================================================
// UI UTILITIES
// ============================================================================

function setupInputFocusHandling(inputElement) {
  inputElement.addEventListener('focus', function() {
    this.style.outline = 'none';
    this.style.borderColor = 'transparent';
    this.style.boxShadow = 'none';
  });
}

function setUILoadingState(isLoading, elements) {
  const { userInput, chatInputContainer, submitButton, waitingBubble } = elements;
  
  if (isLoading) {
    userInput.style.opacity = '0';
    userInput.disabled = true;
    chatInputContainer.className = 'chat-input-container-disabled';
    submitButton.className = 'icon-button-disabled';
    waitingBubble.style.display = 'flex';
  } else {
    userInput.style.opacity = '100';
    userInput.disabled = false;
    chatInputContainer.className = 'chat-input-container';
    submitButton.className = 'icon-button';
    waitingBubble.style.display = 'none';
  }
}

function resetChatForm(userInputElement) {
  userInputElement.value = '';
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchUbData(userId, blockId) {
  const response = await fetch(`${CHAT_CONFIG.ENDPOINTS.UB_SINGLE}?user_id=${userId}&block_id=${blockId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch user block data: ${response.status} ${response.statusText}`);
  }
  
  const ubData = await response.json();
  console.log('ubData:', ubData);
  return ubData;
}

async function fetchChatData(ubId) {
  const response = await fetch(`${CHAT_CONFIG.ENDPOINTS.AIR}?ub_id=${ubId}`);
  
  if (!response.ok) {
    throw new Error(`Error fetching air API: ${response.statusText}`);
  }
  
  const airData = await response.json();
  console.log('Air API Response:', airData);
  return airData;
}

async function processUserChatRequest(userInput, ubId) {
  const formData = new FormData();
  formData.append('ub_id', ubId);
  formData.append('user_input', userInput);
  
  const response = await fetch(CHAT_CONFIG.ENDPOINTS.PROCESS_CHAT, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Error processing user request: ${response.statusText}`);
  }
  
  console.log('User request processed successfully.');
  return response;
}

async function generateUserResponse(ubId) {
  const response = await fetch(CHAT_CONFIG.ENDPOINTS.GENERATE_RESPONSE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ub_id: ubId }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('Generated Answer:', data);
  return data;
}

// ============================================================================
// CHAT DISPLAY FUNCTIONS
// ============================================================================

function processChatApiResponse(data, mainContainer) {
  if (!Array.isArray(data)) {
    console.error("Data is not an array or is null/undefined.");
    return;
  }
  
  mainContainer.innerHTML = ''; // Clear previous content
  
  data.forEach(item => {
    // Display user content
    const userText = item?.user_content?.text;
    if (userText) {
      createUserContentContainer(userText, mainContainer);
    }
    
    // Display AI content
    const aiContent = item?.ai_content;
    if (Array.isArray(aiContent)) {
      aiContent.forEach(aiContentItem => {
        const aiText = aiContentItem?.text;
        if (aiText) {
          createAIContentContainer(aiText, mainContainer);
        }
      });
    }
  });
}

function createUserContentContainer(userInput, mainContainer) {
  const container = document.createElement('div');
  container.className = 'user_content_container';
  
  const bubble = document.createElement('div');
  bubble.className = 'user_bubble';
  
  const content = document.createElement('div');
  content.className = 'user_text';
  content.textContent = userInput;
  
  bubble.appendChild(content);
  container.appendChild(bubble);
  mainContainer.appendChild(container);
}

function createAIContentContainer(body, mainContainer) {
  const container = document.createElement('div');
  container.className = 'ai_content_container';
  
  const bubble = document.createElement('div');
  bubble.className = 'ai_bubble';
  
  const contentElement = document.createElement('div');
  contentElement.className = 'ai_text w-richtext';
  
  // Parse markdown to HTML
  try {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false
      });
      
      contentElement.innerHTML = marked.parse(body);
      
      // Add syntax highlighting if available
      if (typeof Prism !== 'undefined') {
        contentElement.querySelectorAll('pre code').forEach((block) => {
          Prism.highlightElement(block);
        });
      }
    } else {
      console.warn('Marked library not loaded, displaying plain text');
      contentElement.textContent = body;
    }
  } catch (error) {
    console.error('Error parsing markdown:', error);
    contentElement.textContent = body;
  }
  
  bubble.appendChild(contentElement);
  container.appendChild(bubble);
  mainContainer.appendChild(container);
  
  // Setup code blocks
  setupCodeBlocks(container);
}

function setupCodeBlocks(container) {
  const codeBlocks = container.querySelectorAll('pre code');
  
  codeBlocks.forEach(codeBlock => {
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-code-button';
    copyButton.textContent = 'Copy';
    
    const pre = codeBlock.parentNode;
    pre.style.position = 'relative';
    pre.appendChild(copyButton);
    
    copyButton.addEventListener('click', () => {
      const code = codeBlock.textContent;
      navigator.clipboard.writeText(code).then(() => {
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = 'Copy';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy code:', err);
        copyButton.textContent = 'Error!';
        setTimeout(() => {
          copyButton.textContent = 'Copy';
        }, 2000);
      });
    });
  });
}

// ============================================================================
// NAVIGATION FUNCTIONS
// ============================================================================

function setupBasicNavigation(ubData, userId, role = 'student') {
  // Setup navigation button states
  const prevButton = document.getElementById('prev_lesson');
  const nextButton = document.getElementById('next_lesson');
  
  if (prevButton) {
    if (!ubData._block.prev_id) {
      prevButton.className = 'arrow-disabled';
    }
    
    prevButton.addEventListener('click', () => {
      if (ubData._block.prev_id) {
        const page = role === 'teacher' ? 'teacher/lesson-page-teacher-view' : 'lesson-page';
        window.location.href = `/${page}?user_id=${userId}&block_id=${ubData._block.prev_id}`;
      } else {
        console.error('No previous lesson available');
      }
    });
  }
  
  if (nextButton) {
    if (!ubData._block.next_id) {
      nextButton.className = 'arrow-disabled';
    }
    
    nextButton.addEventListener('click', () => {
      if (ubData._block.next_id) {
        const page = role === 'teacher' ? 'teacher/lesson-page-teacher-view' : 'lesson-page';
        window.location.href = `/${page}?user_id=${userId}&block_id=${ubData._block.next_id}`;
      } else {
        console.error('No next lesson available');
      }
    });
  }
}

function setupBlockContent(ubData) {
  const blockNameElement = document.getElementById('block-name-full');
  if (blockNameElement) {
    blockNameElement.innerText = ubData._block.name || "Unknown Block";
  }
  
  if (ubData._block.markdown_content) {
    const blockContentDiv = document.getElementById('block-content-div');
    if (blockContentDiv && typeof marked !== 'undefined') {
      blockContentDiv.innerHTML = marked.parse(ubData._block.markdown_content);
    }
  }
}

// ============================================================================
// FORM VALIDATION
// ============================================================================

function validateChatInput(ubId, userInput) {
  if (!ubId || !userInput) {
    console.error('UB ID and User Input are required.');
    return false;
  }
  return true;
}

// ============================================================================
// MAIN CHAT WORKFLOW FUNCTIONS
// ============================================================================

async function handleChatSubmit(userInput, ubId, elements, mainContainer, refreshChatCallback) {
  if (!validateChatInput(ubId, userInput)) {
    return;
  }
  
  try {
    // Add user message to chat
    createUserContentContainer(userInput, mainContainer);
    
    // Set loading state
    setUILoadingState(true, elements);
    
    // Process the request
    await processUserChatRequest(userInput, ubId);
    
    // Reset UI state
    setUILoadingState(false, elements);
    
    // Refresh chat display
    await refreshChatCallback();
    
    // Reset form
    resetChatForm(elements.userInput);
    
  } catch (error) {
    console.error('Error handling chat submit:', error);
    setUILoadingState(false, elements);
  }
}

async function refreshChatDisplay(ubId, mainContainer) {
  try {
    const chatData = await fetchChatData(ubId);
    processChatApiResponse(chatData, mainContainer);
  } catch (error) {
    console.error('Error refreshing chat display:', error);
  }
}