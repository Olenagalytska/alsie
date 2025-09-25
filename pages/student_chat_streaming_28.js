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

  // ============================================================================
// IMPROVED STREAMING FUNCTIONS - Replace the existing streaming section
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
    
    // 3. Create AI message container for streaming (empty initially)
    this.appState.currentStreamingMessage = this.createStreamingAssistantMessage();
    
    // 4. Set loading state (starts avatar rotation)
    this.setUILoadingState(true);
    
    // 5. Start streaming
    await this.startStreamingResponse(userInputValue);
    
  } catch (error) {
    console.error('Error handling chat submit:', error);
    this.handleStreamingError(error);
  }
}

// Create a streaming-specific assistant message
createStreamingAssistantMessage() {
  const aiContainer = document.createElement('div');
  aiContainer.className = 'ai_content_container';
  
  // Create alsie avatar element with rotating class
  const alsieAvatar = document.createElement('div');
  alsieAvatar.id = 'alsie-avatar-streaming'; // Unique ID for streaming avatar
  alsieAvatar.className = 'alsie-avatar rotating'; // Start with rotating
  
  const aiBubble = document.createElement('div');
  aiBubble.className = 'ai_bubble';
  
  const aiText = document.createElement('div');
  aiText.className = 'ai_text w-richtext streaming-text'; // Add streaming class for styling
  aiText.innerHTML = '<span class="streaming-cursor">▊</span>'; // Optional: blinking cursor
  
  aiBubble.appendChild(aiText);
  aiContainer.appendChild(alsieAvatar);
  aiContainer.appendChild(aiBubble);
  this.elements.mainContainer.appendChild(aiContainer);
  
  this.scrollToBottom();
  
  return { textElement: aiText, avatarElement: alsieAvatar, containerElement: aiContainer };
}

async startStreamingResponse(userInput) {
  const streamState = {
    accumulatedText: '',
    buffer: '',
    isComplete: false,
    hasError: false,
    pauseDetected: false,
    lastChunkTime: Date.now()
  };

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
    
    // Start pause detection timer
    const pauseCheckInterval = setInterval(() => {
      const timeSinceLastChunk = Date.now() - streamState.lastChunkTime;
      if (timeSinceLastChunk > 3000 && !streamState.isComplete && !streamState.pauseDetected) {
        streamState.pauseDetected = true;
        this.handleStreamPause();
      }
    }, 1000);
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          streamState.isComplete = true;
          console.log('Stream completed successfully');
          break;
        }
        
        // Update last chunk time
        streamState.lastChunkTime = Date.now();
        if (streamState.pauseDetected) {
          streamState.pauseDetected = false;
          this.handleStreamResume();
        }
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Add to buffer for SSE processing
        streamState.buffer += chunk;
        
        // Process complete SSE lines
        const lines = streamState.buffer.split('\n');
        streamState.buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            
            // Check for special SSE messages
            if (data === '[DONE]') {
              streamState.isComplete = true;
              break;
            }
            
            if (data) {
              // Accumulate text
              streamState.accumulatedText += data;
              
              // Update display with plain text during streaming
              this.updateStreamingDisplay(streamState.accumulatedText);
            }
          } else if (line.startsWith('event: ')) {
            // Handle special events if your API sends them
            const event = line.substring(7).trim();
            this.handleStreamEvent(event, streamState);
          }
        }
        
        if (streamState.isComplete) break;
      }
    } finally {
      clearInterval(pauseCheckInterval);
    }
    
    // Process any remaining buffer
    if (streamState.buffer && streamState.buffer.trim()) {
      if (streamState.buffer.startsWith('data: ')) {
        const data = streamState.buffer.substring(6).trim();
        if (data && data !== '[DONE]') {
          streamState.accumulatedText += data;
        }
      }
    }
    
    // Finalize the message with full markdown rendering
    this.finalizeStreamingMessage(streamState.accumulatedText);
    
  } catch (error) {
    console.error('Error during streaming:', error);
    streamState.hasError = true;
    this.handleStreamingError(error);
  }
}

// Update display with plain text (no markdown parsing during streaming)
updateStreamingDisplay(text) {
  if (!this.appState.currentStreamingMessage) return;
  
  const { textElement } = this.appState.currentStreamingMessage;
  
  // Display as plain text with preserved line breaks during streaming
  // This avoids expensive markdown parsing on every update
  const escapedText = this.escapeHtml(text);
  textElement.innerHTML = escapedText.replace(/\n/g, '<br>') + '<span class="streaming-cursor">▊</span>';
  
  this.scrollToBottom();
}

