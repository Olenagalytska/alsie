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