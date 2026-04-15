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
      selectedFiles: [],
      workflowApiUrl: 'https://workflow-8s88y7isj-toropilja374-gmailcoms-projects.vercel.app',
      messageIndex: 0
    };
    this.currentChatContext = null;
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
      mainContainerChatkit: document.getElementById('main-container-chatkit'),
      userInput: document.getElementById('user-input'),
      submitButton: document.getElementById('submit-button'),
      attachFile: document.getElementById('attach-file-icon'),
      chatInputContainer: document.getElementById('chat-input-container'),
      removeFile: document.getElementById('remove-file-icon'),
      //uploadFile: document.getElementById('upload-file-icon'),
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
    
    this.currentChatContext = {
      ubId: this.appState.ubId,
      threadId: this.appState.ubData?.thread_id,
      userId: this.appState.userId
    };
    
    await this.setupStudentPageElements();

    if (this.appState.ubData._block.workflow_id && this.appState.ubData._block.workflow_id !== 'self-hosted') {
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
    const uniqueSessionId = `${userId}_${ubId}_${blockId}`;

    const configResponse = await fetch(`${workflowApiUrl}/chatkit/config/${ubId}`);
    const config = await configResponse.json();
    const allowMultipleChats = config.allow_multiple_chats ?? true;
    
    let existingThreadId = null;
    try {
      if (isSelfHosted) {
        const threadResponse = await fetch(`${workflowApiUrl}/chatkit/thread/${ubId}`);
        if (threadResponse.ok) {
          const threadData = await threadResponse.json();
          existingThreadId = threadData.thread_id;
          if (existingThreadId) {
            console.log('[ChatKit] Found existing thread_id:', existingThreadId);
          }
        }
      } else {
        const threadResponse = await fetch(`${workflowApiUrl}/chatkit/thread/agent/${uniqueSessionId}`);
        if (threadResponse.ok) {
          const threadData = await threadResponse.json();
          existingThreadId = threadData.thread_id;
          if (existingThreadId) {
            console.log('[ChatKit] Found existing Agent Builder thread_id:', existingThreadId);
          }
        }
      }
    } catch (error) {
      console.log('[ChatKit] No existing thread found:', error);
    }
    this.elements.mainContainer.className = 'chatkit-container';
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
        ${!allowMultipleChats ? `
        openai-chatkit::part(new-thread-button) {
          display: none !important;
        }
        openai-chatkit::part(thread-list-header) button {
          display: none !important;
        }
        openai-chatkit::part(thread-sidebar) {
          display: none !important;
        }
        ` : ''}
      </style>
      <div id="chatkit-wrapper">
        <openai-chatkit 
          id="chatkit-widget"
          ${existingThreadId ? `thread-id="${existingThreadId}"` : ''}
        ></openai-chatkit>
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
            fontFamily: '"Google Sans Display", sans-serif',
            fontSources: [
              {
                family: 'Google Sans Display',
                src: 'https://fonts.gstatic.com/s/googlesansdisplay/v21/ea8FacM9Wef3EJPWRrHjgE4B6CnlZxHVDvr9oS_a.woff2',
                weight: 400,
                style: 'normal'
              },
              {
                family: 'Google Sans Display',
                src: 'https://fonts.gstatic.com/s/googlesansdisplay/v21/ea8FacM9Wef3EJPWRrHjgE4B6CnlZxHVDvv9oQ.woff2',
                weight: 400,
                style: 'normal'
              },
              {
                family: 'Google Sans Display',
                src: 'https://fonts.gstatic.com/s/googlesansdisplay/v21/ea8IacM9Wef3EJPWRrHjgE4B6CnlZxHVBg3etBT7TKx9.woff2',
                weight: 500,
                style: 'normal'
              },
              {
                family: 'Google Sans Display',
                src: 'https://fonts.gstatic.com/s/googlesansdisplay/v21/ea8IacM9Wef3EJPWRrHjgE4B6CnlZxHVBg3etBD7TA.woff2',
                weight: 500,
                style: 'normal'
              },
              {
                family: 'Google Sans Display',
                src: 'https://fonts.gstatic.com/s/googlesansdisplay/v21/ea8IacM9Wef3EJPWRrHjgE4B6CnlZxHVBkXYtBT7TKx9.woff2',
                weight: 700,
                style: 'normal'
              },
              {
                family: 'Google Sans Display',
                src: 'https://fonts.gstatic.com/s/googlesansdisplay/v21/ea8IacM9Wef3EJPWRrHjgE4B6CnlZxHVBkXYtBD7TA.woff2',
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
            url: `${workflowApiUrl}/chatkit?ub_id=${ubId}&block_id=${blockId}&user_id=${userId}&session_id=${uniqueSessionId}`,
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
        
        if (existingThreadId) {
          console.log('[ChatKit] Initialized with existing thread:', existingThreadId);
        }
        
        console.log('ChatKit configured for SELF-HOSTED mode (your workflows)');
        console.log('Unique session ID:', uniqueSessionId);
        console.log('Allow multiple chats:', allowMultipleChats);
      } else {
        chatWidget.setOptions({
          ...themeOptions,
          api: {
            async getClientSecret(currentClientSecret) {
              if (currentClientSecret) {
                return currentClientSecret;
              }

              const cacheKey = `chatkit_session_${uniqueSessionId}`;
              const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
              if (cached && cached.expires_at && Date.now() / 1000 < cached.expires_at - 60) {
                console.log('Using cached ChatKit session');
                return cached.client_secret;
              }

              console.log('Requesting ChatKit session...');

              const response = await fetch(`${workflowApiUrl}/chatkit/session`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  workflow_id: workflowId,
                  user_id: uniqueSessionId,
                  ub_id: String(ubId)
                })
              });

              if (!response.ok) {
                const error = await response.json();
                console.error('ChatKit session error:', error);
                throw new Error(error.detail || 'Failed to create session');
              }

              const data = await response.json();
              localStorage.setItem(cacheKey, JSON.stringify({
                client_secret: data.client_secret,
                expires_at: data.expires_at
              }));
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
        console.log('Unique session ID:', uniqueSessionId);
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
    this.setupAutoResizeTextarea();
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

  // ============================================================================
  // AUTO-RESIZE TEXTAREA
  // ============================================================================

  setupAutoResizeTextarea() {
    const textarea = this.elements.userInput;
    if (!textarea) return;

    textarea.style.overflowY = 'hidden';
    textarea.style.resize = 'none';

    const resize = () => {
      const maxHeight = window.innerHeight * 0.30;
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = newHeight + 'px';
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };

    textarea.addEventListener('input', resize);
    window.addEventListener('resize', resize);
    resize();
  }

  // ============================================================================
  // FILE UPLOAD — MULTIPLE FILES
  // ============================================================================

  setupFileUploadListeners() {
    this.elements.attachFile?.addEventListener('click', () => {
      this.openFileDialog();
    });
  }

  openFileDialog() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (event) => {
      const files = Array.from(event.target.files);
      files.forEach(file => this.addFile(file));
      document.body.removeChild(fileInput);
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
  }

  addFile(file) {
    this.appState.selectedFiles.push(file);
    this.updateFileUploadUI();
    console.log('File added:', file.name);
  }

  removeFile(index) {
    this.appState.selectedFiles.splice(index, 1);
    this.updateFileUploadUI();
    console.log('File removed at index:', index);
  }

  clearAllFiles() {
    this.appState.selectedFiles = [];
    this.updateFileUploadUI();
  }

  updateFileUploadUI() {
    const hasFiles = this.appState.selectedFiles.length > 0;

    if (this.elements.attachFile) {
      this.elements.attachFile.style.display = 'flex';
    }

    if (this.elements.removeFile) {
      this.elements.removeFile.style.display = 'none';
    }
    if (this.elements.fileName) {
      this.elements.fileName.style.display = 'none';
    }

    let fileList = document.getElementById('file-list-container');
    if (!fileList) {
      fileList = document.createElement('div');
      fileList.id = 'file-list-container';
      fileList.className = `file-list-container`;
      
      const container = this.elements.chatInputContainer;
      if (container) {
        container.insertBefore(fileList, container.firstChild);
      }
    }

    fileList.innerHTML = '';

    if (hasFiles) {
      fileList.style.display = 'flex';
      this.appState.selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-name-container';
       

        const name = document.createElement('span');
        name.textContent = file.name;
        name.className = 'chat-input-file-name';
        //name.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'material-symbols-outlined';
        deleteBtn.textContent = 'close';
        deleteBtn.style.cssText = `
          font-size: 18px;
          cursor: pointer;
          color: #8395a3;
          flex-shrink: 0;
          user-select: none;
        `;
        deleteBtn.addEventListener('mouseover', () => deleteBtn.style.color = '#ffffff');
        deleteBtn.addEventListener('mouseout', () => deleteBtn.style.color = '#8395a3');
        deleteBtn.addEventListener('click', () => this.removeFile(index));

        item.appendChild(name);
        item.appendChild(deleteBtn);
        fileList.appendChild(item);
      });
    } else {
      fileList.style.display = 'none';
    }
  }

  
  async uploadFiles() {
    if (this.appState.selectedFiles.length === 0) {
      console.warn('No files selected for upload');
      return;
    }
    

    const userInputValue = this.elements.userInput.value.trim();

    try {
      const uploadedUrls = [];

      for (const file of this.appState.selectedFiles) {
        const formData = new FormData();
        formData.append('user_input', userInputValue);
        formData.append('ub_id', this.appState.ubId);
        formData.append('user_file', file);

        const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/add_air_file', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`File upload failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('File uploaded successfully:', file.name, result);

        const fileUrl = result?.user_content?.file?.url;
        const fileType = result?.user_content?.file?.type;
        const fileName = result?.user_content?.file?.name;

        if (fileUrl) {
          uploadedUrls.push({ url: fileUrl, type: fileType, name: fileName });
        }
      }

      if (uploadedUrls.length > 0 || userInputValue) {
        this.createUserMessage(userInputValue, null, uploadedUrls);
      }

      this.clearAllFiles();
      this.elements.userInput.value = '';
      if (this.elements.userInput) {
        this.elements.userInput.style.height = 'auto';
      }

    } catch (error) {
      console.error('Error uploading files:', error);
    }
  }

  async loadChatHistory() {
    this.historyOffset = 0;
    this.historyLimit = 10;
    this.elements.mainContainer.innerHTML = '';
    await this._fetchAndRenderHistory(0, true);
  }

  async _fetchAndRenderHistory(offset, initial = false) {
    try {
      const url = `${this.appState.workflowApiUrl}/chat/${this.appState.ubId}/state?offset=${offset}&limit=${this.historyLimit}`;
      const response = await fetch(url);
      if (!response.ok) return;

      const data = await response.json();
      if (!data.answers || data.answers.length === 0) return;

      if (data.has_more) {
        this._renderLoadMoreButton(offset + this.historyLimit);
      } else {
        this._removeLoadMoreButton();
      }

      const marker = !initial ? document.createElement('span') : null;
      if (marker) this.elements.mainContainer.appendChild(marker);

      data.answers.forEach((answer) => {
        const ts = answer.timestamp || null;
        if (answer.user_message) {
          this.createUserMessage(answer.user_message, ts, answer.user_files || []);
        }
        if (answer.agent_response) {
          this.createAssistantMessage(answer.agent_response, ts);
        }
      });

      if (marker) {
        const container = this.elements.mainContainer;
        const newNodes = [];
        let node = marker.nextSibling;
        while (node) {
          newNodes.push(node);
          node = node.nextSibling;
        }
        marker.remove();
        const insertBefore = data.has_more ? container.children[1] || null : container.firstChild;
        newNodes.forEach(n => container.insertBefore(n, insertBefore));
      }

      if (initial) {
        console.log(`Chat history loaded: ${data.answers.length}/${data.total}`);
      }

    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  _renderLoadMoreButton(nextOffset) {
    this._removeLoadMoreButton();
    const btn = document.createElement('button');
    btn.id = 'load-more-btn';
    btn.textContent = 'Завантажити ще';
    btn.style.cssText = 'display:block;margin:10px auto;padding:8px 20px;cursor:pointer;';
    btn.addEventListener('click', async () => {
      btn.remove();
      const scrollHeight = this.elements.mainContainer.scrollHeight;
      await this._fetchAndRenderHistory(nextOffset);
      // зберігаємо позицію скролу після вставки старих повідомлень
      this.elements.mainContainer.scrollTop = this.elements.mainContainer.scrollHeight - scrollHeight;
    });
    this.elements.mainContainer.insertBefore(btn, this.elements.mainContainer.firstChild);
  }

  _removeLoadMoreButton() {
    const btn = document.getElementById('load-more-btn');
    if (btn) btn.remove();
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

  createUserMessage(text, timestamp = null, files = []) {
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
    
    if (text) {
      const userContent = document.createElement('div');
      userContent.className = 'user_content';
      userContent.textContent = text;
      userBubble.appendChild(userContent);
    }

    if (files && files.length > 0) {
      files.forEach(file => {
        if (file.type === 'image') {
          const img = document.createElement('img');
          img.src = file.url;
          img.alt = file.name || 'image';
          img.className = 'chat-image';
          img.addEventListener('click', () => window.open(file.url, '_blank'));
          userBubble.appendChild(img);
        } else {
          const fileLink = document.createElement('a');
          fileLink.href = file.url;
          fileLink.target = '_blank';
          fileLink.textContent = `📎 ${file.name}`;
          fileLink.className = 'user_content';
          userBubble.appendChild(fileLink);
        }
      });
    }
    
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
    const hasFiles = this.appState.selectedFiles.length > 0;
    
    if (!userInputValue && !hasFiles) {
      return;
    }

    try {
      let uploadedUrls = [];

      if (hasFiles) {
        for (const file of this.appState.selectedFiles) {
          const formData = new FormData();
          formData.append('user_input', userInputValue);
          formData.append('ub_id', this.appState.ubId);
          formData.append('user_file', file);

          const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/add_air_file', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`File upload failed: ${response.status}`);
          }

          const result = await response.json();
          const fileUrl = result?.user_content?.file?.url;
          const fileType = result?.user_content?.file?.type || file.type;
          const fileName = result?.user_content?.file?.name || file.name;
          const fileData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
          });
          uploadedUrls.push({ url: fileUrl || '', type: fileType, name: fileName, file_data: fileData });
        }

        this.clearAllFiles();
      }

      this.createUserMessage(userInputValue, null, uploadedUrls);

      this.elements.userInput.value = '';
      if (this.elements.userInput) {
        this.elements.userInput.style.height = 'auto';
      }

      if (userInputValue) {
        this.appState.currentStreamingMessage = this.createAssistantMessage('');
        this.setUILoadingState(true);
        await this.startWorkflowStreaming(userInputValue, uploadedUrls);
        if (uploadedUrls.length > 0) {
          try {
            await fetch(`${this.appState.workflowApiUrl}/chat/${this.appState.ubId}/add_files`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ files: uploadedUrls })
            });
          } catch (err) {
            console.error('Error saving files to workflow state:', err);
          }
        }
      }

    } catch (error) {
      console.error('Error handling chat submit:', error);
      this.setUILoadingState(false);
      
      if (this.appState.currentStreamingMessage) {
        this.appState.currentStreamingMessage.textContent = 
          'Sorry, there was an error processing your request. Please try again.';
      }
    }
  }

  async startWorkflowStreaming(userInput, uploadedUrls = []) {
    try {
      const response = await fetch(`${this.appState.workflowApiUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ub_id: this.appState.ubId,
          content: userInput,
          files: uploadedUrls
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
      if (chatInputContainer) chatInputContainer.className = 'chat-input-disabled';
      if (submitButton) submitButton.className = 'icon-button-disabled';
      if (userInput) userInput.style.opacity = '0.5';
      //if (userInput) userInput.disabled = true;
    } else {
      if (userInput) userInput.style.opacity = '1';
      if (userInput) userInput.disabled = false;
      if (chatInputContainer) chatInputContainer.className = 'chat-input-container';
      if (submitButton) submitButton.className = 'icon-button';
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

  clearChat() {
    this.elements.mainContainer.innerHTML = '';
    this.currentChatContext = null;
  }
}

window.studentChat = null;

window.initializeStudentChat = async function() {
  window.studentChat = new StudentChat();
  return await window.studentChat.initialize();
};