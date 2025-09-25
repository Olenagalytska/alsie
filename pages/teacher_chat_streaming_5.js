// ============================================================================
// TEACHER CHAT CLASS WITH STREAMING - UPDATED VERSION
// ============================================================================

class TeacherChat {
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
      await this.initializeTeacherChat();
      return true;
    } catch (error) {
      console.error('Failed to initialize teacher chat:', error);
      return false;
    }
  }

  setupDOMElements() {
    this.elements = {
      form: document.getElementById('chat-form'),
      mainContainer: document.getElementById('main-container'),
      userInput: document.getElementById('user-input'),
      submitButton: document.getElementById('submit-button'),
      generateButton: document.getElementById('generate-button'),
      
      chatInputContainer: document.getElementById('chat-input-container')
    };
  }

  async initializeTeacherChat() {
    // 1. Setup UI
    this.setupInputFocusHandling();
    
    // 2. Authenticate user
    this.appState.user = await verifyUserAuth();
    
    // 3. Get URL parameters
    const userId = getUrlParameters('user_id');
    const blockId = getUrlParameters('block_id');
    const ubId = getUrlParameters('ub_id');
    
    // 4. Determine which scenario we're in and fetch data accordingly
    if (ubId) {
        // Scenario 1: We have ub_id - fetch data directly by ub_id
        console.log('Fetching by ub_id:', ubId);
        this.appState.ubData = await fetchUbDataById(ubId);
        this.appState.ubId = this.appState.ubData.id;
        this.appState.userId = this.appState.ubData.user_id;
        this.appState.blockId = this.appState.ubData.block_id;
    } else if (userId && blockId) {
        // Scenario 2: We have user_id and block_id - fetch or create ub record
        console.log('Fetching by user_id and block_id:', userId, blockId);
        this.appState.ubData = await fetchUbDataByUserAndBlock(userId, blockId);
        this.appState.ubId = this.appState.ubData.id;
        this.appState.userId = userId;
        this.appState.blockId = blockId;
    } else {
        throw new Error('Invalid URL parameters: provide either ub_id OR both user_id and block_id');
    }
    
    // Extract course and lesson IDs from the response
    this.appState.courseId = this.appState.ubData._lesson._course.id;
    this.appState.lessonId = this.appState.ubData._lesson.id;
    
    console.log('Initialized with:', {
        ubId: this.appState.ubId,
        userId: this.appState.userId,
        blockId: this.appState.blockId,
        courseId: this.appState.courseId,
        lessonId: this.appState.lessonId
    });
    
    // 5. Setup page elements
    await this.setupTeacherPageElements();
    
    // 6. Setup event listeners
    this.setupTeacherEventListeners();
    
    // 7. Load initial chat messages (NEW: Using streaming approach)
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

  async setupTeacherPageElements() {
    // Set element names for navigation
    await setElementNames({
      course_id: this.appState.courseId,
      lesson_id: this.appState.lessonId,
      block_id: this.appState.blockId,
      user_id: this.appState.userId
    });
    
    // Setup navigation
    this.setupTeacherNavigation();
    
    // Setup block content
    this.setupBlockContent();
    
    // Hide form if block is finished
    if (this.appState.ubData.status === "finished") {
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

  setupTeacherNavigation() {
    const { ubData, userId } = this.appState;
    
    // Setup basic lesson navigation (teacher version)
    this.setupBasicNavigation();
    
    // Setup teacher-specific navigation
    document.getElementById('back-button')?.addEventListener('click', () => {
      console.log('back button clicked!');
      
      let url;
      if (ubData.type === "student") {
        url = `/teacher/course-progress?course_id=${ubData._lesson._course.id}&lesson_id=${ubData.lesson_id}`;
      } else if (ubData.type === "manual_test") {
        url = `/teacher/course-testing?course_id=${ubData._lesson._course.id}&lesson_id=${ubData.lesson_id}`;
      } else {
        // fallback - you might want to handle other types or set a default
        url = `/teacher/course-progress?course_id=${ubData._lesson._course.id}&lesson_id=${ubData.lesson_id}`;
      }
      
      window.location.href = url;
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
          window.location.href = `/teacher/lesson-page-teacher-view?user_id=${userId}&block_id=${ubData._block.prev_id}`;
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
          window.location.href = `/teacher/lesson-page-teacher-view?user_id=${userId}&block_id=${ubData._block.next_id}`;
        } else {
          console.error('No next lesson available');
        }
      });
    }
  }

  setupTeacherEventListeners() {
    this.elements.submitButton.addEventListener('click', (event) => {
      this.handleTeacherSubmit(event);
    });

    // Handle Enter key press in the input field
    this.elements.userInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        // Check if Shift+Enter was pressed (for multi-line input)
        if (event.shiftKey) {
          return;
        }
        
        event.preventDefault();
        this.handleTeacherSubmit(event);
      }
    });
    
    // Setup generate button if it exists
    if (this.elements.generateButton) {
      this.elements.generateButton.addEventListener('click', () => {
        this.handleGenerateResponse();
      });
    }
  }

  // ============================================================================
  // MESSAGE LOADING FUNCTIONS (COPIED FROM STUDENT CHAT)
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
  // MESSAGE DISPLAY FUNCTIONS (COPIED FROM STUDENT CHAT)
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
  // STREAMING FUNCTIONS (COPIED FROM STUDENT CHAT)
  // ============================================================================

  async handleTeacherSubmit(event) {
    event.preventDefault();
    
    const userInputValue = this.elements.userInput.value.trim();
    
    if (!userInputValue) {
      return;
    }

    try {
      // 1. Add user message to chat
      this.createUserMessage(userInputValue);
      
      // 2. Set loading state
      this.setUILoadingState(true);
      
      // 3. Reset form
      this.elements.userInput.value = '';
      
      // 4. Create AI message container for streaming
      this.appState.currentStreamingMessage = this.createAssistantMessage('');
      
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
        
        if (done) {
          console.log('Stream completed');
          break;
        }

        // Hide waiting bubble on first chunk
        if (isFirstChunk) {
          this.setUILoadingState(false);
          isFirstChunk = false;
        }

        // Decode chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
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
      }

      // Final update after stream completion
      this.finalizeStreamingMessage();

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
    
    // Clear references
    this.appState.currentStreamingMessage = null;
    this.appState.currentStreamingRawText = '';
    this.appState.streamingState = 'idle';
  }

  // ============================================================================
  // TEACHER-SPECIFIC GENERATE BUTTON FUNCTIONALITY
  // ============================================================================

  async handleGenerateResponse() {
    if (!this.appState.ubId) {
      console.error('UB ID is not available for generating answers.');
      return;
    }
    
    try {
      console.log('sending ub_id', this.appState.ubId);
      
      // Set loading state
      this.setUILoadingState(true);
      
      // Generate response using the old API (keeping this as is for now)
      await generateUserResponse(this.appState.ubId);
      
      // Reset UI state
      this.setUILoadingState(false);
      
      // Refresh chat display using new method
      await this.loadChatHistory();
      
    } catch (error) {
      console.error('Error generating answer:', error);
      this.setUILoadingState(false);
    }
  }

  // ============================================================================
  // UI STATE MANAGEMENT (COPIED FROM STUDENT CHAT)
  // ============================================================================

  setUILoadingState(isLoading) {
    const { userInput, chatInputContainer, submitButton, waitingBubble } = this.elements;
    
    if (isLoading) {
      userInput.style.opacity = '0.5';
      userInput.disabled = true;
      chatInputContainer.className = 'chat-input-container-disabled';
      submitButton.className = 'icon-button-disabled';
      
    } else {
      userInput.style.opacity = '1';
      userInput.disabled = false;
      chatInputContainer.className = 'chat-input-container';
      submitButton.className = 'icon-button';
      
    }
  }
}

// ============================================================================
// GLOBAL INSTANCE AND INITIALIZATION FUNCTION
// ============================================================================

// Global instance for external access if needed
window.teacherChat = null;

// Main initialization function to be called from Webflow
window.initializeTeacherChat = async function() {
  window.teacherChat = new TeacherChat();
  return await window.teacherChat.initialize();
};