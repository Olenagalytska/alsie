// ============================================================================
// TEACHER CHAT CLASS
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
      lessonId: null
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
      waitingBubble: document.getElementById('waiting-bubble'),
      chatInputContainer: document.getElementById('chat-input-container')
    };
  }

  async initializeTeacherChat() {
    // 1. Setup UI
    setupInputFocusHandling(this.elements.userInput);
    
    // 2. Authenticate user
    this.appState.user = await verifyUserAuth();
    
    // 3. Get URL parameters
    this.appState.userId = getUrlParameters('user_id');
    this.appState.blockId = getUrlParameters('block_id');
    this.appState.ubId = getUrlParameters('ub_id');
    
    // Check if we have either the required pair OR just ub_id
    if (!this.appState.ubId && (!this.appState.userId || !this.appState.blockId)) {
        throw new Error('Required URL parameters are missing: either ub_id OR both user_id and block_id');
    }
    
    console.log('Initial params - user_id, block_id, ub_id:', this.appState.userId, this.appState.blockId, this.appState.ubId);
    
    // 4. Fetch user block data
    // If we only have ub_id, pass null for the other parameters
    if (this.appState.ubId && (!this.appState.userId || !this.appState.blockId)) {
        this.appState.ubData = await fetchUbData(null, null, this.appState.ubId);
        // Extract the missing parameters from the response
        this.appState.userId = this.appState.ubData.user_id;
        this.appState.blockId = this.appState.ubData.block_id;
    } else {
        // We have user_id and block_id, proceed normally
        this.appState.ubData = await fetchUbData(this.appState.userId, this.appState.blockId, this.appState.ubId);
    }
    
    // Ensure ub_id is set from the response
    this.appState.ubId = this.appState.ubData.id;
    this.appState.courseId = this.appState.ubData._lesson._course.id;
    this.appState.lessonId = this.appState.ubData._lesson.id;
    
    console.log('Final ubData:', this.appState.ubData);
    console.log('Extracted IDs - userId:', this.appState.userId, 'blockId:', this.appState.blockId, 'ubId:', this.appState.ubId);
    
    // 5. Setup page elements
    await this.setupTeacherPageElements();
    
    // 6. Setup event listeners
    this.setupTeacherEventListeners();
    
    // 7. Load initial chat data
    await refreshChatDisplay(this.appState.ubId, this.elements.mainContainer);
}

  // ============================================================================
  // TEACHER-SPECIFIC SETUP
  // ============================================================================

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
    setupBlockContent(this.appState.ubData);
    
    // Hide form if block is finished
    if (this.appState.ubData.status === "finished") {
      this.elements.form.style.display = "none";
    }
  }

  setupTeacherNavigation() {
    const { ubData, userId } = this.appState;
    
    // Setup basic lesson navigation (teacher version)
    setupBasicNavigation(ubData, userId, 'teacher');
    
    // Setup teacher-specific navigation
    document.getElementById('course-home-button')?.addEventListener('click', () => {
      console.log('course home clicked!');
      window.location.href = `/teacher/course-progress?course_id=${ubData._lesson._course.id}`;
    });
    
    document.getElementById('course-name')?.addEventListener('click', () => {
      window.location.href = `/teacher/course-progress?course_id=${ubData._lesson._course.id}`;
    });
  }

  setupTeacherEventListeners() {
    this.elements.submitButton.addEventListener('click', (event) => {
      this.handleTeacherSubmit(event);
    });
    
    // Setup generate button if it exists
    if (this.elements.generateButton) {
      this.elements.generateButton.addEventListener('click', () => {
        this.handleGenerateResponse();
      });
    }
  }

  // ============================================================================
  // TEACHER EVENT HANDLERS
  // ============================================================================

  async handleTeacherSubmit(event) {
    event.preventDefault();
    
    const userInputValue = this.elements.userInput.value.trim();
    
    await handleChatSubmit(
      userInputValue,
      this.appState.ubId,
      this.elements,
      this.elements.mainContainer,
      () => refreshChatDisplay(this.appState.ubId, this.elements.mainContainer)
    );
  }

  async handleGenerateResponse() {
    if (!this.appState.ubId) {
      console.error('UB ID is not available for generating answers.');
      return;
    }
    
    try {
      console.log('sending ub_id', this.appState.ubId);
      
      // Set loading state
      setUILoadingState(true, this.elements);
      
      // Generate response
      await generateUserResponse(this.appState.ubId);
      
      // Reset UI state
      setUILoadingState(false, this.elements);
      
      // Refresh chat display
      await refreshChatDisplay(this.appState.ubId, this.elements.mainContainer);
      
    } catch (error) {
      console.error('Error generating answer:', error);
      setUILoadingState(false, this.elements);
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