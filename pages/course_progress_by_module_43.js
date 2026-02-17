// ============================================================================
// COURSE PROGRESS BY MODULE - WITH VERCEL GRADING SUPPORT
// ============================================================================

const WORKFLOW_API_URL = 'https://workflow-paam6qu0x-toropilja374-gmailcoms-projects.vercel.app';

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initializeProgressPage(course_id) {
    try {
        const user = await verifyUserAuth();
        await verifyTeacherPermissions(user.id, course_id);
        
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
            console.log('Displaying progress for lesson ID:', selectedLessonId);
            
            // Display lesson title
            await displayLessonTitle(lessons, selectedLessonId);

            const gradeLessonButton = document.getElementById('grade-lesson-button');
            if (gradeLessonButton) {
                gradeLessonButton.addEventListener('click', () => gradeLesson(selectedLessonId, gradeLessonButton));
            }
            const exportButton = document.getElementById('export-csv-button');
            if (exportButton) {
                exportButton.addEventListener('click', () => exportLessonGrades(selectedLessonId, exportButton));
            }
            
            // Display student progress
            await displayStudentProgress(course_id, selectedLessonId);
        }
        
        console.log('Progress page initialized successfully');
        
    } catch (error) {
        console.error('Error initializing progress page:', error);
        alert('Error loading page. Please try again.');
    }
}

// ============================================================================
// DATA FETCHING AND DISPLAY
// ============================================================================

async function displayStudentProgress(course_id, lesson_id) {
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
        console.log('Loaded data: ', studentsData);
        renderStudentProgress(studentsData);
        
    } catch (error) {
        console.error('Error fetching student progress:', error);
    }
}

async function renderStudentProgress(studentsData) {
    const container = document.getElementById('student-progress-container');
    if (!container) return;
    const teacher = await verifyUserAuth();
    container.innerHTML = '';
    
    studentsData.forEach(student => {
        const studentWrapper = document.createElement('div');
        studentWrapper.className = 'pr-student-grades-wrapper';
        
        // Student name row
        const nameContainer = document.createElement('div');
        nameContainer.className = 'pr-grade-row-container';
        if (teacher.id == 146) { 
            nameContainer.textContent = student.student_id;
        } else nameContainer.textContent = student.student_name;
        studentWrapper.appendChild(nameContainer);
        
        // Student grades main container
        const gradesMainContainer = document.createElement('div');
        gradesMainContainer.className = 'pr-student-grades-main-container';
        
        student.blocks.forEach(block => {
            const blockElement = createBlockElement(block, student.student_id);
            gradesMainContainer.appendChild(blockElement);
        });
        
        studentWrapper.appendChild(gradesMainContainer);
        container.appendChild(studentWrapper);
    });
}

// ============================================================================
// BLOCK ELEMENT CREATION
// ============================================================================

function createBlockElement(block, student_id) {
    const isFinishedOrInProgress = block.status === 'finished' || block.status === 'started';
    const isGraded = isFinishedOrInProgress && block.grading_output && Array.isArray(block.grading_output) && block.grading_output.length > 0;
    
    if (isGraded) {
        return createGradedBlock(block, student_id);
    } else if (isFinishedOrInProgress) {
        return createUngradedBlock(block, student_id, true);
    } else {
        return createUngradedBlock(block, student_id, false);
    }
}

