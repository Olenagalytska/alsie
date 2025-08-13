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

function displayLessonTitle(lessons, selectedLessonId) {
    const lessonTitleElement = document.getElementById('lesson-title');
    const moduleLabelElement = document.getElementById('module-label');
    
    const selectedLesson = lessons.find(lesson => lesson.id == selectedLessonId);
    
    if (lessonTitleElement && selectedLesson) {
        lessonTitleElement.textContent = selectedLesson.name;
    }
    
    if (moduleLabelElement && selectedLesson) {
        const orderText = selectedLesson.order || '0';
        moduleLabelElement.textContent = `Module ${orderText}`;
    }
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



function createStatusElement(status) {
    const statusImg = document.createElement('div');
    statusImg.className = 'status-circle-idle';
    
    switch(status) {
        case 'finished':
            //statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c89df353f89d2f162e_Status%3DDone.svg';
            statusImg.alt = 'Finished';
            statusImg.title = 'Finished';
            statusImg.className = 'status-circle-done';
            statusImg.innerHTML = '<span class="material-symbols-outlined" style = "font-size: 1.2rem;">radio_button_checked</span>';

            break;
        case 'started':
            //statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c8060fc4bd6aad4b6b_Status%3DIn%20Progress.svg';
            statusImg.alt = 'In progress';
            statusImg.title = 'In progress';
            statusImg.className = 'status-circle-progress';
            statusImg.innerHTML = '<span class="material-symbols-outlined" style = "font-size: 1.2rem;">radio_button_partial</span>';
            break;
        case 'idle':
            //statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c8b88ac6941a4b04a3_Status%3DIdle.svg';
            statusImg.alt = 'Not started';
            statusImg.title = 'Not started';
            statusImg.className = 'status-circle-idle';
            statusImg.innerHTML = '<span class="material-symbols-outlined" style = "font-size: 1.2rem;">radio_button_unchecked</span>';
            break;
        default:
            //statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c8b88ac6941a4b04a3_Status%3DIdle.svg';
            statusImg.alt = 'Unknown status';
            statusImg.title = 'Unknown status';
            statusImg.className = 'status-circle-idle';
            statusImg.innerHTML = '<span class="material-symbols-outlined" style = "font-size: 1.2rem;">radio_button_unchecked</span>';
    }
    
    return statusImg;
}