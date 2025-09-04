// ============================================================================
// STUDENT CHAT FUNCTIONS - student-chat.js
// ============================================================================
// Store this file in your GitHub repo and include it in Webflow

// ============================================================================
// STUDENT CHAT CLASS
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
      lessonId: null
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
      waitingBubble: document.getElementById('waiting-bubble'),
      chatInputContainer: document.getElementById('chat-input-container')
    };
  }

  async initializeStudentChat() {
    // 1. Setup UI
    setupInputFocusHandling(this.elements.userInput);
    
    // 2. Authenticate user
    this.appState.user = await verifyUserAuth();
    
    // 3. Get URL parameters
    this.appState.userId = getUrlParameters('user_id');
    this.appState.blockId = getUrlParameters('block_id');
    
    if (!this.appState.userId || !this.appState.blockId) {
      throw new Error('Required URL parameters are missing: user_id or block_id');
    }
    
    console.log('user_id, block_id:', this.appState.userId, this.appState.blockId);
    
    // 4. Fetch user block data
    this.appState.ubData = await fetchUbData(this.appState.userId, this.appState.blockId);
    this.appState.ubId = this.appState.ubData.id;
    this.appState.courseId = this.appState.ubData._lesson._course.id;
    this.appState.lessonId = this.appState.ubData._lesson.id;
    
    console.log('ubData:', this.appState.ubData);
    
    // 5. Setup page elements
    await this.setupStudentPageElements();
    
    // 6. Setup event listeners
    this.setupStudentEventListeners();
    
    // 7. Load initial chat data
    await refreshChatDisplay(this.appState.ubId, this.elements.mainContainer);
  }

  // ============================================================================
  // STUDENT-SPECIFIC SETUP
  // ============================================================================

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
    setupBlockContent(this.appState.ubData);
    
    // Hide form if block is finished
    if (this.appState.ubData.status === "finished" || this.appState.ubData.status === "blocked") {
      this.elements.form.style.display = "none";
}
  }

  setupStudentNavigation() {
    const { ubData, userId } = this.appState;
    
    // Setup basic lesson navigation
    setupBasicNavigation(ubData, userId, 'student');
    
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

  setupStudentEventListeners() {
    this.elements.submitButton.addEventListener('click', (event) => {
      this.handleStudentSubmit(event);
    });

    // Handle Enter key press in the input field
  this.elements.userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      // Check if Shift+Enter was pressed (for multi-line input)
      if (event.shiftKey) {
        // Allow default behavior (new line)
        return;
      }
      
      // Prevent default Enter behavior (form submission)
      event.preventDefault();
      
      // Trigger the same submit handler
      this.handleStudentSubmit(event);
    }
  });
  }


  // ============================================================================
  // STUDENT EVENT HANDLERS
  // ============================================================================

  async handleStudentSubmit(event) {
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
}

// ============================================================================
// GLOBAL INSTANCE AND INITIALIZATION FUNCTION
// ============================================================================

// Global instance for external access if needed
window.studentChat = null;

// Main initialization function to be called from Webflow
window.initializeStudentChat = async function() {
  window.studentChat = new StudentChat();
  return await window.studentChat.initialize();
};