// Final markdown rendering when streaming is complete
finalizeStreamingMessage(finalText) {
  console.log('Finalizing stream with full markdown rendering');
  
  if (!this.appState.currentStreamingMessage) return;
  
  const { textElement, avatarElement, containerElement } = this.appState.currentStreamingMessage;
  
  try {
    // Remove streaming cursor
    textElement.innerHTML = '';
    
    // Parse and render the complete markdown
    if (typeof marked !== 'undefined' && finalText) {
      marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false,
        headerIds: false,
        mangle: false
      });
      
      // Render the final markdown
      const renderedHtml = marked.parse(finalText);
      textElement.innerHTML = renderedHtml;
      
      // Apply syntax highlighting to code blocks
      if (typeof Prism !== 'undefined') {
        textElement.querySelectorAll('pre code').forEach((block) => {
          // Detect language if not specified
          const lang = block.className.match(/language-(\w+)/);
          if (lang) {
            Prism.highlightElement(block);
          } else {
            // Try to auto-detect or use plain text
            block.className = 'language-plaintext';
            Prism.highlightElement(block);
          }
        });
      }
      
      // Setup copy buttons for code blocks
      this.setupCodeBlocks(containerElement);
      
    } else {
      // Fallback: display with basic line break preservation
      const escapedText = this.escapeHtml(finalText);
      textElement.innerHTML = escapedText.replace(/\n/g, '<br>');
    }
    
    // Remove streaming-specific classes
    textElement.classList.remove('streaming-text');
    
    // Stop avatar rotation - change to normal alsie-avatar
    avatarElement.className = 'alsie-avatar';
    avatarElement.id = 'alsie-avatar'; // Change to standard ID
    
  } catch (error) {
    console.error('Error in final markdown rendering:', error);
    // Fallback: display raw text
    textElement.textContent = finalText;
  }
  
  // Final UI cleanup
  this.setUILoadingState(false);
  
  // Clear references
  this.appState.currentStreamingMessage = null;
  
  // Final scroll
  this.scrollToBottom();
}

// Handle stream pause (when no data for 3+ seconds)
handleStreamPause() {
  console.log('Stream pause detected');
  
  if (this.appState.currentStreamingMessage) {
    const { avatarElement } = this.appState.currentStreamingMessage;
    // Optionally change avatar state during pause
    avatarElement.className = 'alsie-avatar paused';
  }
  
  // Show pause indicator
  this.showStreamPausedIndicator();
}

// Handle stream resume after pause
handleStreamResume() {
  console.log('Stream resumed');
  
  if (this.appState.currentStreamingMessage) {
    const { avatarElement } = this.appState.currentStreamingMessage;
    // Resume rotation
    avatarElement.className = 'alsie-avatar rotating';
  }
  
  // Hide pause indicator
  this.hideStreamPausedIndicator();
}

// Handle special stream events
handleStreamEvent(event, streamState) {
  console.log('Stream event:', event);
  
  switch(event) {
    case 'pause':
      this.handleStreamPause();
      break;
    case 'resume':
      this.handleStreamResume();
      break;
    case 'error':
      streamState.hasError = true;
      break;
    case 'complete':
      streamState.isComplete = true;
      break;
    default:
      console.log('Unknown stream event:', event);
  }
}

// Handle streaming errors
handleStreamingError(error) {
  console.error('Streaming error:', error);
  
  // Stop loading state
  this.setUILoadingState(false);
  
  // Update the message to show error
  if (this.appState.currentStreamingMessage) {
    const { textElement, avatarElement } = this.appState.currentStreamingMessage;
    
    textElement.innerHTML = `
      <div class="error-message">
        <strong>Error:</strong> Unable to generate response. Please try again.
        <br><small>${error.message}</small>
      </div>
    `;
    
    // Stop avatar rotation and show error state
    avatarElement.className = 'alsie-avatar error';
  }
  
  // Clear references
  this.appState.currentStreamingMessage = null;
  
  // Hide any pause indicators
  this.hideStreamPausedIndicator();
}

// Utility: Escape HTML to prevent XSS during plain text display
escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Updated UI state management for streaming
setUILoadingState(isLoading) {
  const { userInput, chatInputContainer, submitButton } = this.elements;
  
  if (isLoading) {
    // Disable input controls during streaming
    userInput.disabled = true;
    chatInputContainer.className = 'chat-input-container-disabled';
    submitButton.className = 'icon-button-disabled';
    submitButton.disabled = true;
  } else {
    // Re-enable input controls
    userInput.disabled = false;
    chatInputContainer.className = 'chat-input-container';
    submitButton.className = 'icon-button';
    submitButton.disabled = false;
    
    // Focus back on input for next message
    userInput.focus();
  }
}




}
