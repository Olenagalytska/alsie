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
            
            // Display student progress
            await displayStudentProgress(course_id, selectedLessonId);
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
    
    const selectedLesson = lessons.find(lesson => lesson.id == selectedLessonId);
    
    if (lessonTitleElement && selectedLesson) {
        lessonTitleElement.textContent = selectedLesson.name;
    }
    
    if (moduleLabelElement && selectedLesson) {
        const orderText = selectedLesson.order || '0';
        moduleLabelElement.textContent = `Module ${orderText}`;
    }
}

async function displayStudentProgress(course_id, lesson_id) {
    try {
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/student_progress?course_id=${course_id}&lesson_id=${lesson_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const studentsData = await response.json();
        renderStudentProgress(studentsData);
        
    } catch (error) {
        console.error('Error fetching student progress:', error);
    }
}

function renderStudentProgress(studentsData) {
    const container = document.getElementById('student-progress-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    studentsData.forEach(student => {
        const studentWrapper = document.createElement('div');
        studentWrapper.className = 'student-grades-wrapper';
        
        // Student name row
        const nameContainer = document.createElement('div');
        nameContainer.className = 'grade-row-container';
        nameContainer.textContent = student.student_name;
        studentWrapper.appendChild(nameContainer);
        
        // Student grades main container
        const gradesMainContainer = document.createElement('div');
        gradesMainContainer.className = 'student-grades-main-container';
        
        student.blocks.forEach(block => {
            const blockElement = createBlockElement(block);
            gradesMainContainer.appendChild(blockElement);
        });
        
        studentWrapper.appendChild(gradesMainContainer);
        container.appendChild(studentWrapper);
    });
}

function createBlockElement(block) {
    const isGraded = block.status === 'finished' && block.grading_output && Array.isArray(block.grading_output) && block.grading_output.length > 0;
    const isFinishedOrInProgress = block.status === 'finished' || block.status === 'started';
    
    if (isGraded) {
        return createGradedBlock(block);
    } else if (isFinishedOrInProgress) {
        return createUngradedBlock(block, true);
    } else {
        return createUngradedBlock(block, false);
    }
}

function createGradedBlock(block) {
    const container = document.createElement('div');
    container.className = 'grade-row-container-expanded';
    
    // First grade-button-container
    const firstButtonContainer = document.createElement('div');
    firstButtonContainer.className = 'grade-button-container';
    
    const status = document.createElement('div');
    status.className = 'body_XS';
    status.textContent = block.status;
    firstButtonContainer.appendChild(status);
    
    const blockGradesContainer = document.createElement('div');
    blockGradesContainer.className = 'block-grades-container';
    
    const blockName = document.createElement('div');
    blockName.className = 'block-name';
    blockName.textContent = block.block_name;
    blockGradesContainer.appendChild(blockName);
    
    const gradeDetailsContainer = document.createElement('div');
    gradeDetailsContainer.className = 'grade-details-container';
    
    block.grading_output.forEach(criterion => {
        const criterionElement = createCriterionElement(criterion);
        gradeDetailsContainer.appendChild(criterionElement);
    });
    
    blockGradesContainer.appendChild(gradeDetailsContainer);
    firstButtonContainer.appendChild(blockGradesContainer);
    container.appendChild(firstButtonContainer);
    
    // Second grade-button-container
    const secondButtonContainer = document.createElement('div');
    secondButtonContainer.className = 'grade-button-container';
    
    const totalGrade = block.grading_output.reduce((sum, criterion) => sum + (criterion.grade || 0), 0);
    const gradeText = document.createElement('div');
    gradeText.className = 'body_m';
    gradeText.textContent = totalGrade.toString();
    secondButtonContainer.appendChild(gradeText);
    
    const collapseButton = document.createElement('button');
    collapseButton.className = 'button_secondary_s';
    collapseButton.textContent = 'Collapse';
    secondButtonContainer.appendChild(collapseButton);
    
    const gradeButton = document.createElement('button');
    gradeButton.className = 'button_primary_s';
    gradeButton.textContent = 'Grade';
    secondButtonContainer.appendChild(gradeButton);
    
    container.appendChild(secondButtonContainer);
    
    return container;
}

function createUngradedBlock(block, showGradeButton) {
    const container = document.createElement('div');
    container.className = 'grade-row-container';
    
    const expandedContainer = document.createElement('div');
    expandedContainer.className = 'grade-row-container-expanded';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'grade-button-container';
    
    const status = document.createElement('div');
    status.className = 'body_XS';
    status.textContent = block.status;
    buttonContainer.appendChild(status);
    
    const blockGradesContainer = document.createElement('div');
    blockGradesContainer.className = 'block-grades-container';
    
    const blockName = document.createElement('div');
    blockName.className = 'block-name';
    blockName.textContent = block.block_name;
    blockGradesContainer.appendChild(blockName);
    
    buttonContainer.appendChild(blockGradesContainer);
    expandedContainer.appendChild(buttonContainer);
    
    if (showGradeButton) {
        const secondButtonContainer = document.createElement('div');
        secondButtonContainer.className = 'grade-button-container';
        
        const gradeButton = document.createElement('button');
        gradeButton.className = 'button_primary_s';
        gradeButton.textContent = 'Grade';
        secondButtonContainer.appendChild(gradeButton);
        
        expandedContainer.appendChild(secondButtonContainer);
    }
    
    container.appendChild(expandedContainer);
    return container;
}

function createCriterionElement(criterion) {
    const container = document.createElement('div');
    container.className = 'pr-grade-criterion-container';
    
    const nameContainer = document.createElement('div');
    nameContainer.className = 'pr-criterion-name-container';
    
    const criterionName = document.createElement('div');
    criterionName.className = 'pr-criterion-name';
    criterionName.textContent = criterion.criterion_name;
    nameContainer.appendChild(criterionName);
    
    const gradeContainer = document.createElement('div');
    gradeContainer.className = 'criterion-grade-container';
    
    const grade = document.createElement('div');
    grade.className = 'pr-criterion-grade';
    grade.textContent = criterion.grade || '0';
    gradeContainer.appendChild(grade);
    
    const maxPoints = document.createElement('div');
    maxPoints.className = 'pr-criterion-grade-max-points';
    maxPoints.textContent = criterion.max_points || '0';
    gradeContainer.appendChild(maxPoints);
    
    nameContainer.appendChild(gradeContainer);
    container.appendChild(nameContainer);
    
    const summaryText = document.createElement('div');
    summaryText.className = 'criterion-summary-text';
    summaryText.textContent = (criterion.summary || '') + ' ' + (criterion.grading_comment || '');
    container.appendChild(summaryText);
    
    return container;
}
>>>>>>> 6e7a26d925be7063a272868b6135f53988c34891