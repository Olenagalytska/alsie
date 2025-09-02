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
    document.getElementById('back-button')?.addEventListener('click', () => {
  console.log('course home clicked!');
  
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