// ============================================================================
// COURSE PROGRESS BY MODULE - UPDATED WITH VERCEL GRADING SUPPORT
// ============================================================================

const WORKFLOW_API_URL = 'https://workflow-hw6y4gglz-toropilja374-gmailcoms-projects.vercel.app';

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const course_id = getUrlParameters('course_id');
        const lesson_id = getUrlParameters('lesson_id');
        
        if (lesson_id) {
            console.log('Displaying progress for lesson ID:', lesson_id);
            await displayStudentProgress(course_id, lesson_id);
        }
        
        console.log('Progress page initialized successfully');
    } catch (error) {
        console.error('Error initializing progress page:', error);
    }
});

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

async function displayStudentProgress(course_id, lesson_id) {
    const mainContainer = document.getElementById('main-container');
    
    if (!mainContainer) {
        console.error('Main container not found');
        return;
    }
    
    mainContainer.innerHTML = '';
    
    try {
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/student_progress?course_id=${course_id}&lesson_id=${lesson_id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch student progress');
        }
        
        const data = await response.json();
        console.log('Loaded data: ', data);
        
        if (!data || data.length === 0) {
            mainContainer.innerHTML = '<div class="empty-block-container">No student progress data available.</div>';
            return;
        }
        
        data.forEach(student => {
            const studentContainer = createStudentContainer(student);
            mainContainer.appendChild(studentContainer);
        });
        
    } catch (error) {
        console.error('Error displaying student progress:', error);
        mainContainer.innerHTML = '<div class="empty-block-container">Error loading progress data.</div>';
    }
}

function createStudentContainer(student) {
    const container = document.createElement('div');
    container.className = 'pr-student-container';
    
    const headerContainer = document.createElement('div');
    headerContainer.className = 'pr-student-header';
    
    const studentName = document.createElement('div');
    studentName.className = 'pr-student-name';
    studentName.textContent = student.student_name || 'Unknown Student';
    headerContainer.appendChild(studentName);
    
    container.appendChild(headerContainer);
    
    if (student.blocks && student.blocks.length > 0) {
        student.blocks.forEach(block => {
            const blockElement = createBlockElement(block, student.student_id);
            container.appendChild(blockElement);
        });
    } else {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-block-container';
        emptyMessage.textContent = 'No blocks found for this student.';
        container.appendChild(emptyMessage);
    }
    
    return container;
}

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
        gradeButton.className = 'button_primary_s';
        gradeButton.addEventListener('click', () => gradeBlock(block.ub_id, gradeButton));
    } else {
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
    grade.textContent = criterion.grade || '0';
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

function createStatusElement(status) {
    const statusImg = document.createElement('div');
    statusImg.className = 'status-circle-idle';
    
    switch(status) {
        case 'finished':
            statusImg.alt = 'Finished';
            statusImg.title = 'Finished';
            statusImg.className = 'status-circle-done';
            statusImg.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">radio_button_checked</span>';
            break;
        case 'started':
            statusImg.alt = 'In progress';
            statusImg.title = 'In progress';
            statusImg.className = 'status-circle-progress';
            statusImg.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">radio_button_partial</span>';
            break;
        case 'idle':
            statusImg.alt = 'Not started';
            statusImg.title = 'Not started';
            statusImg.className = 'status-circle-idle';
            statusImg.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">radio_button_unchecked</span>';
            break;
        default:
            statusImg.alt = 'Unknown';
            statusImg.title = 'Unknown';
            statusImg.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">radio_button_unchecked</span>';
    }
    
    return statusImg;
}

// ============================================================================
// GRADING FUNCTIONS - UPDATED WITH VERCEL API SUPPORT
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
        
        console.log('Vercel API failed, trying Xano fallback...');
        
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
    const confirmDelete = confirm('Are you sure you want to clear this chat? This action will remove all the chat messages, and grades, and this cannot be undone.');
    
    if (!confirmDelete) {
        return;
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
        
        await refreshStudentProgress();
        console.log('Chat cleared successfully');
        
    } catch (error) {
        console.error('Error clearing chat:', error);
        alert('The clearing did not happen. Please try again.');
    }
}

async function refreshStudentProgress() {
    try {
        const urlLessonId = getUrlParameters('lesson_id');
        const lessonSelector = document.getElementById('lesson-selector');
        const selectedLessonId = urlLessonId || (lessonSelector ? lessonSelector.value : null);
        
        if (!selectedLessonId) {
            console.error('No lesson ID available for refresh');
            return;
        }
        
        const course_id = getUrlParameters('course_id');
        
        if (!course_id) {
            console.error('No course ID available for refresh');
            return;
        }
        
        console.log('Refreshing student progress for lesson:', selectedLessonId);
        
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
            keepalive: true
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        
        if (document.visibilityState === 'visible') {
            refreshStudentProgress();
            gradeLessonButton.textContent = 'Grade Lesson';
        }
        
    } catch (error) {
        console.error('Error calculating lesson grades:', error);
        
        if (document.visibilityState === 'visible') {
            gradeLessonButton.textContent = 'Grade Lesson';
        }
    }
}