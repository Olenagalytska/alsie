// ============================================================================
// WEBFLOW STUDENT CHAT PAGE SCRIPT - RESTRUCTURED
// ============================================================================
// Place this code in the Webflow page settings under "Before </body> tag"

// ============================================================================
// STUDENT CHAT CLASS DEFINITION
// ============================================================================

class StudentChat {
  constructor() {
    this.elements = {};
    this.appState = {
      user: null,
      userId: null,
      blockId: null,
      ubId: null,
      ubData: null,
      courseId: null,
      lessonId: null,
      currentStreamingMessage: null
    };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize() {
    try {
      this.setupDOMElements();
      await this.initializeStudentChat();
      return true;
    } catch (error) {
      console.error('Failed to initialize student chat:', error);
      return false;
    }
  }

  setupDOMElements() {
    this.elements = {
      form: document.getElementById('chat-form'),
      mainContainer: document.getElementById('main-container'),
      userInput: document.getElementById('user-input'),
      submitButton: document.getElementById('submit-button'),
      waitingBubble: document.getElementById('waiting-bubble'),
      chatInputContainer: document.getElementById('chat-input-container')
    };
  }

  async initializeStudentChat() {
    // 1. Setup UI
    this.setupInputFocusHandling();
    
    // 2. Authenticate user
    this.appState.user = await verifyUserAuth();
    
    // 3. Get URL parameters
    this.appState.userId = getUrlParameters('user_id');
    this.appState.blockId = getUrlParameters('block_id');
    
    if (!this.appState.userId || !this.appState.blockId) {
      throw new Error('Required URL parameters are missing: user_id or block_id');
    }

    // 4. Security check: Compare authenticated user ID with URL user ID
    if (this.appState.user.id != this.appState.userId) {
      console.warn('User ID mismatch detected. Redirecting to home page.');
      window.location.href = '/';
      return;
    }
    
    // 5. Fetch user block data
    this.appState.ubData = await fetchUbData(this.appState.userId, this.appState.blockId);
    this.appState.ubId = this.appState.ubData.id;
    this.appState.courseId = this.appState.ubData._lesson._course.id;
    this.appState.lessonId = this.appState.ubData._lesson.id;
    
    // 6. Setup page elements
    await this.setupStudentPageElements();
    
    // 7. Setup event listeners
    this.setupStudentEventListeners();
    
    // 8. Load initial chat messages
    await this.loadChatHistory();
  }

  // ============================================================================
  // UI SETUP
  // ============================================================================

  setupInputFocusHandling() {
    this.elements.userInput.addEventListener('focus', function() {
      this.style.outline = 'none';
      this.style.borderColor = 'transparent';
      this.style.boxShadow = 'none';
    });
  }

  async setupStudentPageElements() {
    // Set element names for navigation
    await setElementNames({
      course_id: this.appState.courseId,
      lesson_id: this.appState.lessonId,
      block_id: this.appState.blockId,
      user_id: this.appState.userId
    });
    
    // Setup navigation
    this.setupStudentNavigation();
    
    // Setup block content
    this.setupBlockContent();
    
    // Hide form if block is finished or blocked
    if (this.appState.ubData.status === "finished" || this.appState.ubData.status === "blocked") {
      this.elements.form.style.display = "none";
    }
  }

  setupBlockContent() {
    const blockNameElement = document.getElementById('block-name-full');
    if (blockNameElement) {
      blockNameElement.innerText = this.appState.ubData._block.name || "Unknown Block";
    }
    
    if (this.appState.ubData._block.markdown_content) {
      const blockContentDiv = document.getElementById('block-content-div');
      if (blockContentDiv && typeof marked !== 'undefined') {
        blockContentDiv.innerHTML = marked.parse(this.appState.ubData._block.markdown_content);
      }
    }
  }

  setupStudentNavigation() {
    const { ubData, userId } = this.appState;
    
    // Setup basic lesson navigation
    this.setupBasicNavigation();
    
    // Setup student-specific navigation
    document.getElementById('course-name')?.addEventListener('click', () => {
      if (ubData._lesson.course_id) {
        window.location.href = `/course-home-student?course_id=${ubData._lesson.course_id}`;
      } else {
        console.error('No course home available');
      }
    });
    
    document.getElementById('course-home')?.addEventListener('click', () => {
      if (ubData._lesson.course_id) {
        window.location.href = `/course-home-student?course_id=${ubData._lesson.course_id}`;
      } else {
        console.error('No course home available');
      }
    });
    
    document.getElementById('home-button')?.addEventListener('click', () => {
      window.location.href = `/`;
    });
  }

  setupBasicNavigation() {
    const { ubData, userId } = this.appState;
    const prevButton = document.getElementById('prev_lesson');
    const nextButton = document.getElementById('next_lesson');
    
    if (prevButton) {
      if (!ubData._block.prev_id) {
        prevButton.className = 'arrow-disabled';
      }
      
      prevButton.addEventListener('click', () => {
        if (ubData._block.prev_id) {
          window.location.href = `/lesson-page?user_id=${userId}&block_id=${ubData._block.prev_id}`;
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
          window.location.href = `/lesson-page?user_id=${userId}&block_id=${ubData._block.next_id}`;
        } else {
          console.error('No next lesson available');
        }
      });
    }
  }

  setupStudentEventListeners() {
    this.elements.submitButton.addEventListener('click', (event) => {
      this.handleStudentSubmit(event);
    });

    // Handle Enter key press in the input field
    this.elements.userInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        // Check if Shift+Enter was pressed (for multi-line input)
        if (event.shiftKey) {
          return;
        }
        
        event.preventDefault();
        this.handleStudentSubmit(event);
      }
    });
  }

  // ============================================================================
  // MESSAGE LOADING FUNCTIONS
  // ============================================================================

  async loadChatHistory() {
    try {
      // Check if thread_id exists
      if (!this.appState.ubData.thread_id) {
        console.log('No thread_id found, chat is empty');
        return;
      }

      // Fetch messages from API
      const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/l_messages?thread_id=${this.appState.ubData.thread_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      }

      const messages = await response.json();
      console.log('Messages loaded:', messages);

      // Clear main container
      this.elements.mainContainer.innerHTML = '';

      // Reverse messages order (newest first -> oldest first for display)
      const sortedMessages = messages.reverse();

      // Display each message
      sortedMessages.forEach(message => {
        this.displayMessage(message);
      });

    } catch (error) {
      console.error('Error loading chat history:', error);
      // TODO: Add proper error handling UI
    }
  }

  displayMessage(message) {
    const messageText = this.extractMessageText(message);
    
    if (message.role === 'user') {
      this.createUserMessage(messageText);
    } else if (message.role === 'assistant') {
      this.createAssistantMessage(messageText);
    }
  }

  extractMessageText(message) {
    try {
      if (message.content && message.content.length > 0) {
        const contentObj = message.content[0];
        if (contentObj.type === 'text' && contentObj.text && contentObj.text.value) {
          let textValue = contentObj.text.value;
          
          // ============================================================================
          // TEMPORARY: Legacy JSON format support (REMOVE WHEN ALL USERS SWITCH TO STREAMING)
          // ============================================================================
          textValue = this.parseLegacyMessageFormat(textValue, message.role);
          // ============================================================================
          // END TEMPORARY SECTION
          // ============================================================================
          
          return textValue;
        }
      }
    } catch (error) {
      console.error('Error extracting message text:', error);
    }
    return 'Error displaying message content';
  }

  // ============================================================================
  // TEMPORARY: Legacy message format parser (REMOVE WHEN ALL USERS SWITCH TO STREAMING)
  // ============================================================================
  parseLegacyMessageFormat(textValue, role) {
    // Check if message starts with { (indicating legacy JSON format)
    if (textValue.trim().startsWith('{')) {
      try {
        if (role === 'assistant') {
          // Handle AI messages: {"text":"content","title":"-","type":"interview","additional":"info"}
          const parsed = JSON.parse(textValue);
          if (parsed.text) {
            console.log('TEMP: Parsed legacy AI message format');
            return parsed.text;
          }
        } else if (role === 'user') {
          // Handle user messages: {'type': 'student', 'text': 'content' (missing closing bracket)
          let fixedJson = textValue.trim();
          
          // Fix missing closing bracket if needed
          if (!fixedJson.endsWith('}')) {
            fixedJson += '}';
          }
          
          // Replace single quotes with double quotes for valid JSON
          fixedJson = fixedJson.replace(/'/g, '"');
          
          const parsed = JSON.parse(fixedJson);
          if (parsed.text) {
            console.log('TEMP: Parsed legacy user message format');
            return parsed.text;
          }
        }
      } catch (jsonError) {
        console.warn('TEMP: Failed to parse legacy JSON format, using raw text:', jsonError);
        // If JSON parsing fails, return original text
      }
    }
    
    // Return original text if not legacy format or parsing failed
    return textValue;
  }
  // ============================================================================
  // END TEMPORARY SECTION - REMOVE WHEN ALL USERS SWITCH TO STREAMING
  // ============================================================================

  // ============================================================================
  // MESSAGE DISPLAY FUNCTIONS
  // ============================================================================

  createUserMessage(text) {
    const userContainer = document.createElement('div');
    userContainer.className = 'user_content_container';
    
    const userBubble = document.createElement('div');
    userBubble.className = 'user_bubble';
    
    const userContent = document.createElement('div');
    userContent.className = 'user_content';
    userContent.textContent = text;
    
    userBubble.appendChild(userContent);
    userContainer.appendChild(userBubble);
    this.elements.mainContainer.appendChild(userContainer);
    
    this.scrollToBottom();
  }

  createAssistantMessage(text) {
    const aiContainer = document.createElement('div');
    aiContainer.className = 'ai_content_container';
    
    // Create alsie avatar element with proper ID
    const alsieAvatar = document.createElement('div');
    alsieAvatar.id = 'alsie-avatar';
    alsieAvatar.className = 'alsie-avatar';
    
    const aiBubble = document.createElement('div');
    aiBubble.className = 'ai_bubble';
    
    const aiText = document.createElement('div');
    aiText.className = 'ai_text w-richtext';
    
    // Parse markdown to HTML
    try {
      if (typeof marked !== 'undefined') {
        marked.setOptions({
          breaks: true,
          gfm: true,
          sanitize: false
        });
        
        aiText.innerHTML = marked.parse(text);
        
        // Add syntax highlighting if available
        if (typeof Prism !== 'undefined') {
          aiText.querySelectorAll('pre code').forEach((block) => {
            Prism.highlightElement(block);
          });
        }
      } else {
        console.warn('Marked library not loaded, displaying plain text');
        aiText.textContent = text;
      }
    } catch (error) {
      console.error('Error parsing markdown:', error);
      aiText.textContent = text;
    }
    
    aiBubble.appendChild(aiText);
    aiContainer.appendChild(alsieAvatar);
    aiContainer.appendChild(aiBubble);
    this.elements.mainContainer.appendChild(aiContainer);
    
    this.setupCodeBlocks(aiContainer);
    this.scrollToBottom();
    
    return aiText; // Return reference for streaming updates
  }

  setupCodeBlocks(container) {
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

  scrollToBottom() {
    this.elements.mainContainer.scrollTop = this.elements.mainContainer.scrollHeight;
  }

  // ============================================================================
  // STREAMING FUNCTIONS
  // ============================================================================

  async handleStudentSubmit(event) {
    event.preventDefault();
    
    const userInputValue = this.elements.userInput.value.trim();
    
    if (!userInputValue) {
      return;
    }

    try {
      // 1. Add user message to chat
      this.createUserMessage(userInputValue);
      
      // 2. Reset form
      this.elements.userInput.value = '';
      
      // 3. Create AI message container for streaming
      this.appState.currentStreamingMessage = this.createAssistantMessage('');
      
      // 4. Set loading state to TRUE (start avatar rotation)
      this.setUILoadingState(true);
      
      // 5. Start streaming
      await this.startStreamingResponse(userInputValue);
      
    } catch (error) {
      console.error('Error handling chat submit:', error);
      this.setUILoadingState(false);
      // TODO: Add proper error handling UI
    }
  }

  
async startStreamingResponse(userInput) {
  try {
    const params = new URLSearchParams({
      ub_id: this.appState.ubId,
      input: userInput
    });
    
    const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/ub_chat_stream?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Streaming API failed: ${response.status} ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let isFirstChunk = true;
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      // Add debugging to see raw bytes
      console.log('Raw bytes received:', value);
      console.log('Byte length:', value?.byteLength);
      
      if (done) {
        console.log('Stream completed');
        break;
      }
      
      let chunk = '';
      try {
        chunk = decoder.decode(value, { stream: true });
        console.log('Decoded chunk:', JSON.stringify(chunk));
        console.log('Chunk length:', chunk.length);
      } catch (decodeError) {
        console.error('Decode error:', decodeError);
        // Try to decode without stream flag to see what happens
        try {
          const fallback = decoder.decode(value, { stream: false });
          console.log('Fallback decode:', fallback);
          chunk = fallback; // Use fallback if it works
        } catch (e) {
          console.error('Fallback also failed:', e);
          continue; // Skip this iteration if decoding completely fails
        }
      }
      
      // Add decoded chunk to buffer
      buffer += chunk;
      
      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6); // Remove 'data: ' prefix
          if (data.trim()) { // Only process non-empty data
            accumulatedText += data;
            // Update the streaming message
            this.updateStreamingMessage(accumulatedText);
          }
        }
      }
      
      // Mark first chunk processed
      if (isFirstChunk) {
        isFirstChunk = false;
      }
    }
    
    // Final update after stream completion
    this.appState.currentStreamingRawText = accumulatedText;
    this.finalizeStreamingMessage();
    
    // IMPORTANT: Set loading state to FALSE when streaming is completely done
    this.setUILoadingState(false);
    
  } catch (error) {
    console.error('Error during streaming:', error);
    this.setUILoadingState(false);
    // TODO: Add proper error handling UI
  }
}

  updateStreamingMessage(text) {
    if (this.appState.currentStreamingMessage) {
      try {
        if (typeof marked !== 'undefined') {
          marked.setOptions({
            breaks: true,
            gfm: true,
            sanitize: false
          });
          
          this.appState.currentStreamingMessage.innerHTML = marked.parse(text);
          
          // Add syntax highlighting if available
          if (typeof Prism !== 'undefined') {
            this.appState.currentStreamingMessage.querySelectorAll('pre code').forEach((block) => {
              Prism.highlightElement(block);
            });
          }
        } else {
          this.appState.currentStreamingMessage.textContent = text;
        }
      } catch (error) {
        console.error('Error updating streaming message:', error);
        this.appState.currentStreamingMessage.textContent = text;
      }
      
      this.scrollToBottom();
    }
  }

  finalizeStreamingMessage() {
    console.log('Finalizing stream'); // Debug log

    // Final markdown rendering once the complete message is received
    if (this.appState.currentStreamingMessage && this.appState.currentStreamingRawText) {
      const container = this.appState.currentStreamingMessage.closest('.ai_content_container');
      
      // Use the stored raw accumulated text (preserves original newlines and formatting)
      const finalText = this.appState.currentStreamingRawText;
      
      console.log('Final raw text for rendering:', JSON.stringify(finalText)); // Debug log
      
      // Re-render the complete message with proper markdown parsing
      try {
        if (typeof marked !== 'undefined' && finalText) {
          marked.setOptions({
            breaks: true, // Ensure line breaks are preserved
            gfm: true,
            sanitize: false
          });
          
          // Clear and re-render with the original raw text (no additional processing needed)
          this.appState.currentStreamingMessage.innerHTML = marked.parse(finalText);
          
          // Add syntax highlighting for the final render
          if (typeof Prism !== 'undefined') {
            console.log('prism');
            this.appState.currentStreamingMessage.querySelectorAll('pre code').forEach((block) => {
              Prism.highlightElement(block);
            });
          }
          
          console.log('Final markdown rendering completed for streamed message');
        }
      } catch (error) {
        console.error('Error in final markdown rendering:', error);
        // Fallback: preserve line breaks manually with raw text
        this.appState.currentStreamingMessage.innerHTML = finalText.replace(/\n/g, '<br>');
      }
      
      // Setup code blocks for the final message
      if (container) {
        this.setupCodeBlocks(container);
      }
      
      // Final scroll to bottom
      this.scrollToBottom();
    }
    
    // Stop the avatar rotation
    this.setUILoadingState(false);
    
    // Clear references
    this.appState.currentStreamingMessage = null;
    this.appState.currentStreamingRawText = '';
    this.appState.streamingState = 'idle';
  
     
  }

  // ============================================================================
  // STREAM PAUSE HANDLING
  // ============================================================================

  showStreamPausedIndicator() {
    // Create or update pause indicator
    let pauseIndicator = document.getElementById('stream-pause-indicator');
    
    if (!pauseIndicator) {
      pauseIndicator = document.createElement('div');
      pauseIndicator.id = 'stream-pause-indicator';
      pauseIndicator.className = 'stream-pause-indicator';
      pauseIndicator.innerHTML = `
        <div class="pause-content">
          <div class="pause-spinner"></div>
          <span>Processing...</span>
        </div>
      `;
      
      // Add some basic styling
      pauseIndicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      
      document.body.appendChild(pauseIndicator);
    }
    
    pauseIndicator.style.display = 'flex';
    console.log('Stream pause indicator shown');
  }

  hideStreamPausedIndicator() {
    const pauseIndicator = document.getElementById('stream-pause-indicator');
    if (pauseIndicator) {
      pauseIndicator.style.display = 'none';
    }
    console.log('Stream pause indicator hidden');
  }

  // ============================================================================
  // UI STATE MANAGEMENT
  // ============================================================================

  setUILoadingState(isLoading) {
    if(!isLoading) {console.log('update ui state with false');}
  const { userInput, chatInputContainer, submitButton, waitingBubble } = this.elements;
  
  if (isLoading) {
    // Disable input controls
    //userInput.style.opacity = '0.5';
    //userInput.disabled = true;
    chatInputContainer.className = 'chat-input-container-disabled';
    submitButton.className = 'icon-button-disabled';
    //waitingBubble.style.display = 'flex';
  } else {
    // Enable input controls
    userInput.style.opacity = '1';
    userInput.disabled = false;
    chatInputContainer.className = 'chat-input-container';
    submitButton.className = 'icon-button';
    //waitingBubble.style.display = 'none';
  }

  // Handle alsie-avatar rotation for the current streaming message
  if (this.appState.currentStreamingMessage) {
    // Find the container that holds the current streaming message
    const messageContainer = this.appState.currentStreamingMessage.closest('.ai_content_container');
    
    if (messageContainer) {
      // Find the alsie-avatar within this specific message container
      const alsieAvatar = messageContainer.querySelector('.alsie-avatar');
      
      if (alsieAvatar) {
        console.log('alsie avalar found');
        if (isLoading) {
          // Set avatar to rotating state
          alsieAvatar.className = 'alsie-avatar rotating';
        } else {
          // Set avatar back to normal state
          alsieAvatar.className = 'alsie-avatar';
        }
      }
    }
  }
}

}
