// ============================================================================
// WEBFLOW STUDENT CHAT PAGE SCRIPT - WITH VERCEL WORKFLOWS
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
      currentStreamingMessage: null,
      selectedFile: null,
      // НОВЕ: URL вашого Vercel бекенду
      workflowApiUrl: 'https://workflow-mrvm2xiax-toropilja374-gmailcoms-projects.vercel.app' // ЗАМІНІТЬ на ваш URL
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
      attachFile: document.getElementById('attach-file-icon'),
      chatInputContainer: document.getElementById('chat-input-container'),
      removeFile: document.getElementById('remove-file-icon'),
      uploadFile: document.getElementById('upload-file-icon'),
      fileName: document.getElementById('file-name')
    };
  }

  async initializeStudentChat() {
    // 1. Setup UI
    this.setupInputFocusHandling();
    
    // 2. Authenticate user
    this.appState.user = await verifyUserAuth();
    
    // 3. Get URL parameters
    this.appState.userId = this.appState.user.id;
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
    
    // 8. Load initial chat messages - ОНОВЛЕНО: через Xano API
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

    // Initialize file upload UI state
    this.updateFileUploadUI();
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

    // File upload event listeners
    this.setupFileUploadListeners();
  }

  // ============================================================================
  // FILE UPLOAD FUNCTIONALITY - ЗАЛИШАЄТЬСЯ ЯК Є (через Xano)
  // ============================================================================

  setupFileUploadListeners() {
    // Attach file button - opens file dialog
    this.elements.attachFile?.addEventListener('click', () => {
      this.openFileDialog();
    });

    // Remove file button - clears selected file
    this.elements.removeFile?.addEventListener('click', () => {
      this.clearSelectedFile();
    });

    // Upload file button - uploads the file to API
    this.elements.uploadFile?.addEventListener('click', async () => {
      await this.uploadFile();
    });
  }

  openFileDialog() {
    // Create a hidden file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        this.handleFileSelected(file);
      }
      // Remove the temporary input element
      document.body.removeChild(fileInput);
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
  }

  handleFileSelected(file) {
    // Store the selected file in appState
    this.appState.selectedFile = file;
    
    // Display the file name
    if (this.elements.fileName) {
      this.elements.fileName.textContent = file.name;
    }
    
    // Update UI to show file is selected
    this.updateFileUploadUI();
    
    console.log('File selected:', file.name);
  }

  clearSelectedFile() {
    // Clear the selected file
    this.appState.selectedFile = null;
    
    // Clear the file name display
    if (this.elements.fileName) {
      this.elements.fileName.textContent = '';
    }
    
    // Update UI to show no file selected
    this.updateFileUploadUI();
    
    console.log('File cleared');
  }

  updateFileUploadUI() {
    const hasFile = this.appState.selectedFile !== null;
    
    if (hasFile) {
      // Hide attach button, show file name and remove button
      if (this.elements.attachFile) {
        this.elements.attachFile.style.display = 'none';
      }
      if (this.elements.fileName) {
        this.elements.fileName.style.display = 'block';
      }
      if (this.elements.removeFile) {
        this.elements.removeFile.style.display = 'block';
      }
    } else {
      // Show attach button, hide file name and remove button
      if (this.elements.attachFile) {
        this.elements.attachFile.style.display = 'block';
      }
      if (this.elements.fileName) {
        this.elements.fileName.style.display = 'none';
      }
      if (this.elements.removeFile) {
        this.elements.removeFile.style.display = 'none';
      }
    }
  }

  async uploadFile() {
    if (!this.appState.selectedFile) {
      console.warn('No file selected for upload');
      return;
    }

    const userInputValue = this.elements.userInput.value.trim();

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('user_input', userInputValue);
      formData.append('ub_id', this.appState.ubId);
      formData.append('user_file', this.appState.selectedFile);

      // Upload file to API
      const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/add_air_file', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`File upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('File uploaded successfully:', result);

      // Clear the file after successful upload
      this.clearSelectedFile();

      // Optionally clear the user input as well
      this.elements.userInput.value = '';

    } catch (error) {
      console.error('Error uploading file:', error);
      // Handle silently as requested, but log for debugging
    }
  }

  // ============================================================================
  // MESSAGE LOADING FUNCTIONS - ОНОВЛЕНО: через Xano API
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
  // STREAMING FUNCTIONS - ОНОВЛЕНО: через Vercel Workflows
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
      
      // 5. Start streaming - ОНОВЛЕНО: через Vercel workflows
      await this.startWorkflowStreaming(userInputValue);
      
    } catch (error) {
      console.error('Error handling chat submit:', error);
      this.setUILoadingState(false);
      
      // Show error to user
      if (this.appState.currentStreamingMessage) {
        this.appState.currentStreamingMessage.textContent = 
          'Sorry, there was an error processing your request. Please try again.';
      }
    }
  }

  async startWorkflowStreaming(userInput) {
    try {
      // Викликаємо ваш Vercel API
      const response = await fetch(`${this.appState.workflowApiUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ub_id: this.appState.ubId,
          content: userInput
        })
      });

      if (!response.ok) {
        throw new Error(`Workflow API failed: ${response.status} ${response.statusText}`);
      }

      // Read streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream completed');
          break;
        }

        // Decode chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process complete SSE messages (if your Vercel uses SSE format)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          // Adjust this based on your Vercel response format
          if (line.startsWith('data: ')) {
            const data = line.substring(6); // Remove 'data: ' prefix
            if (data.trim()) {
              accumulatedText += data;
              this.updateStreamingMessage(accumulatedText);
            }
          } else if (line.trim()) {
            // If not SSE format, just accumulate the line
            accumulatedText += line;
            this.updateStreamingMessage(accumulatedText);
          }
        }
      }

      // Final update after stream completion
      this.appState.currentStreamingRawText = accumulatedText;
      this.finalizeStreamingMessage();

      // IMPORTANT: Set loading state to FALSE when streaming is completely done
      this.setUILoadingState(false);

    } catch (error) {
      console.error('Error during workflow streaming:', error);
      this.setUILoadingState(false);
      throw error;
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
  }

  // ============================================================================
  // UI STATE MANAGEMENT
  // ============================================================================

  setUILoadingState(isLoading) {
    if(!isLoading) {console.log('update ui state with false');}
    const { userInput, chatInputContainer, submitButton } = this.elements;
    
    if (isLoading) {
      // Disable input controls
      chatInputContainer.className = 'chat-input-container-disabled';
      submitButton.className = 'icon-button-disabled';
    } else {
      // Enable input controls
      userInput.style.opacity = '1';
      userInput.disabled = false;
      chatInputContainer.className = 'chat-input-container';
      submitButton.className = 'icon-button';
    }

    // Handle alsie-avatar rotation for the current streaming message
    if (this.appState.currentStreamingMessage) {
      // Find the container that holds the current streaming message
      const messageContainer = this.appState.currentStreamingMessage.closest('.ai_content_container');
      
      if (messageContainer) {
        // Find the alsie-avatar within this specific message container
        const alsieAvatar = messageContainer.querySelector('.alsie-avatar');
        
        if (alsieAvatar) {
          console.log('alsie avatar found');
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

// ============================================================================
// GLOBAL INITIALIZATION
// ============================================================================

window.studentChat = null;

window.initializeStudentChat = async function() {
  window.studentChat = new StudentChat();
  return await window.studentChat.initialize();
};