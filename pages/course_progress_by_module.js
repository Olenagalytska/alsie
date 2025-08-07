
// ===========================
// INITIALIZATION FUNCTIONS
// ===========================

async function initializeCourseProgress() {
    // Verify authentication
    const user = await verifyUserAuth();
    
    // Get required parameters
    const course_id = getUrlParameters('course_id');
    
    // Validate required parameters
    if (!course_id) {
        console.error('Required URL parameters are missing: course_id');
        //window.location.href = '/';
        return;
    }
    
    // Set up page elements and navigation
    await setupPageElements(course_id, user.id);
    
    // Load and display course data
    await loadCourseData(course_id);
}

async function setupPageElements(course_id, user_id) {
    setElementNames({ course_id, lesson_id: null, block_id: null, teacher_id: null });
    setTeacherCourseMenu(course_id);
}


// ===========================
// DATA LOADING FUNCTIONS
// ===========================

async function loadCourseData(course_id) {
    const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/lesson_full';
    
    try {
        const response = await fetch(`${apiUrl}?course_id=${course_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        
        const data = await response.json();
        console.log('Data received:', data);
        
        renderCourseContent(data);
        
    } catch (error) {
        console.error('Error fetching course data:', error);
        displayErrorMessage('Failed to load course data. Please try again.');
    }
}





async function initializeProgressPage(course_id) {
    try {
        // Set up element names and navigation
        await setElementNames({ course_id });
        
        // Fetch and populate lesson selector dropdown
        await fetchAndPopulateLessonSelector(course_id);
        
        // Set up lesson selector change handler
        setupLessonSelector(course_id);
        
        console.log('Progress page initialized successfully');
        
    } catch (error) {
        console.error('Error initializing progress page:', error);
        alert('Error loading page. Please try again.');
    }
}





async function fetchAndPopulateLessonSelector(course_id) {
    const lessonSelector = document.getElementById('lesson-selector');
    
    if (!lessonSelector) {
        console.error('Lesson selector element not found');
        return;
    }

    try {
        // Show loading state
        lessonSelector.innerHTML = '<option value="">Loading lessons...</option>';
        lessonSelector.disabled = true;

        // Fetch lessons from API
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/get_lesson_list?course_id=${course_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const lessons = await response.json();
        console.log('Lessons fetched:', lessons);

        // Clear loading state
        lessonSelector.innerHTML = '';
        lessonSelector.disabled = false;

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a module...';
        lessonSelector.appendChild(defaultOption);

        // Populate dropdown with lessons
        if (Array.isArray(lessons) && lessons.length > 0) {
            lessons.forEach(lesson => {
                if (lesson.id && lesson.name) {
                    const option = document.createElement('option');
                    option.value = lesson.id;
                    option.textContent = lesson.name;
                    lessonSelector.appendChild(option);
                }
            });
            
            console.log(`Successfully populated ${lessons.length} lessons in dropdown`);
        } else {
            // No lessons found
            const noLessonsOption = document.createElement('option');
            noLessonsOption.value = '';
            noLessonsOption.textContent = 'No modules available';
            lessonSelector.appendChild(noLessonsOption);
            lessonSelector.disabled = true;
            
            console.warn('No lessons found for this course');
        }

    } catch (error) {
        console.error('Error fetching lessons:', error);
        
        // Show error state
        lessonSelector.innerHTML = '<option value="">Error loading modules</option>';
        lessonSelector.disabled = true;
        
        alert('Failed to load course modules. Please refresh the page and try again.');
    }
}

function setupLessonSelector(course_id) {
    const lessonSelector = document.getElementById('lesson-selector');
    
    if (!lessonSelector) {
        console.error('Lesson selector element not found');
        return;
    }

    lessonSelector.addEventListener('change', function() {
        const selectedLessonId = this.value;
        
        console.log('Lesson selected:', selectedLessonId);
        
        if (selectedLessonId) {
            // Navigate to course progress by module page
            const targetUrl = `/teacher/course-progress-by-module?course_id=${course_id}&lesson_id=${selectedLessonId}`;
            console.log('Navigating to:', targetUrl);
            window.location.href = targetUrl;
        }
    });
    
    console.log('Lesson selector change handler set up successfully');
}