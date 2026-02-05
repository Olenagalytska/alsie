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
      workflowApiUrl: 'https://workflow-1hfposbn0-toropilja374-gmailcoms-projects.vercel.app',
      messageIndex: 0
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
    
    if (this.appState.ubData._block.workflow_id) {
      console.log('ChatKit workflow detected:', this.appState.ubData._block.workflow_id);
      await this.initChatKit(this.appState.ubData._block.workflow_id);
      return;
    }
    
    this.setupStudentEventListeners();
    
    await this.loadChatHistory();
  }

  async initChatKit(workflowId) {
    console.log('Initializing ChatKit with workflow:', workflowId);
    
    this.elements.form.style.display = 'none';
    
    const workflowApiUrl = this.appState.workflowApiUrl;
    const ubId = this.appState.ubId;
    const blockId = this.appState.blockId;
    const userId = this.appState.userId;
    
    const isSelfHosted = workflowId === 'self-hosted';
    
    this.elements.mainContainer.innerHTML = `
      <style>
        #chatkit-wrapper {
          width: 100%;
          height: 100%;
          min-height: 100%;
          position: relative;
        }
        #chatkit-widget {
          width: 100%;
          height: 100%;
          display: block;
        }
      </style>
      <div id="chatkit-wrapper">
        <openai-chatkit id="chatkit-widget"></openai-chatkit>
      </div>
    `;
    
    const chatWidget = document.getElementById('chatkit-widget');
    
    if (chatWidget) {
      const themeOptions = {
        theme: {
          colorScheme: 'light',
          radius: 'soft',
          density: 'spacious',
          color: {
            grayscale: {
              hue: 219,
              tint: 1
            },
            accent: {
              primary: '#CAFCEE',
              level: 0
            },
            surface: {
              background: '#D8E1EB',
              foreground: '#F0F5FA'
            }
          },
          typography: {
            baseSize: 16,
            fontFamily: 'Inter, sans-serif',
            fontSources: [
              {
                family: 'Inter',
                src: 'https://rsms.me/inter/font-files/Inter-Regular.woff2',
                weight: 400,
                style: 'normal'
              },
              {
                family: 'Inter',
                src: 'https://rsms.me/inter/font-files/Inter-Medium.woff2',
                weight: 500,
                style: 'normal'
              },
              {
                family: 'Inter',
                src: 'https://rsms.me/inter/font-files/Inter-SemiBold.woff2',
                weight: 600,
                style: 'normal'
              },
              {
                family: 'Inter',
                src: 'https://rsms.me/inter/font-files/Inter-Bold.woff2',
                weight: 700,
                style: 'normal'
              }
            ]
          }
        },
        composer: {
          attachments: {
            enabled: true,
            maxCount: 5,
            maxSize: 10485760
          }
        }
      };
      
      const chatKitPrompts = Array.isArray(this.appState.ubData._block.chatkit_prompts) 
  ? this.appState.ubData._block.chatkit_prompts 
  : [];
const chatKitGreeting = this.appState.ubData._block.chatkit_greeting || 'Start the conversation as you do with real people.';

// Domain key mapping
const DOMAIN_KEYS = {
  'alsie.app': 'domain_pk_6966384300208190964ee06d16b4c4f80f8d0edeb8b578d3',
  'www.alsie.app': 'domain_pk_6966386ed8b48193b96699515d23971c0baf4e46ee97082d',
  'alsie-app.webflow.io': 'domain_pk_68f92d5f959c8190bfd55a86b1f2d6af0c600cbbe67779cf'
};
const domainKey = DOMAIN_KEYS[window.location.hostname] || DOMAIN_KEYS['alsie-app.webflow.io'];

if (isSelfHosted) {
  chatWidget.setOptions({
    ...themeOptions,
    api: {
      url: `${workflowApiUrl}/chatkit?ub_id=${ubId}&block_id=${blockId}&user_id=${userId}`,
      domainKey: domainKey,
      uploadStrategy: {
        type: "direct",
        uploadUrl: `${workflowApiUrl}/chatkit/upload?ub_id=${ubId}&block_id=${blockId}`
      }
    },
    composer: {
      attachments: {
        enabled: true,
        maxCount: 5,
        maxSize: 10485760,
        accept: {
          "image/*": [".png", ".jpg", ".jpeg"],
          "application/pdf": [".pdf"],
          "text/*": [".txt", ".md"]
        }
      }
    },
    startScreen: {
      greeting: chatKitGreeting,
      prompts: chatKitPrompts
    }
  });
  console.log('ChatKit configured for SELF-HOSTED mode (your workflows)');
} else {
  chatWidget.setOptions({
    ...themeOptions,
    api: {
      async getClientSecret(currentClientSecret) {
        if (currentClientSecret) {
          return currentClientSecret;
        }
        
        console.log('Requesting ChatKit session...');
        
        const response = await fetch(`${workflowApiUrl}/chatkit/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow_id: workflowId,
            user_id: `${userId}_${ubId}`
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error('ChatKit session error:', error);
          throw new Error(error.detail || 'Failed to create session');
        }
        
        const data = await response.json();
        console.log('ChatKit session created:', data.session_id);
        return data.client_secret;
      }
    },
    startScreen: {
      greeting: chatKitGreeting,
      prompts: chatKitPrompts
    }
  });
  console.log('ChatKit configured for OPENAI-HOSTED mode (Agent Builder)');
}
      
      console.log('ChatKit options set successfully');
    } else {
      console.error('ChatKit widget element not found');
    }
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
    if (this.elements.form && this.elements.form.parentElement) {
        this.elements.form.parentElement.style.display = 'block';
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
    
    const backButton = document.getElementById('back_to_course');
    backButton?.addEventListener('click', () => {
      window.history.back();
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
    this.elements.submitButton?.addEventListener('click', (event) => {
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

      try {
        const workflowResponse = await fetch(`${this.appState.workflowApiUrl}/chat/${this.appState.ubId}/state`);
        
        if (workflowResponse.ok) {
          const workflowState = await workflowResponse.json();
          console.log('Workflow state loaded:', workflowState);
          
          if (workflowState.answers && workflowState.answers.length > 0) {
            this.elements.mainContainer.innerHTML = '';
            
            const shownAssignments = new Set();
            
            workflowState.answers.forEach((answer, index) => {
              if (answer.user_message) {
                this.createUserMessage(answer.user_message);
              }
              
              if (answer.interviewer_question) {
                this.createAssistantMessage(answer.interviewer_question);
              }
              
              if (answer.tutor_response) {
                this.createAssistantMessage(answer.tutor_response);
              } else if (answer.assignment && !shownAssignments.has(answer.assignment)) {
                this.createAssistantMessage(answer.assignment);
                shownAssignments.add(answer.assignment);
              }
              
              if (answer.coach_response) {
                this.createAssistantMessage(answer.coach_response);
              }
              
              if (answer.assistant_response) {
                this.createAssistantMessage(answer.assistant_response);
              }
              
              if (answer.agent_response) {
                this.createAssistantMessage(answer.agent_response);
              }
              
              if (answer.answer) {
                this.createUserMessage(answer.answer);
              }
            });
            
            hasMessages = true;
            console.log('Chat history loaded from workflow state');
            return;
          }
        }
      } catch (workflowError) {
        console.log('Workflow state not available, trying AIR...', workflowError);
      }

      if (!hasMessages) {
        try {
          const airResponse = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/air?ub_id=${this.appState.ubId}`);
          
          if (airResponse.ok) {
            const airData = await airResponse.json();
            console.log('AIR data loaded:', airData);
            
            if (airData && airData.length > 0) {
              this.elements.mainContainer.innerHTML = '';
              
              airData.forEach(item => {
                if (item.user_content) {
                  let userText = '';
                  try {
                    const userContent = typeof item.user_content === 'string' ? JSON.parse(item.user_content) : item.user_content;
                    userText = userContent.text || userContent;
                  } catch (e) {
                    userText = item.user_content;
                  }
                  if (userText && typeof userText === 'string') {
                    this.createUserMessage(userText);
                  }
                }
                
                if (item.ai_content) {
                  let aiTexts = [];
                  try {
                    aiTexts = typeof item.ai_content === 'string' ? JSON.parse(item.ai_content) : item.ai_content;
                  } catch (e) {
                    aiTexts = [{ text: item.ai_content }];
                  }
                  
                  if (Array.isArray(aiTexts)) {
                    aiTexts.forEach(ai => {
                      if (ai.text) {
                        this.createAssistantMessage(ai.text);
                      }
                    });
                  }
                }
              });
              
              hasMessages = true;
              console.log('Chat history loaded from AIR table');
              return;
            }
          }
        } catch (airError) {
          console.log('AIR data not available, trying OpenAI thread...', airError);
        }
      }

      if (!hasMessages && this.appState.ubData.thread_id) {
        try {
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
              console.log('Chat history loaded from OpenAI thread');
            }
          }
        } catch (threadError) {
          console.log('OpenAI thread not available', threadError);
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

  createUserMessage(text, timestamp = null) {
    const userContainer = document.createElement('div');
    userContainer.className = 'user_content_container';
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header user-header';
    
    const userName = this.appState.user?.name || 'Student';
    const dateTime = timestamp ? new Date(timestamp) : new Date();
    const formattedTime = dateTime.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    messageHeader.innerHTML = `<span class="sender-name">${userName}</span> <span class="message-time">${formattedTime}</span>`;
    
    const userBubble = document.createElement('div');
    userBubble.className = 'user_bubble';
    
    const userContent = document.createElement('div');
    userContent.className = 'user_content';
    userContent.textContent = text;
    
    userBubble.appendChild(userContent);
    userContainer.appendChild(messageHeader);
    userContainer.appendChild(userBubble);
    this.elements.mainContainer.appendChild(userContainer);
    
    this.scrollToBottom();
  }

  createAssistantMessage(text, timestamp = null) {
    const currentIndex = this.appState.messageIndex++;
    
    const aiContainer = document.createElement('div');
    aiContainer.className = 'ai_content_container';
    aiContainer.dataset.messageIndex = currentIndex;
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header ai-header';
    
    const dateTime = timestamp ? new Date(timestamp) : new Date();
    const formattedTime = dateTime.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric', 
      hour: '2-digit',
      minute: '2-digit'
    });
    
    messageHeader.innerHTML = `<span class="sender-name">Alsie</span> <span class="message-time">${formattedTime}</span>`;
    
    const alsieAvatar = document.createElement('div');
    alsieAvatar.id = 'alsie-avatar';
    alsieAvatar.className = 'alsie-avatar';
    
    const aiBubble = document.createElement('div');
    aiBubble.className = 'ai_bubble';
    
    const aiText = document.createElement('div');
    aiText.className = 'ai_text';
    
    if (text) {
      if (typeof marked !== 'undefined') {
        marked.setOptions({ breaks: true, gfm: true, sanitize: false });
        aiText.innerHTML = marked.parse(text);
      } else {
        aiText.textContent = text;
      }
    }
    
    const reportButton = document.createElement('button');
    reportButton.className = 'report-button';
    reportButton.textContent = 'Report';
    reportButton.addEventListener('click', () => {
      this.showReportModal(text, currentIndex);
    });
    
    aiBubble.appendChild(aiText);
    aiBubble.appendChild(reportButton);
    aiContainer.appendChild(messageHeader);
    aiContainer.appendChild(alsieAvatar);
    aiContainer.appendChild(aiBubble);
    this.elements.mainContainer.appendChild(aiContainer);
    
    this.scrollToBottom();
    
    return aiText;
  }

  showReportModal(messageText, messageIndex) {
    const overlay = document.createElement('div');
    overlay.className = 'report-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'report-modal';
    modal.innerHTML = `
      <h3>Report this message</h3>
      <textarea placeholder="Add a comment (optional)..." id="report-comment"></textarea>
      <div class="report-modal-buttons">
        <button class="report-cancel-btn">Cancel</button>
        <button class="report-submit-btn">Submit Report</button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    
    modal.querySelector('.report-cancel-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    modal.querySelector('.report-submit-btn').addEventListener('click', async () => {
      const comment = document.getElementById('report-comment').value.trim();
      await this.submitReport(messageText, messageIndex, comment, overlay);
    });
  }

  async submitReport(messageText, messageIndex, comment, overlay) {
    try {
      const reportData = {
        reporter_user_id: this.appState.userId,
        reporter_role: 'student',
        ub_id: this.appState.ubId,
        message_index: messageIndex,
        message_text: messageText.substring(0, 500),
        comment: comment || null,
        chat_type: this.appState.ubData._block.workflow_id ? 'chatkit' : 'workflow',
        thread_id: this.appState.ubData.thread_id || null
      };
      
      const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/message_report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit report');
      }
      
      const modal = overlay.querySelector('.report-modal');
      modal.innerHTML = `
        <div class="report-success">
          <div class="report-success-icon">✓</div>
          <p>Thanks, we got your report!</p>
        </div>
      `;
      
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    }
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