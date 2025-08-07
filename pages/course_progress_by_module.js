async function initializeProgressPage(course_id) {
    try {
        // Set up element names and navigation
        await setElementNames({ course_id });
        
        // Fetch lessons and determine which lesson to display
        const lessons = await fetchLessons(course_id);
        const selectedLessonId = await determineLessonId(lessons);
        
        // Populate lesson selector dropdown
        await populateLessonSelector(lessons, selectedLessonId);
        
        // Set up lesson selector change handler
        setupLessonSelector(course_id);
        
        // Display progress for the selected lesson
        if (selectedLessonId) {
            console.log('Displaying progress for lesson ID:', selectedLessonId);
            
            // Display lesson title
            await displayLessonTitle(lessons, selectedLessonId);
            
            // TODO: Call function to display lesson progress
            // await displayLessonProgress(course_id, selectedLessonId);
        }
        
        console.log('Progress page initialized successfully');
        
    } catch (error) {
        console.error('Error initializing progress page:', error);
        alert('Error loading page. Please try again.');
    }
}

async function fetchLessons(course_id) {
    try {
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
        return lessons;
        
    } catch (error) {
        console.error('Error fetching lessons:', error);
        throw error;
    }
}

async function determineLessonId(lessons) {
    // Get lesson_id from URL parameters
    const urlLessonId = getUrlParameters('lesson_id');
    
    if (urlLessonId) {
        console.log('Using lesson_id from URL:', urlLessonId);
        return urlLessonId;
    }
    
    // If no lesson_id in URL, find the lesson with the highest order number
    if (Array.isArray(lessons) && lessons.length > 0) {
        const lastLesson = lessons.reduce((prev, current) => {
            // Compare order numbers, defaulting to 0 if order is not defined
            const prevOrder = prev.order || 0;
            const currentOrder = current.order || 0;
            return currentOrder > prevOrder ? current : prev;
        });
        
        console.log('Using last module (highest order):', lastLesson.id, 'with order:', lastLesson.order);
        return lastLesson.id;
    }
    
    console.warn('No modules available to determine lesson ID');
    return null;
}

async function populateLessonSelector(lessons, selectedLessonId) {

    const lessonSelector = document.getElementById('lesson-selector');
    
    if (!lessonSelector) {
        console.error('Lesson selector element not found');
        return;
    }

    try {
        // Show loading state
        lessonSelector.innerHTML = '<option value="">Loading modules...</option>';
        lessonSelector.disabled = true;

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
                    
                    // Set as selected if this is the selected lesson
                    if (lesson.id == selectedLessonId) {
                        option.selected = true;
                    }
                    
                    lessonSelector.appendChild(option);
                }
            });
            
            console.log(`Successfully populated ${lessons.length} modules in dropdown`);
        } else {
            // No lessons found
            const noLessonsOption = document.createElement('option');
            noLessonsOption.value = '';
            noLessonsOption.textContent = 'No modules available';
            lessonSelector.appendChild(noLessonsOption);
            lessonSelector.disabled = true;
            
            console.warn('No modules found for this course');
        }

    } catch (error) {
        console.error('Error populating module selector:', error);
        
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
            // Navigate to teacher course progress by module page
            const targetUrl = `/teacher/course-progress-by-module?course_id=${course_id}&lesson_id=${selectedLessonId}`;
            console.log('Navigating to:', targetUrl);
            window.location.href = targetUrl;
        }
    });
    
    console.log('Lesson selector change handler set up successfully');
}

function displayLessonTitle(lessons, selectedLessonId) {
    const lessonTitleElement = document.getElementById('lesson-title');
    const moduleLabelElement = document.getElementById('module-label');
    
    if (!lessonTitleElement) {
        console.error('Lesson title element not found');
        return;
    }
    
    // Find the selected lesson in the lessons array
    const selectedLesson = lessons.find(lesson => lesson.id == selectedLessonId);
    
    if (selectedLesson && selectedLesson.name) {
        lessonTitleElement.textContent = selectedLesson.name;
        console.log('Lesson title set to:', selectedLesson.name);
        
        // Set module label with order number
        if (moduleLabelElement) {
            const orderText = selectedLesson.order || '0';
            moduleLabelElement.textContent = `Module ${orderText}`;
            console.log('Module label set to: Module', orderText);
        } else {
            console.warn('Module label element not found');
        }
        
    } else {
        console.warn('Selected lesson not found or has no name');
        lessonTitleElement.textContent = 'Module not found';
        
        if (moduleLabelElement) {
            moduleLabelElement.textContent = 'Module';
        }
    }
}