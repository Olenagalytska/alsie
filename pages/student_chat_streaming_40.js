// ============================================================================
// WEBFLOW STUDENT CHAT PAGE SCRIPT - WITH CHATKIT SUPPORT
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
      workflowApiUrl: 'https://workflow-1kvu8i3v8-toropilja374-gmailcoms-projects.vercel.app',
      // ChatKit state
      chatKitEnabled: false,
      chatKitSession: null,
      chatKitClientSecret: null
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
      fileName: document.getElementById('file-name'),
      chatKitContainer: document.getElementById('chatkit-container')
    };
  }

  async initializeStudentChat() {
    this.setupInputFocusHandling();
    
    this.appState.user = await verifyUserAuth();
    this.appState.userId = this.appState.user.id;
    this.appState.blockId = getUrlParameters('block_id');
    
    if (!this.appState.userId || !this.appState.blockId) {
      throw new Error('Required URL parameters are missing: user_id or block_id');
    }

    if (this.appState.user.id != this.appState.userId) {
      console.warn('User ID mismatch detected. Redirecting to home page.');
      window.location.href = '/';
      return;
    }
    
    this.appState.ubData = await fetchUbData(this.appState.userId, this.appState.blockId);
    this.appState.ubId = this.appState.ubData.id;
    this.appState.courseId = this.appState.ubData._lesson._course.id;
    this.appState.lessonId = this.appState.ubData._lesson.id;
    
    await this.setupStudentPageElements();
    
    // Check if ChatKit is enabled for this block
    await this.checkChatKitEnabled();
    
    if (this.appState.chatKitEnabled) {
      console.log('ChatKit enabled for this block');
      await this.initializeChatKit();
    } else {
      console.log('Using standard workflow for this block');
      this.setupStudentEventListeners();
      await this.loadChatHistory();
    }
  }

  // ============================================================================
  // CHATKIT INTEGRATION
  // ============================================================================

  async checkChatKitEnabled() {
    try {
      const response = await fetch(`${this.appState.workflowApiUrl}/chatkit/check/${this.appState.ubId}`);
      if (response.ok) {
        const data = await response.json();
        this.appState.chatKitEnabled = data.chatkit_enabled;
        console.log('ChatKit check:', data);
      }
    } catch (error) {
      console.error('Error checking ChatKit status:', error);
      this.appState.chatKitEnabled = false;
    }
  }

  async initializeChatKit() {
    try {
      // Get ChatKit session from backend
      const response = await fetch(`${this.appState.workflowApiUrl}/chatkit/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ub_id: this.appState.ubId,
          user_id: String(this.appState.userId)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create ChatKit session');
      }

      const sessionData = await response.json();
      this.appState.chatKitSession = sessionData;
      this.appState.chatKitClientSecret = sessionData.client_secret;

      console.log('ChatKit session created:', sessionData.session_id);

      // Initialize ChatKit widget
      this.renderChatKitWidget();

    } catch (error) {
      console.error('Error initializing ChatKit:', error);
      // Fallback to standard workflow
      this.appState.chatKitEnabled = false;
      this.setupStudentEventListeners();
      await this.loadChatHistory();
    }
  }

  renderChatKitWidget() {
    // Hide standard chat form
    if (this.elements.form) {
      this.elements.form.style.display = 'none';
    }

    // Create or show ChatKit container
    let container = this.elements.chatKitContainer;
    if (!container) {
      container = document.createElement('div');
      container.id = 'chatkit-container';
      container.style.cssText = 'width: 100%; height: 600px; border-radius: 12px; overflow: hidden;';
      this.elements.mainContainer.parentNode.insertBefore(container, this.elements.mainContainer.nextSibling);
    }

    // Create ChatKit widget
    const chatKitElement = document.createElement('openai-chatkit');
    chatKitElement.setAttribute('client-secret', this.appState.chatKitClientSecret);
    
    // Optional: customize appearance
    chatKitElement.setAttribute('style', `
      --chatkit-primary-color: #6366f1;
      --chatkit-border-radius: 12px;
    `);

    container.innerHTML = '';
    container.appendChild(chatKitElement);

    // Hide the main container (old chat UI)
    if (this.elements.mainContainer) {
      this.elements.mainContainer.style.display = 'none';
    }

    console.log('ChatKit widget rendered');

    // Listen for ChatKit events
    this.setupChatKitEventListeners(chatKitElement);
  }

  setupChatKitEventListeners(chatKitElement) {
    // Listen for messages to save to Xano
    chatKitElement.addEventListener('message', async (event) => {
      console.log('ChatKit message event:', event.detail);
      
      // Save message to Xano for evaluation later
      if (event.detail && event.detail.role && event.detail.content) {
        await this.saveChatKitMessageToXano(event.detail);
      }
    });

    // Listen for errors
    chatKitElement.addEventListener('error', (event) => {
      console.error('ChatKit error:', event.detail);
    });

    // Listen for session expiry
    chatKitElement.addEventListener('session-expired', async () => {
      console.log('ChatKit session expired, refreshing...');
      await this.refreshChatKitSession();
    });
  }

  async saveChatKitMessageToXano(messageData) {
    try {
      // This saves the conversation to Xano for later evaluation
      const timestamp = Date.now();
      const messageRecord = {
        ub_id: this.appState.ubId,
        created_at: timestamp,
        status: 'new',
        user_content: messageData.role === 'user' 
          ? JSON.stringify({ type: 'text', text: messageData.content, created_at: timestamp })
          : '{}',
        ai_content: messageData.role === 'assistant'
          ? JSON.stringify([{ text: messageData.content, title: '', created_at: timestamp }])
          : '[]',
        prev_id: 0
      };

      await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/add_air', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageRecord)
      });

      console.log('Message saved to Xano');
    } catch (error) {
      console.error('Error saving message to Xano:', error);
    }
  }

  async refreshChatKitSession() {
    try {
      const response = await fetch(`${this.appState.workflowApiUrl}/chatkit/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ub_id: this.appState.ubId,
          user_id: String(this.appState.userId)
        })
      });

      if (response.ok) {
        const sessionData = await response.json();
        this.appState.chatKitSession = sessionData;
        this.appState.chatKitClientSecret = sessionData.client_secret;
        
        // Update the widget
        const chatKitElement = document.querySelector('openai-chatkit');
        if (chatKitElement) {
          chatKitElement.setAttribute('client-secret', sessionData.client_secret);
        }
        
        console.log('ChatKit session refreshed');
      }
    } catch (error) {
      console.error('Error refreshing ChatKit session:', error);
    }
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
    await setElementNames({
      course_id: this.appState.courseId,
      lesson_id: this.appState.lessonId,
      block_id: this.appState.blockId,
      user_id: this.appState.userId
    });
    
    this.setupStudentNavigation();
    this.setupBlockContent();
    
    if (this.appState.ubData.status === "finished" || this.appState.ubData.status === "blocked") {
      this.elements.form.style.display = "none";
    }

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
    
    this.setupBasicNavigation();
    
    document.getElementById('course-name')?.addEventListener('click', () => {
      if (ubData._lesson.course_id) {
        window.location.href = `/course-home-student?course_id=${ubData._lesson.course_id}`;
      }
    });
    
    document.getElementById('course-home')?.addEventListener('click', () => {
      if (ubData._lesson.course_id) {
        window.location.href = `/course-home-student?course_id=${ubData._lesson.course_id}`;
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
        }
      });
    }
  }

  setupStudentEventListeners() {
    this.elements.submitButton.addEventListener('click', (event) => {
      this.handleStudentSubmit(event);
    });

    this.elements.userInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        if (event.shiftKey) return;
        event.preventDefault();
        this.handleStudentSubmit(event);
      }
    });

    this.setupFileUploadListeners();
  }

  // ============================================================================
  // FILE UPLOAD FUNCTIONALITY
  // ============================================================================

  setupFileUploadListeners() {
    this.elements.attachFile?.addEventListener('click', () => {
      this.openFileDialog();
    });

    this.elements.removeFile?.addEventListener('click', () => {
      this.clearSelectedFile();
    });

    this.elements.uploadFile?.addEventListener('click', async () => {
      await this.uploadFile();
    });
  }

  openFileDialog() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        this.handleFileSelected(file);
      }
      document.body.removeChild(fileInput);
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
  }

  handleFileSelected(file) {
    this.appState.selectedFile = file;
    
    if (this.elements.fileName) {
      this.elements.fileName.textContent = file.name;
    }
    
    this.updateFileUploadUI();
    console.log('File selected:', file.name);
  }

  clearSelectedFile() {
    this.appState.selectedFile = null;
    
    if (this.elements.fileName) {
      this.elements.fileName.textContent = '';
    }
    
    this.updateFileUploadUI();
    console.log('File cleared');
  }

  updateFileUploadUI() {
    const hasFile = this.appState.selectedFile !== null;
    
    if (hasFile) {
      if (this.elements.attachFile) this.elements.attachFile.style.display = 'none';
      if (this.elements.fileName) this.elements.fileName.style.display = 'block';
      if (this.elements.removeFile) this.elements.removeFile.style.display = 'block';
    } else {
      if (this.elements.attachFile) this.elements.attachFile.style.display = 'block';
      if (this.elements.fileName) this.elements.fileName.style.display = 'none';
      if (this.elements.removeFile) this.elements.removeFile.style.display = 'none';
    }
  }

  async uploadFile() {
    if (!this.appState.selectedFile) {
      console.warn('No file selected for upload');
      return;
    }

    const userInputValue = this.elements.userInput.value.trim();

    try {
      const formData = new FormData();
      formData.append('user_input', userInputValue);
      formData.append('ub_id', this.appState.ubId);
      formData.append('user_file', this.appState.selectedFile);

      const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/add_air_file', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`File upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('File uploaded successfully:', result);

      this.clearSelectedFile();
      this.elements.userInput.value = '';

    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }

  // ============================================================================
  // MESSAGE LOADING FUNCTIONS
  // ============================================================================

  async loadChatHistory() {
    try {
      // First try to load from workflow_state
      const stateResponse = await fetch(`${this.appState.workflowApiUrl}/chat/${this.appState.ubId}/state`);
      
      if (stateResponse.ok) {
        const stateData = await stateResponse.json();
        console.log('Loaded workflow state:', stateData);
        
        if (stateData.answers && stateData.answers.length > 0) {
          this.displayWorkflowHistory(stateData);
          return;
        }
      }

      // Fallback to AIR messages
      const airResponse = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/air?ub_id=${this.appState.ubId}`);
      
      if (airResponse.ok) {
        const messages = await airResponse.json();
        console.log('Loaded AIR messages:', messages.length);
        
        if (messages && messages.length > 0) {
          this.displayAirHistory(messages);
          return;
        }
      }

      // If no history, check for thread_id (legacy)
      if (this.appState.ubData.thread_id) {
        await this.loadLegacyHistory();
      }

    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  displayWorkflowHistory(stateData) {
    this.elements.mainContainer.innerHTML = '';
    
    for (const answer of stateData.answers) {
      if (answer.user_message) {
        this.createUserMessage(answer.user_message);
      }
      if (answer.assistant_response) {
        this.createAssistantMessage(answer.assistant_response);
      }
    }
    
    this.scrollToBottom();
  }

  displayAirHistory(messages) {
    this.elements.mainContainer.innerHTML = '';
    
    for (const msg of messages) {
      try {
        let userContent = msg.user_content;
        if (typeof userContent === 'string') {
          userContent = JSON.parse(userContent);
        }
        
        let aiContent = msg.ai_content;
        if (typeof aiContent === 'string') {
          aiContent = JSON.parse(aiContent);
        }
        
        if (userContent && userContent.text) {
          this.createUserMessage(userContent.text);
        }
        
        if (aiContent && aiContent.length > 0 && aiContent[0].text) {
          this.createAssistantMessage(aiContent[0].text);
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    }
    
    this.scrollToBottom();
  }

  async loadLegacyHistory() {
    try {
      const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/l_messages?thread_id=${this.appState.ubData.thread_id}`);

      if (!response.ok) return;

      const messages = await response.json();
      this.elements.mainContainer.innerHTML = '';
      
      const sortedMessages = messages.reverse();
      sortedMessages.forEach(message => {
        this.displayMessage(message);
      });

    } catch (error) {
      console.error('Error loading legacy history:', error);
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
    if (!message.content || !Array.isArray(message.content)) {
      return '';
    }

    for (const content of message.content) {
      if (content.type === 'text' && content.text && content.text.value) {
        return content.text.value;
      }
    }

    return '';
  }

  // ============================================================================
  // MESSAGE DISPLAY FUNCTIONS
  // ============================================================================

  createUserMessage(text) {
    const container = document.createElement('div');
    container.className = 'user_content_container';
    
    const bubble = document.createElement('div');
    bubble.className = 'user_bubble';
    
    const content = document.createElement('div');
    content.className = 'user_text';
    content.textContent = text;
    
    bubble.appendChild(content);
    container.appendChild(bubble);
    this.elements.mainContainer.appendChild(container);
    
    this.scrollToBottom();
  }

  createAssistantMessage(text) {
    const container = document.createElement('div');
    container.className = 'ai_content_container';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'alsie-avatar rotating';
    container.appendChild(avatarDiv);
    
    const bubble = document.createElement('div');
    bubble.className = 'ai_bubble';
    
    const content = document.createElement('div');
    content.className = 'ai_text w-richtext';
    
    if (text && typeof marked !== 'undefined') {
      content.innerHTML = marked.parse(text);
    } else {
      content.textContent = text || '';
    }
    
    bubble.appendChild(content);
    container.appendChild(bubble);
    this.elements.mainContainer.appendChild(container);
    
    this.setupCodeBlocks(container);
    this.scrollToBottom();
    
    return content;
  }

  updateStreamingMessage(text) {
    if (this.appState.currentStreamingMessage && typeof marked !== 'undefined') {
      this.appState.currentStreamingMessage.innerHTML = marked.parse(text);
      this.scrollToBottom();
    }
  }

  finalizeStreamingMessage() {
    if (this.appState.currentStreamingMessage) {
      const container = this.appState.currentStreamingMessage.closest('.ai_content_container');
      if (container) {
        this.setupCodeBlocks(container);
      }
    }
    
    this.setUILoadingState(false);
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
    
    if (!userInputValue) return;

    try {
      this.createUserMessage(userInputValue);
      this.elements.userInput.value = '';
      this.appState.currentStreamingMessage = this.createAssistantMessage('');
      this.setUILoadingState(true);
      await this.startWorkflowStreaming(userInputValue);
      
    } catch (error) {
      console.error('Error handling chat submit:', error);
      this.setUILoadingState(false);
      
      if (this.appState.currentStreamingMessage) {
        this.appState.currentStreamingMessage.textContent = 
          'Sorry, there was an error processing your request. Please try again.';
      }
    }
  }

  async startWorkflowStreaming(userInput) {
    try {
      const response = await fetch(`${this.appState.workflowApiUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ub_id: this.appState.ubId,
          content: userInput
        })
      });

      if (!response.ok) {
        throw new Error(`Workflow API failed: ${response.status} ${response.statusText}`);
      }

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

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data.trim()) {
              accumulatedText += data;
              this.updateStreamingMessage(accumulatedText);
            }
          } else if (line.trim()) {
            accumulatedText += line;
            this.updateStreamingMessage(accumulatedText);
          }
        }
      }

      this.appState.currentStreamingRawText = accumulatedText;
      this.finalizeStreamingMessage();

    } catch (error) {
      console.error('Streaming error:', error);
      this.setUILoadingState(false);
      throw error;
    }
  }

  // ============================================================================
  // UI STATE MANAGEMENT
  // ============================================================================

  setUILoadingState(isLoading) {
    const { userInput, chatInputContainer, submitButton } = this.elements;
    
    if (isLoading) {
      chatInputContainer.className = 'chat-input-container-disabled';
      submitButton.className = 'icon-button-disabled';
    } else {
      userInput.style.opacity = '1';
      userInput.disabled = false;
      chatInputContainer.className = 'chat-input-container';
      submitButton.className = 'icon-button';
    }

    if (this.appState.currentStreamingMessage) {
      const messageContainer = this.appState.currentStreamingMessage.closest('.ai_content_container');
      
      if (messageContainer) {
        const alsieAvatar = messageContainer.querySelector('.alsie-avatar');
        
        if (alsieAvatar) {
          alsieAvatar.className = isLoading ? 'alsie-avatar rotating' : 'alsie-avatar';
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