function createGradedBlock(block, student_id) {
    const container = document.createElement('div');
    container.className = 'pr-grade-row-container-expanded';
    
    // First grade-button-container
    const blockStatusContainer = document.createElement('div');
    blockStatusContainer.className = 'pr-block-status-container';
    
    const status = createStatusElement(block.status);
    blockStatusContainer.appendChild(status);
    
    const blockGradesContainer = document.createElement('div');
    blockGradesContainer.className = 'pr-block-grades-container';
    
    const blockName = document.createElement('div');
    blockName.className = 'pr-block-name';
    blockName.textContent = block.block_name;
    blockName.addEventListener('click', () => {
        console.log('test id:', block.ub_id);
        window.location.href = `lesson-page-teacher-view?&ub_id=${block.ub_id}`;
    });
    blockGradesContainer.appendChild(blockName);
    
    const gradeDetailsContainer = document.createElement('div');
    gradeDetailsContainer.className = 'pr-grade-details-container';
    
    block.grading_output.forEach(criterion => {
        const criterionElement = createCriterionElement(criterion);
        gradeDetailsContainer.appendChild(criterionElement);
    });
    
    blockGradesContainer.appendChild(gradeDetailsContainer);
    blockStatusContainer.appendChild(blockGradesContainer);
    container.appendChild(blockStatusContainer);
    
    // Second grade-button-container
    const secondButtonContainer = document.createElement('div');
    secondButtonContainer.className = 'pr-grade-button-container';
    
    const totalGrade = block.grading_output.reduce((sum, criterion) => sum + (criterion.grade || 0), 0);
    const gradeText = document.createElement('div');
    gradeText.className = 'body_m';
    gradeText.textContent = totalGrade.toString();
    secondButtonContainer.appendChild(gradeText);
    
    const gradeButton = document.createElement('button');
    gradeButton.className = 'button_primary_s';
    gradeButton.textContent = 'Grade';
    gradeButton.addEventListener('click', () => gradeBlock(block.ub_id, gradeButton));
    secondButtonContainer.appendChild(gradeButton);

    const viewButton = document.createElement('button');
    viewButton.className = 'iconbutton_transp_s';
    viewButton.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">arrow_right_alt</span>';
    
    viewButton.addEventListener('click', () => {
        window.location.href = `lesson-page-teacher-view?block_id=${block.block_id}&user_id=${student_id}`;
    });

    secondButtonContainer.appendChild(viewButton);

    // ADD Clear BUTTON HERE
    const clearButton = document.createElement('button');
    clearButton.className = 'icon_red_transp_s';
    clearButton.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">delete_history</span>';
    clearButton.addEventListener('click', () => clearBlock(block.ub_id));
    secondButtonContainer.appendChild(clearButton);

    container.appendChild(secondButtonContainer);
    
    return container;
}

function createUngradedBlock(block, student_id, showGradeButton) {
    const container = document.createElement('div');
    container.className = 'pr-grade-row-container';

    const blockStatusContainer = document.createElement('div');
    blockStatusContainer.className = 'pr-block-status-container';
    
    const status = createStatusElement(block.status);
    blockStatusContainer.appendChild(status);
    
    const blockGradesContainer = document.createElement('div');
    blockGradesContainer.className = 'pr-block-grades-container';
    
    const blockName = document.createElement('div');
    blockName.className = 'pr-block-name';
    blockName.textContent = block.block_name;
    blockName.addEventListener('click', () => {
        console.log('test id:', block.ub_id);
        window.location.href = `lesson-page-teacher-view?&ub_id=${block.ub_id}`;
    });
    blockGradesContainer.appendChild(blockName);
    
    blockStatusContainer.appendChild(blockGradesContainer);
    container.appendChild(blockStatusContainer);
    
    const secondButtonContainer = document.createElement('div');
    secondButtonContainer.className = 'pr-grade-button-container';

    const gradeButton = document.createElement('button');
    gradeButton.textContent = 'Grade';
    
    if (showGradeButton) {
        // For finished/started blocks - active button
        gradeButton.className = 'button_primary_s';
        gradeButton.addEventListener('click', () => gradeBlock(block.ub_id, gradeButton));
    } else {
        // For idle blocks - disabled button
        gradeButton.className = 'button_disabled_s';
    }
    
    secondButtonContainer.appendChild(gradeButton);

    const viewButton = document.createElement('button');
    viewButton.className = 'iconbutton_transp_s';
    viewButton.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">arrow_right_alt</span>';
    
    viewButton.addEventListener('click', () => {
        window.location.href = `lesson-page-teacher-view?block_id=${block.block_id}&user_id=${student_id}`;
    });

    secondButtonContainer.appendChild(viewButton);

    // ADD Clear BUTTON HERE
    const clearButton = document.createElement('button');
    clearButton.className = 'icon_red_transp_s';
    clearButton.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">delete_history</span>';
    clearButton.addEventListener('click', () => clearBlock(block.ub_id));
    secondButtonContainer.appendChild(clearButton);

    blockStatusContainer.appendChild(secondButtonContainer);
    
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
    gradeContainer.className = 'pr-criterion-grade-container';
    
    const grade = document.createElement('div');
    grade.className = 'pr-criterion-grade';
    grade.textContent = criterion.grade ?? '0';
    gradeContainer.appendChild(grade);
    
    const maxPoints = document.createElement('div');
    maxPoints.className = 'pr-criterion-grade-max-points';
    maxPoints.textContent = '/' + criterion.max_points || '-';
    gradeContainer.appendChild(maxPoints);
    
    nameContainer.appendChild(gradeContainer);
    container.appendChild(nameContainer);
    
    const summaryText = document.createElement('div');
    summaryText.className = 'pr-criterion-summary-text';
    summaryText.textContent = (criterion.summary || '') + ' ' + (criterion.grading_comment || '');
    container.appendChild(summaryText);
    
    return container;
}

// ============================================================================
// GRADING FUNCTIONS - WITH VERCEL API SUPPORT
// ============================================================================

