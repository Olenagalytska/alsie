async function initializeProgressChatPage(course_id) {
    try {
        // Set up element names and navigation
        await setElementNames({ course_id });
        setTeacherCourseMenu(course_id);
        
        // Fetch lessons and determine which lesson to display
        const lessons = await fetchLessons(course_id);
        const selectedLessonId = await determineLessonId(lessons);
        
        // Populate lesson selector dropdown
        await populateLessonSelector(lessons, selectedLessonId);
        
        // Set up lesson selector change handler
        setupLessonSelector(course_id);
        
        // Display progress for the selected lesson
        if (selectedLessonId) {
            console.log('Displaying chat progress for lesson ID:', selectedLessonId);
            
            // Display lesson title
            await displayLessonTitle(lessons, selectedLessonId);
            
            // Display student chats
            await displayStudentChats(course_id, selectedLessonId);
        }
        
        console.log('Progress chat page initialized successfully');
        
    } catch (error) {
        console.error('Error initializing progress chat page:', error);
        alert('Error loading page. Please try again.');
    }
}

async function displayStudentChats(course_id, lesson_id) {
    try {
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/get_progress_by_lesson?lesson_id=${lesson_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        const studentsData = result.progress_by_module;
        console.log('Loaded data for chat view: ', studentsData);
        await renderStudentChats(studentsData);
        
    } catch (error) {
        console.error('Error fetching student chats:', error);
    }
}

async function renderStudentChats(studentsData) {
    const container = document.getElementById('student-progress-container');
    if (!container) return;
    
    const teacher = await verifyUserAuth();
    container.innerHTML = '';
    
    for (const student of studentsData) {
        const studentWrapper = document.createElement('div');
        studentWrapper.className = 'pr-student-chats-wrapper';
        
        // Student name header
        const nameContainer = document.createElement('div');
        nameContainer.className = 'pr-student-name-header';
        nameContainer.style.cssText = `
            font-size: 1.5rem;
            font-weight: bold;
            margin: 2rem 0 1rem 0;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #e0e0e0;
        `;
        
        if (teacher.id == 146) { 
            nameContainer.textContent = `Student ID: ${student.student_id}`;
        } else {
            nameContainer.textContent = student.student_name;
        }
        studentWrapper.appendChild(nameContainer);
        
        // Process each block for this student
        for (const block of student.blocks) {
            // Skip blocks without thread_id (empty chats)
            if (!block.thread_id) {
                console.log(`Skipping block ${block.ub_id} - no thread_id`);
                continue;
            }
            
            // Create chat container for this block
            const chatContainer = document.createElement('div');
            chatContainer.className = 'pr-chat-container';
            chatContainer.style.cssText = `
                margin: 1.5rem 0;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 1rem;
                background-color: #fafafa;
            `;
            
            // Chat header
            const chatHeader = document.createElement('h2');
            chatHeader.style.cssText = `
                margin: 0 0 1rem 0;
                font-size: 1.2rem;
                color: #333;
            `;
            chatHeader.textContent = `${block.block_name} - Chat ${block.ub_id}`;
            chatContainer.appendChild(chatHeader);
            
            // Chat messages container
            const messagesContainer = document.createElement('div');
            messagesContainer.className = 'chat-messages-container';
            messagesContainer.style.cssText = `
                max-height: 600px;
                overflow-y: auto;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 1rem;
                background-color: white;
            `;
            
            // Load chat messages
            await loadChatMessages(block.thread_id, messagesContainer);
            
            chatContainer.appendChild(messagesContainer);
            studentWrapper.appendChild(chatContainer);
        }
        
        container.appendChild(studentWrapper);
    }
}

async function loadChatMessages(thread_id, container) {
    try {
        // Show loading indicator
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">Loading chat...</div>';
        
        // Fetch messages from API
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/l_messages?thread_id=${thread_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
        }

        const messages = await response.json();
        console.log('Messages loaded for thread', thread_id, ':', messages);

        // Clear container
        container.innerHTML = '';

        if (!messages || messages.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">No messages in this chat</div>';
            return;
        }

        // Reverse messages order (newest first -> oldest first for display)
        const sortedMessages = messages.reverse();

        // Display each message
        sortedMessages.forEach(message => {
            displayChatMessage(message, container);
        });

    } catch (error) {
        console.error('Error loading chat messages for thread', thread_id, ':', error);
        container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #d32f2f;">Error loading chat: ${error.message}</div>`;
    }
}

function displayChatMessage(message, container) {
    const messageText = extractMessageText(message);
    
    if (message.role === 'user') {
        createUserChatMessage(messageText, container);
    } else if (message.role === 'assistant') {
        createAssistantChatMessage(messageText, container);
    }
}

function extractMessageText(message) {
    try {
        if (message.content && message.content.length > 0) {
            const contentObj = message.content[0];
            if (contentObj.type === 'text' && contentObj.text && contentObj.text.value) {
                let textValue = contentObj.text.value;
                
                // Handle legacy JSON format (same as student chat)
                textValue = parseLegacyMessageFormat(textValue, message.role);
                
                return textValue;
            }
        }
    } catch (error) {
        console.error('Error extracting message text:', error);
    }
    return 'Error displaying message content';
}

function parseLegacyMessageFormat(textValue, role) {
    // Check if message starts with { (indicating legacy JSON format)
    if (textValue.trim().startsWith('{')) {
        try {
            if (role === 'assistant') {
                // Handle AI messages: {"text":"content","title":"-","type":"interview","additional":"info"}
                const parsed = JSON.parse(textValue);
                if (parsed.text) {
                    console.log('Parsed legacy AI message format');
                    return parsed.text;
                }
            } else if (role === 'user') {
                // Handle user messages: {'type': 'student', 'text': 'content' (missing closing bracket)
                let fixedJson = textValue.trim();
                
                // Fix missing closing bracket if needed
                if (!fixedJson.endsWith('}')) {
                    fixedJson += '}';
                }
                
                // Replace single quotes with double quotes for valid JSON
                fixedJson = fixedJson.replace(/'/g, '"');
                
                const parsed = JSON.parse(fixedJson);
                if (parsed.text) {
                    console.log('Parsed legacy user message format');
                    return parsed.text;
                }
            }
        } catch (jsonError) {
            console.warn('Failed to parse legacy JSON format, using raw text:', jsonError);
        }
    }
    
    return textValue;
}

function createUserChatMessage(text, container) {
    const userContainer = document.createElement('div');
    userContainer.className = 'user_content_container';
    userContainer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        margin: 0.5rem 0;
    `;
    
    const userBubble = document.createElement('div');
    userBubble.className = 'user_bubble';
    userBubble.style.cssText = `
        background-color: #007bff;
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 18px 18px 4px 18px;
        max-width: 70%;
        word-wrap: break-word;
    `;
    
    const userContent = document.createElement('div');
    userContent.className = 'user_content';
    userContent.textContent = text;
    
    userBubble.appendChild(userContent);
    userContainer.appendChild(userBubble);
    container.appendChild(userContainer);
}

function createAssistantChatMessage(text, container) {
    const aiContainer = document.createElement('div');
    aiContainer.className = 'ai_content_container';
    aiContainer.style.cssText = `
        display: flex;
        align-items: flex-start;
        margin: 0.5rem 0;
        gap: 0.5rem;
    `;
    
    // Create alsie avatar element
    const alsieAvatar = document.createElement('div');
    alsieAvatar.className = 'alsie-avatar';
    alsieAvatar.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: #28a745;
        flex-shrink: 0;
        margin-top: 0.5rem;
    `;
    
    const aiBubble = document.createElement('div');
    aiBubble.className = 'ai_bubble';
    aiBubble.style.cssText = `
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        padding: 0.75rem 1rem;
        border-radius: 18px 18px 18px 4px;
        max-width: 70%;
        word-wrap: break-word;
    `;
    
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
    container.appendChild(aiContainer);
    
    setupChatCodeBlocks(aiContainer);
}

function setupChatCodeBlocks(container) {
    const codeBlocks = container.querySelectorAll('pre code');
    
    codeBlocks.forEach(codeBlock => {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-button';
        copyButton.textContent = 'Copy';
        copyButton.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        `;
        
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