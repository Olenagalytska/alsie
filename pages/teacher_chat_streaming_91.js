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
      currentStreamingMessage: null,
      currentStreamingRawText: '',
      workflowApiUrl: 'https://workflow-i8ps0ffq1-toropilja374-gmailcoms-projects.vercel.app',
      studentName: null,
      messageIndex: 0,
      selectedFiles: []
    };
  }

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
      chatInputContainer: document.getElementById('chat-input-container'),
      attachFile: document.getElementById('attach-file-icon'),
      removeFile: document.getElementById('remove-file-icon'),
      fileName: document.getElementById('file-name')
    };
  }

  async initializeTeacherChat() {
    this.setupInputFocusHandling();
    
    this.appState.user = await verifyUserAuth();
    
    const userId = getUrlParameters('user_id');
    const blockId = getUrlParameters('block_id');
    const ubId = getUrlParameters('ub_id');
    
    if (ubId) {
      this.appState.ubData = await fetchUbData(null, null, ubId);
      this.appState.ubId = ubId;
      this.appState.userId = this.appState.ubData.user_id;
      this.appState.blockId = this.appState.ubData.block_id;
    } else if (userId && blockId) {
      this.appState.ubData = await fetchUbData(userId, blockId);
      this.appState.ubId = this.appState.ubData.id;
      this.appState.userId = userId;
      this.appState.blockId = blockId;
    } else {
      throw new Error('Required URL parameters are missing');
    }
    
    try {
      const studentResponse = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/user/${this.appState.userId}`);
      if (studentResponse.ok) {
        const studentData = await studentResponse.json();
        this.appState.studentName = studentData.name || 'Student';
      }
    } catch (e) {
      console.log('Could not fetch student name:', e);
      this.appState.studentName = 'Student';
    }
    
    this.appState.courseId = this.appState.ubData._lesson._course.id;
    this.appState.lessonId = this.appState.ubData._lesson.id;

    await verifyTeacherPermissions(this.appState.user.id, this.appState.courseId);
    
    await this.setupTeacherPageElements();
    
    this.setupTeacherEventListeners();
    
    await this.loadChatHistory();
  }

  setupStudentNavigation() {
    const { ubData, userId } = this.appState;
    
    this.setupBasicNavigation();
    
    const backButton = document.getElementById('back-button');
    backButton?.addEventListener('click', () => {
        window.location.href = `/teacher/course-testing?course_id=${ubData._lesson.course_id}&lesson_id=${ubData._lesson.id}`;
    });
    
    document.getElementById('course-name')?.addEventListener('click', () => {
      if (ubData._lesson.course_id) {
        window.location.href = `/teacher/course-progress?course_id=${ubData._lesson.course_id}&lesson_id=${ubData._lesson.id}`;
      } else {
        console.error('No course home available');
      }
    });
    
    document.getElementById('course-home')?.addEventListener('click', () => {
      if (ubData._lesson.course_id) {
        window.location.href = `/teacher/course-progress?course_id=${ubData._lesson.course_id}&lesson_id=${ubData._lesson.id}`;
      } else {
        console.error('No course home available');
      }
    });
    
    document.getElementById('home-button')?.addEventListener('click', () => {
      window.location.href = `/`;
    });
  
  }

  setupInputFocusHandling() {
    this.elements.userInput.addEventListener('focus', function() {
      this.style.outline = 'none';
      this.style.borderColor = 'transparent';
      this.style.boxShadow = 'none';
    });
  }

  async setupTeacherPageElements() {
    await setElementNames({
      course_id: this.appState.courseId,
      lesson_id: this.appState.lessonId,
      block_id: this.appState.blockId,
      user_id: this.appState.userId
    });
    
    this.setupTeacherNavigation();
    
    this.setupBlockContent();
    
    const dataForm = document.getElementById('data-form');
    if (dataForm) {
      dataForm.style.display = 'block';
    }

    // Show chat form only when teacher is viewing their own test block
    // Hide it when viewing a student's chat (read-only mode)
    // Only hide when we can confirm it's a different user (userId is non-zero and differs from teacher)
    if (this.elements.form) {
      const studentUserId = parseInt(this.appState.userId);
      const teacherId = this.appState.user.id;
      if (studentUserId && studentUserId !== teacherId) {
        this.elements.form.style.display = 'none';
      }
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
    
    this.setupBasicNavigation();
  
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
    this.elements.submitButton?.addEventListener('click', (event) => {
      this.handleTeacherSubmit(event);
    });

    this.elements.userInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        if (event.shiftKey) {
          return;
        }
        
        event.preventDefault();
        this.handleTeacherSubmit(event);
      }
    });
    
    if (this.elements.generateButton) {
      this.elements.generateButton.addEventListener('click', () => {
        this.handleGenerateResponse();
      });
    }

    this.setupFileUploadListeners();
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

  // ============================================================================
  // CHAT HISTORY
  // ============================================================================

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

      if (!data.answers || data.answers.length === 0) {
        if (initial) {
          this.elements.mainContainer.innerHTML = `
            <div style="text-align: center; color: #8395a3; padding: 40px 20px; font-size: 14px;">
              Напишіть повідомлення нижче щоб почати тестування.
            </div>
          `;
        }
        return;
      }

      if (data.has_more) {
        this._renderLoadMoreButton(offset + this.historyLimit);
      } else {
        this._removeLoadMoreButton();
      }

      data.answers.forEach((answer) => {
        const ts = answer.timestamp || null;
        if (answer.user_message) {
          this.createUserMessage(answer.user_message, ts, answer.user_files || []);
        }
        if (answer.agent_response) {
          this.createAssistantMessage(answer.agent_response, ts);
        }
      });

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

  // ============================================================================
  // MESSAGE DISPLAY
  // ============================================================================

  createUserMessage(text, timestamp = null, files = []) {
    const userContainer = document.createElement('div');
    userContainer.className = 'user_content_container';
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header user-header';
    
    const userName = this.appState.studentName || 'Student';
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
    aiText.className = 'ai_text w-richtext';
    
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
    
    this.setupCodeBlocks(aiContainer);
    
    this.scrollToBottom();
    
    return aiText;
  }

  // ============================================================================
  // REPORT MESSAGE
  // ============================================================================

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
        reporter_role: 'teacher',
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

  // ============================================================================
  // CODE BLOCKS & UTILITIES
  // ============================================================================

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
  // TEACHER EVENT HANDLERS
  // ============================================================================

  async handleTeacherSubmit(event) {
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

  // ============================================================================
  // STREAMING
  // ============================================================================

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
      console.error('Error during streaming:', error);
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
  }

  async handleGenerateResponse() {
    if (!this.appState.ubId) {
      console.error('No UB ID available');
      return;
    }
    
    try {
      console.log('sending ub_id', this.appState.ubId);
      
      this.setUILoadingState(true);
      
      await generateUserResponse(this.appState.ubId);
      
      this.setUILoadingState(false);
      
      await this.loadChatHistory();
      
    } catch (error) {
      console.error('Error generating answer:', error);
      this.setUILoadingState(false);
    }
  }

  setUILoadingState(isLoading) {
    const { userInput, chatInputContainer, submitButton } = this.elements;
    
    if (isLoading) {
      if (userInput) userInput.style.opacity = '0.5';
      if (userInput) userInput.disabled = true;
      if (chatInputContainer) chatInputContainer.className = 'chat-input-container-disabled';
      if (submitButton) submitButton.className = 'icon-button-disabled';
    } else {
      if (userInput) userInput.style.opacity = '1';
      if (userInput) userInput.disabled = false;
      if (chatInputContainer) chatInputContainer.className = 'chat-input-container';
      if (submitButton) submitButton.className = 'icon-button';
    }
  }
}

window.teacherChat = null;

window.initializeTeacherChat = async function() {
  window.teacherChat = new TeacherChat();
  return await window.teacherChat.initialize();
};