async function gradeBlock(ub_id, gradeButton) {
    console.log('Grading user block:', ub_id);
    
    const originalText = gradeButton ? gradeButton.textContent : 'Grade';
    if (gradeButton) {
        gradeButton.textContent = 'Grading...';
        gradeButton.disabled = true;
    }
    
    try {
        // 1. СПОЧАТКУ пробуємо Vercel API (нові workflows)
        console.log('Trying Vercel API for grading...');
        const vercelResponse = await fetch(`${WORKFLOW_API_URL}/chat/${ub_id}/evaluate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (vercelResponse.ok) {
            const result = await vercelResponse.json();
            console.log('Vercel grading successful:', result);
            
            if (document.visibilityState === 'visible') {
                await refreshStudentProgress();
            }
            return;
        }
        
        console.log('Vercel API returned non-ok status, trying Xano fallback...');
        
        // 2. FALLBACK: Xano API (старі workflows)
        const xanoResponse = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/grade_ub?ub_id=${ub_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            keepalive: true
        });
        
        if (!xanoResponse.ok) {
            throw new Error('Both Vercel and Xano grading failed');
        }
        
        const result = await xanoResponse.json();
        console.log('Xano grading successful:', result);
        
        if (document.visibilityState === 'visible') {
            await refreshStudentProgress();
        }
        
    } catch (error) {
        console.error('Error grading block:', error);
        if (document.visibilityState === 'visible') {
            alert('Error grading block. Please try again.');
        }
    } finally {
        if (gradeButton) {
            gradeButton.textContent = originalText;
            gradeButton.disabled = false;
        }
    }
}

async function clearBlock(ub_id) {
    // Show confirmation dialog
    const confirmDelete = confirm('Are you sure you want to clear this chat? This action will remove all the chat messages, and grades, and this cannot be undone.');
    
    if (!confirmDelete) {
        return; // User cancelled
    }
    
    try {
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/clear_ub?ub_id=${ub_id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Clear request failed with status ${response.status}`);
        }
        
        // Refresh the student progress display after successful grading
        await refreshStudentProgress();
        
        console.log('Chat cleared successfully:');
        
    } catch (error) {
        console.error('Error clearing chat:', error);
        alert('The clearing did not happen. Please try again.');
    }
}

async function refreshStudentProgress() {
    try {
        // Get the current lesson_id from the URL or lesson selector
        const urlLessonId = getUrlParameters('lesson_id');
        const lessonSelector = document.getElementById('lesson-selector');
        const selectedLessonId = urlLessonId || (lessonSelector ? lessonSelector.value : null);
        
        if (!selectedLessonId) {
            console.error('No lesson ID available for refresh');
            return;
        }
        
        // Get the current course_id from the URL
        const course_id = getUrlParameters('course_id');
        
        if (!course_id) {
            console.error('No course ID available for refresh');
            return;
        }
        
        console.log('Refreshing student progress for lesson:', selectedLessonId);
        
        // Re-fetch and display the updated student progress
        await displayStudentProgress(course_id, selectedLessonId);
        
        console.log('Student progress refreshed successfully');
        
    } catch (error) {
        console.error('Error refreshing student progress:', error);
    }
}

async function gradeLesson(lesson_id, gradeLessonButton) {
    const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/grade_lesson';
    
    try {
        gradeLessonButton.textContent = 'Grading...';
        alert('Grading process started. Feel free to leave the page in a few seconds. Grading will continue in the background.');
        
        const response = await fetch(`${apiUrl}?lesson_id=${lesson_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            keepalive: true  // This ensures the request continues even if user leaves page
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        
        // Only refresh and update button if user is still on the page
        if (document.visibilityState === 'visible') {
            refreshStudentProgress();
            gradeLessonButton.textContent = 'Grade Module';
        }
        
    } catch (error) {
        console.error('Error calculating lesson grades:', error);
        
        // Only update button if user is still on the page
        if (document.visibilityState === 'visible') {
            gradeLessonButton.textContent = 'Grade Module';
        }
    }
}

async function exportLessonGrades(lesson_id, exportButton) {
    const originalText = exportButton.textContent;
    
    try {
        exportButton.textContent = 'Exporting...';
        exportButton.disabled = true;
        
        const exportUrl = `${WORKFLOW_API_URL}/lesson/${lesson_id}/export-grades`;
        window.open(exportUrl, '_blank');
        
        setTimeout(() => {
            exportButton.textContent = originalText;
            exportButton.disabled = false;
        }, 1000);
        
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export grades. Please try again.');
        exportButton.textContent = originalText;
        exportButton.disabled = false;
    }
}
