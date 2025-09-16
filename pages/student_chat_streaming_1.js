// ============================================================================
// KEY CHANGES FOR AVATAR ROTATION DURING STREAMING
// ============================================================================

// 1. UPDATE createAssistantMessage to fix the avatar creation
createAssistantMessage(text) {
  const aiContainer = document.createElement('div');
  aiContainer.className = 'ai_content_container';
  
  // Create alsie avatar element with proper ID
  const alsieAvatar = document.createElement('div');
  alsieAvatar.id = 'alsie-avatar';  // Add ID here!
  alsieAvatar.className = 'alsie-avatar';
  
  const aiBubble = document.createElement('div');
  aiBubble.className = 'ai_bubble';
  
  const aiText = document.createElement('div');
  aiText.className = 'ai_text w-richtext';
  
  // Parse markdown to HTML
  try {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false
      });
      
      aiText.innerHTML = marked.parse(text);
      
      // Add syntax highlighting if available
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
  
  return aiText; // Return reference for streaming updates
}

// 2. UPDATE handleStudentSubmit to properly manage loading state
async handleStudentSubmit(event) {
  event.preventDefault();
  
  const userInputValue = this.elements.userInput.value.trim();
  
  if (!userInputValue) {
    return;
  }

  try {
    // 1. Add user message to chat
    this.createUserMessage(userInputValue);
    
    // 2. Reset form
    this.elements.userInput.value = '';
    
    // 3. Create AI message container for streaming
    this.appState.currentStreamingMessage = this.createAssistantMessage('');
    
    // 4. Set loading state to TRUE (start avatar rotation)
    this.setUILoadingState(true, this.elements.mainContainer);
    
    // 5. Start streaming
    await this.startStreamingResponse(userInputValue);
    
  } catch (error) {
    console.error('Error handling chat submit:', error);
    this.setUILoadingState(false, this.elements.mainContainer);
    // TODO: Add proper error handling UI
  }
}

// 3. UPDATE startStreamingResponse to manage loading state correctly
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

      // Keep loading state TRUE during streaming (avatar keeps rotating)
      // Don't set to false on first chunk anymore

      // Decode chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6); // Remove 'data: ' prefix
          if (data.trim()) { // Only process non-empty data
            accumulatedText += data;
            // Update the streaming message
            this.updateStreamingMessage(accumulatedText);
          }
        }
      }
    }

    // Final update after stream completion
    this.finalizeStreamingMessage();

    // IMPORTANT: Set loading state to FALSE when streaming is completely done
    this.setUILoadingState(false, this.elements.mainContainer);

  } catch (error) {
    console.error('Error during streaming:', error);
    this.setUILoadingState(false, this.elements.mainContainer);
    // TODO: Add proper error handling UI
  }
}

// 4. UPDATE setUILoadingState to use the correct container parameter
setUILoadingState(isLoading, container) {
  const { userInput, chatInputContainer, submitButton, waitingBubble } = this.elements;
  const alsieAvatar = container.querySelector('#alsie-avatar');
  
  if (isLoading) {
    userInput.style.opacity = '0.5';
    userInput.disabled = true;
    chatInputContainer.className = 'chat-input-container-disabled';
    submitButton.className = 'icon-button-disabled';
    waitingBubble.style.display = 'flex';
    
    // Set alsie-avatar to rotating state
    if (alsieAvatar) {
      alsieAvatar.className = 'alsie-avatar rotating';
      console.log('Avatar rotation started');
    }
  } else {
    userInput.style.opacity = '1';
    userInput.disabled = false;
    chatInputContainer.className = 'chat-input-container';
    submitButton.className = 'icon-button';
    waitingBubble.style.display = 'none';
    
    // Set alsie-avatar to normal state
    if (alsieAvatar) {
      alsieAvatar.className = 'alsie-avatar';
      console.log('Avatar rotation stopped');
    }
  }
}