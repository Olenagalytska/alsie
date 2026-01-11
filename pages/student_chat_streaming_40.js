// ============================================================================
// STUDENT CHAT STREAMING v40 - FIXED VERSION
// ============================================================================
// FIXES:
// 1. Правильний порядок повідомлень: спочатку AI (якщо є initial), потім user → AI
// 2. Підтримка всіх структур answers з різних workflows
// 3. Правильне відображення AI повідомлень без оновлення сторінки
// ============================================================================

class StudentChat {
  constructor() {
    this.elements = {};
    this.appState = {
      ubId: null,
      ubData: null,
      userId: null,
      currentStreamingMessage: null,
      currentStreamingRawText: '',
      selectedFile: null,
      workflowApiUrl: 'https://workflow-61qc9u2fp-toropilja374-gmailcoms-projects.vercel.app'
    };
  }

  async initialize() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      this.appState.userId = urlParams.get('user_id');
      const blockId = urlParams.get('block_id');

      if (!this.appState.userId || !blockId) {
        console.error('Missing user_id or block_id in URL');
        return false;
      }

      await this.fetchUbData(blockId);

      this.initializeElements();
      this.setupEventListeners();
      this.setupNavigationButtons();
      this.setupBasicNavigation();
      this.setupStudentEventListeners();

      await this.loadChatHistory();

