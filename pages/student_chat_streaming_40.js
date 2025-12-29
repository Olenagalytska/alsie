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
      currentStreamingRawText: '',
      selectedFile: null,
      workflowApiUrl: 'https://workflow-hw6y4gglz-toropilja374-gmailcoms-projects.vercel.app'
    };
  }

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
    
    this.setupStudentEventListeners();
    
    await this.loadChatHistory();
  }

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

    this.elements.userInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        if (event.shiftKey) {
          return;
        }
        
        event.preventDefault();
        this.handleStudentSubmit(event);
      }
    });

    this.setupFileUploadListeners();
  }

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

  async loadChatHistory() {
    try {
      let hasMessages = false;

      const workflowResponse = await fetch(`${this.appState.workflowApiUrl}/chat/${this.appState.ubId}/state`);
      
      if (workflowResponse.ok) {
        const workflowState = await workflowResponse.json();
        console.log('Workflow state loaded:', workflowState);
        
        if (workflowState.answers && workflowState.answers.length > 0) {
          this.elements.mainContainer.innerHTML = '';
          
          workflowState.answers.forEach(answer => {
            if (answer.user_message) {
              this.createUserMessage(answer.user_message);
            }
            
            const aiResponse = answer.assistant_response || answer.coach_response || answer.tutor_response || answer.assignment;
            if (aiResponse) {
              this.createAssistantMessage(aiResponse);
            }
          });
          
          hasMessages = true;
          console.log('Chat history loaded from workflow state');
          return;
        }
      }

      if (!hasMessages && this.appState.ubData.thread_id) {
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/l_messages?thread_id=${this.appState.ubData.thread_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const messages = await response.json();
          console.log('Messages loaded from OpenAI thread:', messages);

          if (messages && messages.length > 0) {
            this.elements.mainContainer.innerHTML = '';

            const sortedMessages = messages.reverse();

            sortedMessages.forEach(message => {
              this.displayMessage(message);
            });
            
            hasMessages = true;
          }
        }
      }

      if (!hasMessages) {
        console.log('No chat history found');
      }

    } catch (error) {
      console.error('Error loading chat history:', error);
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
          
          textValue = this.parseLegacyMessageFormat(textValue, message.role);
          
          return textValue;
        }
      }
    } catch (error) {
      console.error('Error extracting message text:', error);
    }
    return 'Error displaying message content';
  }

  parseLegacyMessageFormat(textValue, role) {
    if (textValue.trim().startsWith('{')) {
      try {
        if (role === 'assistant') {
          const parsed = JSON.parse(textValue);
          if (parsed.text) {
            console.log('TEMP: Parsed legacy AI message format');
            return parsed.text;
          }
        } else if (role === 'user') {
          let fixedJson = textValue.trim();
          
          if (!fixedJson.endsWith('}')) {
            fixedJson += '}';
          }
          
          fixedJson = fixedJson.replace(/'/g, '"');
          
          const parsed = JSON.parse(fixedJson);
          if (parsed.text) {
            console.log('TEMP: Parsed legacy user message format');
            return parsed.text;
          }
        }
      } catch (jsonError) {
        console.warn('TEMP: Failed to parse legacy JSON format, using raw text:', jsonError);
      }
    }
    
    return textValue;
  }

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
    
    const alsieAvatar = document.createElement('div');
    alsieAvatar.id = 'alsie-avatar';
    alsieAvatar.className = 'alsie-avatar';
    
    const aiBubble = document.createElement('div');
    aiBubble.className = 'ai_bubble';
    
    const aiText = document.createElement('div');
    aiText.className = 'ai_text w-richtext';
    
    try {
      if (typeof marked !== 'undefined') {
        marked.setOptions({
          breaks: true,
          gfm: true,
          sanitize: false
        });
        
        aiText.innerHTML = marked.parse(text);
        
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
    
    return aiText;
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

  async handleStudentSubmit(event) {
    event.preventDefault();
    
    const userInputValue = this.elements.userInput.value.trim();
    
    if (!userInputValue) {
      return;
    }

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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream completed');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        this.updateStreamingMessage(accumulatedText);
      }

      this.appState.currentStreamingRawText = accumulatedText;
      this.finalizeStreamingMessage();
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
    console.log('Finalizing stream');

    if (this.appState.currentStreamingMessage && this.appState.currentStreamingRawText) {
      const container = this.appState.currentStreamingMessage.closest('.ai_content_container');
      
      const finalText = this.appState.currentStreamingRawText;
      
      console.log('Final raw text for rendering:', JSON.stringify(finalText));
      
      try {
        if (typeof marked !== 'undefined' && finalText) {
          marked.setOptions({
            breaks: true,
            gfm: true,
            sanitize: false
          });
          
          this.appState.currentStreamingMessage.innerHTML = marked.parse(finalText);
          
          if (typeof Prism !== 'undefined') {
            this.appState.currentStreamingMessage.querySelectorAll('pre code').forEach((block) => {
              Prism.highlightElement(block);
            });
          }
          
          console.log('Final markdown rendering completed for streamed message');
        }
      } catch (error) {
        console.error('Error in final markdown rendering:', error);
        this.appState.currentStreamingMessage.innerHTML = finalText.replace(/\n/g, '<br>');
      }
      
      if (container) {
        this.setupCodeBlocks(container);
      }
      
      this.scrollToBottom();
    }
    
    this.setUILoadingState(false);
    
    this.appState.currentStreamingMessage = null;
    this.appState.currentStreamingRawText = '';
  }

  setUILoadingState(isLoading) {
    if(!isLoading) {console.log('update ui state with false');}
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
          console.log('alsie avatar found');
          if (isLoading) {
            alsieAvatar.className = 'alsie-avatar rotating';
          } else {
            alsieAvatar.className = 'alsie-avatar';
          }
        }
      }
    }
  }
}

window.studentChat = null;

window.initializeStudentChat = async function() {
  window.studentChat = new StudentChat();
  return await window.studentChat.initialize();
};