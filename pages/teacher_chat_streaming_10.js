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
      workflowApiUrl: 'https://workflow-iwo02axf4-toropilja374-gmailcoms-projects.vercel.app'
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
      chatInputContainer: document.getElementById('chat-input-container')
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
    
    this.appState.courseId = this.appState.ubData._lesson._course.id;
    this.appState.lessonId = this.appState.ubData._lesson.id;
    
    await this.setupTeacherPageElements();
    
    this.setupTeacherEventListeners();
    
    await this.loadChatHistory();
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
    
    this.setupBasicNavigation();
    
    document.getElementById('back-button')?.addEventListener('click', () => {
      console.log('back button clicked!');
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

  async handleTeacherSubmit(event) {
    event.preventDefault();
    
    const userInputValue = this.elements.userInput.value.trim();
    
    if (!userInputValue) {
      return;
    }

    try {
      this.createUserMessage(userInputValue);
      
      this.setUILoadingState(true);
      
      this.elements.userInput.value = '';
      
      this.appState.currentStreamingMessage = this.createAssistantMessage('');
      
      await this.startStreamingResponse(userInputValue);
      
    } catch (error) {
      console.error('Error handling chat submit:', error);
      this.setUILoadingState(false);
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

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6);
            
            if (jsonStr === '[DONE]') {
              console.log('Stream done signal received');
              continue;
            }
            
            try {
              const data = JSON.parse(jsonStr);
              
              if (data.text) {
                if (isFirstChunk) {
                  accumulatedText = data.text;
                  isFirstChunk = false;
                } else {
                  accumulatedText = data.text;
                }
                
                this.updateStreamingMessage(accumulatedText);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
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
    this.appState.currentStreamingRawText = '';
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