      return true;
    } catch (error) {
      console.error('Initialization error:', error);
      return false;
    }
  }

  async fetchUbData(blockId) {
    const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/ub?user_id=${this.appState.userId}&block_id=${blockId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch UB data: ${response.status}`);
    }

    this.appState.ubData = await response.json();
    this.appState.ubId = this.appState.ubData.id;
    console.log('UB Data loaded:', this.appState.ubData);
  }

  initializeElements() {
    this.elements = {
      mainContainer: document.getElementById('main_container'),
      userInput: document.getElementById('user_input'),
      submitButton: document.getElementById('submit_button'),
      chatInputContainer: document.querySelector('.chat-input-container'),
      fileInput: document.getElementById('file_input'),
      attachFile: document.getElementById('attach_file'),
      fileName: document.getElementById('file_name'),
      removeFile: document.getElementById('remove_file')
    };
  }

  setupEventListeners() {
    // File handling setup
    if (this.elements.fileInput) {
      this.elements.fileInput.addEventListener('change', (event) => {
        this.handleFileSelect(event);
      });
    }

    if (this.elements.attachFile) {
      this.elements.attachFile.addEventListener('click', () => {
        this.elements.fileInput?.click();
      });
    }

    if (this.elements.removeFile) {
      this.elements.removeFile.addEventListener('click', () => {
        this.clearSelectedFile();
      });
    }
  }

  setupNavigationButtons() {
    const { ubData, userId } = this.appState;

    document.getElementById('back-button')?.addEventListener('click', () => {
      window.history.back();
    });

    document.getElementById('course-button')?.addEventListener('click', () => {
      if (ubData._block?._lesson?.course_id) {
        window.location.href = `/student/course?user_id=${userId}&course_id=${ubData._block._lesson.course_id}`;
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
    this.elements.submitButton?.addEventListener('click', (event) => {
      this.handleStudentSubmit(event);
    });

    this.elements.userInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.handleStudentSubmit(event);
      }
    });
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.appState.selectedFile = file;
      if (this.elements.fileName) {
        this.elements.fileName.textContent = file.name;
      }
      this.updateFileUI(true);
    }
  }

  clearSelectedFile() {
    this.appState.selectedFile = null;
    if (this.elements.fileInput) {
      this.elements.fileInput.value = '';
    }
    if (this.elements.fileName) {
      this.elements.fileName.textContent = '';
    }
    this.updateFileUI(false);
  }

  updateFileUI(hasFile) {
    if (hasFile) {
      this.elements.attachFile && (this.elements.attachFile.style.display = 'none');
      this.elements.fileName && (this.elements.fileName.style.display = 'block');
      this.elements.removeFile && (this.elements.removeFile.style.display = 'block');
    } else {
      this.elements.attachFile && (this.elements.attachFile.style.display = 'block');
      this.elements.fileName && (this.elements.fileName.style.display = 'none');
      this.elements.removeFile && (this.elements.removeFile.style.display = 'none');
    }
  }

  // ============================================================================
  // CHAT HISTORY LOADING - FIXED VERSION
  // Порядок: 1) workflow_state, 2) AIR, 3) OpenAI thread
  // ============================================================================

  async loadChatHistory() {
    try {
      let hasMessages = false;

      // 1. ПРІОРИТЕТ: workflow_state (нова логіка)
      try {
        const workflowResponse = await fetch(`${this.appState.workflowApiUrl}/chat/${this.appState.ubId}/state`);

        if (workflowResponse.ok) {
          const workflowState = await workflowResponse.json();
          console.log('Workflow state loaded:', workflowState);

          if (workflowState.answers && workflowState.answers.length > 0) {
            this.elements.mainContainer.innerHTML = '';

            // FIX: Обробка різних структур answers з різних workflows
            workflowState.answers.forEach((answer, index) => {
              
              // ============================================================
              // EXAMINATION WORKFLOW: AI питання → User відповідь
              // ============================================================
              if (answer.interviewer_question !== undefined) {
                // Спочатку показуємо питання AI
                if (answer.interviewer_question) {
                  this.createAssistantMessage(answer.interviewer_question);
                }
                // Потім показуємо відповідь студента (якщо є)
                if (answer.answer && answer.answer.trim()) {
                  this.createUserMessage(answer.answer);
                }
                // Follow-up питання (якщо є)
                if (answer.follow_up_question) {
                  this.createAssistantMessage(answer.follow_up_question);
                }
                return; // Переходимо до наступного answer
              }
              
              // ============================================================
              // FILL_GAPS / ANALOGOUS WORKFLOW: Assignment → Answer → Feedback
              // ============================================================
              if (answer.assignment !== undefined) {
                // Спочатку завдання
                if (answer.assignment) {
                  this.createAssistantMessage(answer.assignment);
                }
                // Відповідь студента
                if (answer.answer && answer.answer.trim()) {
                  this.createUserMessage(answer.answer);
                }
                // Feedback від tutor
                if (answer.tutor_response) {
                  this.createAssistantMessage(answer.tutor_response);
                }
                return;
              }
              
              // ============================================================
              // STANDARD WORKFLOWS (Custom, Reflection): User → AI
              // ============================================================
              const userMessage = answer.user_message || null;
              const aiResponse = 
                answer.assistant_response ||  // CustomWorkflow
                answer.coach_response ||      // ReflectionWorkflow
                answer.tutor_response ||      // Інші workflows
                null;

              // User message спочатку
              if (userMessage && userMessage.trim()) {
                this.createUserMessage(userMessage);
              }
              // AI response потім
              if (aiResponse) {
                this.createAssistantMessage(aiResponse);
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

      // 2. FALLBACK: AIR таблиця (стара логіка)
      if (!hasMessages) {
        try {
          const airResponse = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/air?ub_id=${this.appState.ubId}`);

          if (airResponse.ok) {
            const airData = await airResponse.json();
            console.log('AIR data loaded:', airData);

            if (airData && airData.length > 0) {
              this.elements.mainContainer.innerHTML = '';

              airData.forEach(item => {
                // Parse user content
                if (item.user_content) {
                  let userText = '';
                  try {
                    const userContent = typeof item.user_content === 'string' 
                      ? JSON.parse(item.user_content) 
                      : item.user_content;
                    userText = userContent.text || userContent;
                  } catch (e) {
                    userText = item.user_content;
                  }
                  if (userText && typeof userText === 'string') {
                    this.createUserMessage(userText);
                  }
                }

                // Parse AI content
                if (item.ai_content) {
                  let aiTexts = [];
                  try {
                    aiTexts = typeof item.ai_content === 'string' 
                      ? JSON.parse(item.ai_content) 
                      : item.ai_content;
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

      // 3. LEGACY FALLBACK: OpenAI thread
      if (!hasMessages && this.appState.ubData.thread_id) {
        try {
          const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/l_messages?thread_id=${this.appState.ubData.thread_id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (response.ok) {
            const messages = await response.json();
            console.log('Messages loaded from OpenAI thread:', messages);

            if (messages && messages.length > 0) {
              this.elements.mainContainer.innerHTML = '';
              
              // OpenAI messages приходять newest first, тому reverse
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

    const aiAvatar = document.createElement('div');
    aiAvatar.className = 'alsie-avatar';

    const aiBubble = document.createElement('div');
    aiBubble.className = 'ai_bubble';

    const aiText = document.createElement('div');
    aiText.className = 'ai_text';
    
    // FIX: Якщо текст порожній (для streaming), залишаємо порожнім
    // Якщо текст є, рендеримо через marked
    if (text && text.trim()) {
      if (typeof marked !== 'undefined') {
        marked.setOptions({ breaks: true, gfm: true, sanitize: false });
        aiText.innerHTML = marked.parse(text);
      } else {
        aiText.textContent = text;
      }
    }

    aiBubble.appendChild(aiText);
    aiContainer.appendChild(aiAvatar);
    aiContainer.appendChild(aiBubble);
    this.elements.mainContainer.appendChild(aiContainer);

    this.setupCodeBlocks(aiContainer);
    this.scrollToBottom();

    return aiText; // Повертаємо для streaming
  }

  setupCodeBlocks(container) {
    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const copyButton = document.createElement('button');
      copyButton.className = 'copy-code-button';
      copyButton.textContent = 'Copy';

      block.parentNode.insertBefore(wrapper, block.parentNode.firstChild);
      wrapper.appendChild(copyButton);

      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(block.textContent).then(() => {
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
  // STREAMING FUNCTIONS - FIXED
  // ============================================================================

  async handleStudentSubmit(event) {
    event.preventDefault();

    const userInputValue = this.elements.userInput.value.trim();

    if (!userInputValue) {
      return;
    }

    try {
      // 1. Показуємо user message
      this.createUserMessage(userInputValue);

      // 2. Очищаємо input
      this.elements.userInput.value = '';

      // 3. Створюємо AI message container для streaming
      this.appState.currentStreamingMessage = this.createAssistantMessage('');

      // 4. Встановлюємо loading state
      this.setUILoadingState(true);

      // 5. Запускаємо streaming
      await this.startWorkflowStreaming(userInputValue);

    } catch (error) {
      console.error('Error handling chat submit:', error);
      this.setUILoadingState(false);

      // FIX: Показуємо помилку в AI bubble
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

      // FIX: Зберігаємо текст і фіналізуємо
      this.appState.currentStreamingRawText = accumulatedText;
      this.finalizeStreamingMessage();
      
      // FIX: Обов'язково вимикаємо loading state
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
          marked.setOptions({ breaks: true, gfm: true, sanitize: false });
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

      console.log('Final raw text for rendering:', JSON.stringify(finalText.substring(0, 100)));

      try {
        if (typeof marked !== 'undefined' && finalText) {
          marked.setOptions({ breaks: true, gfm: true, sanitize: false });
          this.appState.currentStreamingMessage.innerHTML = marked.parse(finalText);

          if (typeof Prism !== 'undefined') {
            this.appState.currentStreamingMessage.querySelectorAll('pre code').forEach((block) => {
              Prism.highlightElement(block);
            });
          }

          console.log('Final markdown rendering completed');
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

    // FIX: Завжди вимикаємо loading state
    this.setUILoadingState(false);

    // Очищаємо state
    this.appState.currentStreamingMessage = null;
    this.appState.currentStreamingRawText = '';
  }

  setUILoadingState(isLoading) {
    if (!isLoading) {
      console.log('Update UI state: loading = false');
    }

    const { userInput, chatInputContainer, submitButton } = this.elements;

    if (isLoading) {
      chatInputContainer.className = 'chat-input-container-disabled';
      submitButton.className = 'icon-button-disabled';
      userInput.disabled = true;
    } else {
      userInput.style.opacity = '1';
      userInput.disabled = false;
      chatInputContainer.className = 'chat-input-container';
      submitButton.className = 'icon-button';
    }

    // Avatar rotation
    if (this.appState.currentStreamingMessage) {
      const messageContainer = this.appState.currentStreamingMessage.closest('.ai_content_container');

      if (messageContainer) {
        const alsieAvatar = messageContainer.querySelector('.alsie-avatar');

        if (alsieAvatar) {
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

// Global initialization
window.studentChat = null;

window.initializeStudentChat = async function() {
  window.studentChat = new StudentChat();
  return await window.studentChat.initialize();
};