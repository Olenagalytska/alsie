

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

// ===========================
// RENDERING FUNCTIONS
// ===========================

function renderCourseContent(data) {
    const mainContainer = document.getElementById('main-container');
    
    if (!mainContainer) {
        console.error('Main container not found');
        return;
    }
    
    // Clear previous content
    mainContainer.innerHTML = '';
    
    // Set course title
    setCourseTitle(data);
    
    // Render each lesson
    data.forEach(lesson => {
        renderLesson(lesson, mainContainer);
    });
}

function setCourseTitle(data) {
    const courseTitleBlock = document.getElementById('course-name-title');
    if (courseTitleBlock) {
        courseTitleBlock.textContent = data[0]?._course.name || 'Unknown Course';
    }
}

function renderLesson(lesson, container) {
    const lessonHeaderContainer = createLessonHeader(lesson);
    container.appendChild(lessonHeaderContainer);
    
    if (lesson.status === "published") {
        addGradeButton(lessonHeaderContainer, lesson);
        renderLessonBlocks(lesson, container);
    }
}

function createLessonHeader(lesson) {
    const lessonHeaderContainer = createElement('div', 'li_lesson_header_container');
    const lessonNameContainer = createElement('div', 'li_lesson_name_container');
    
    // Create lesson label and status
    const labelContainer = createLessonLabelContainer(lesson);
    
    // Create lesson name
    const lessonName = createElement('div', 'home_st_lesson_name');
    lessonName.innerText = lesson.name;
    
    // Assemble lesson header
    lessonNameContainer.appendChild(labelContainer);
    lessonNameContainer.appendChild(lessonName);
    lessonHeaderContainer.appendChild(lessonNameContainer);
    
    return lessonHeaderContainer;
}

function createLessonLabelContainer(lesson) {
    const labelContainer = createElement('div', 'lesson-label-container');
    
    // Create status tag
    const lessonStatus = createElement('div');
    lessonStatus.innerText = lesson.status;
    lessonStatus.classList.add(getStatusTagClass(lesson.status));
    
    // Create lesson order label
    const labelBlockName = createElement('text', 'lesson-label-text');
    labelBlockName.innerText = `Module ${lesson.order}`;
    
    labelContainer.appendChild(lessonStatus);
    labelContainer.appendChild(labelBlockName);
    
    return labelContainer;
}

function addGradeButton(container, lesson) {
    const gradeButton = createElement('div', 'button_primary_m');
    gradeButton.innerText = 'Grade Module';
    
    gradeButton.addEventListener('click', () => {
        console.log('calc grades: ', lesson.id);
        getLessonGrades(lesson.id);
    });
    
    container.appendChild(gradeButton);
}

function renderLessonBlocks(lesson, container) {
    if (!lesson.blocks?.length) {
        renderEmptyBlocksMessage(container);
        return;
    }
    
    lesson.blocks.forEach((block, index) => {
        renderBlock(block, index + 1, container);
    });
}

function renderBlock(block, blockOrder, container) {
    const blockContainer = createBlockContainer(block, blockOrder);
    const gradesContainer = createGradesContainer(block.id);
    
    blockContainer.appendChild(gradesContainer);
    container.appendChild(blockContainer);
    
    // Load grades for this block
    fetchAndDisplayGrades(block.id, gradesContainer.id);
}

function createBlockContainer(block, blockOrder) {
    const blockContainer = createElement('div', 'course-progress-block-container bg-paper');
    
    // Block label
    const labelBlockName = createElement('label', 'label-text');
    labelBlockName.innerText = `Block ${blockOrder}`;
    
    // Block name
    const blockNameElement = createElement('div', 'li_block_name');
    blockNameElement.innerText = block.name;
    
    blockContainer.appendChild(labelBlockName);
    blockContainer.appendChild(blockNameElement);
    
    return blockContainer;
}

function createGradesContainer(blockId) {
    const gradesContainer = createElement('div', 'grades-container');
    gradesContainer.id = `grades-block-${blockId}`;
    return gradesContainer;
}

function renderEmptyBlocksMessage(container) {
    const emptyBlockContainer = createElement('div', 'empty-block-container');
    emptyBlockContainer.innerText = "No blocks found in this Module. If you added blocks and you don't see them here, ensure you published the module after adding those blocks.";
    container.appendChild(emptyBlockContainer);
}

// ===========================
// GRADES TABLE FUNCTIONS
// ===========================

async function fetchAndDisplayGrades(blockId, gradesContainerId) {
    const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/get_ub_grades';
    
    try {
        const response = await fetch(`${apiUrl}?block_id=${encodeURIComponent(blockId)}&role=student`);
        const data = await response.json();
        
        const gradesContainer = document.getElementById(gradesContainerId);
        
        if (data.length === 0) {
            renderEmptyGradesMessage(gradesContainer);
            return;
        }
        
        const table = createGradesTable(data, blockId);
        gradesContainer.innerHTML = '';
        gradesContainer.appendChild(table);
        
    } catch (error) {
        console.error('Error fetching or displaying grades:', error);
    }
}

function renderEmptyGradesMessage(container) {
    container.className = "empty-block-container";
    container.innerText = "No grades available for this block. This happens if the module hasn't been published or you haven't added any students to this course";
}

function createGradesTable(data, blockId) {
    const table = createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    
    // Create table header
    const thead = createTableHeader();
    const tbody = createTableBody(data, blockId);
    
    table.appendChild(thead);
    table.appendChild(tbody);
    
    return table;
}

function createTableHeader() {
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    headerRow.style.borderBottom = '1px solid #babbca';
    
    const headers = [
        { text: 'Name', width: '20%', align: 'left' },
        { text: 'Progress', width: '10%', align: 'left' },
        { text: 'Grade', width: '10%', align: 'left' },
        { text: 'Feedback', width: '40%', align: 'left' },
        { text: '', width: '6%', align: 'left' },  // View
        { text: '', width: '7%', align: 'left' },  // Clear
        { text: '', width: '7%', align: 'left' }   // Grade
    ];
    
    headers.forEach(header => {
        const th = createElement('th', 'table-header');
        th.textContent = header.text;
        th.style.width = header.width;
        if (header.align) {
            th.style.textAlign = header.align;
        }
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    return thead;
}

function createTableBody(data, blockId) {
    const tbody = createElement('tbody');
    
    data.forEach(item => {
        const row = createTableRow(item, blockId);
        tbody.appendChild(row);
    });
    
    return tbody;
}

function createTableRow(item, blockId) {
    const row = createElement('tr');
    
    // Name cell
    row.appendChild(createTextCell(item._user.name));
    
    // Progress cell
    row.appendChild(createProgressCell(item.status));
    
    // Grade cell
    row.appendChild(createTextCell(item.grade || ''));
    
    // Summary cell
    row.appendChild(createTextCell(item.work_summary || 'N/A'));
    
    // Action buttons
    row.appendChild(createViewCell(item));
    row.appendChild(createClearCell(item, blockId));
    row.appendChild(createGradeCell(item));
    
    return row;
}

function createTextCell(text) {
    const cell = createElement('td', 'table-row');
    cell.textContent = text;
    return cell;
}

function createProgressCell(status) {
    const cell = createElement('td', 'table-row');
    cell.style.padding = '0.5rem';
    
    const statusElement = createElement('div');
    statusElement.textContent = status || "Idle";
    statusElement.classList.add(getStatusTagClass(status));
    
    cell.appendChild(statusElement);
    return cell;
}

function createViewCell(item) {
    const cell = createElement('td', 'table-row');
    cell.style.padding = '0.5rem';
    
    const viewButton = createActionButton('View', 'button_inverse_s', () => {
        window.location.href = `/lesson-page-teacher-view?block_id=${item.block_id}&user_id=${item._user.id}`;
    });
    
    cell.appendChild(viewButton);
    return cell;
}

function createClearCell(item, blockId) {
    const cell = createElement('td', 'table-row');
    cell.style.padding = '0.5rem';
    
    const clearButton = createActionButton('Clear', 'button_red_s', (e) => {
        e.preventDefault();
        clearBlockGrades(item.id, blockId);
    });
    
    cell.appendChild(clearButton);
    return cell;
}

function createGradeCell(item) {
    const cell = createElement('td', 'table-row');
    cell.style.padding = '0.5rem';
    
    const gradeButton = createActionButton('Grade', 'button_primary_s', (e) => {
        e.preventDefault();
        gradeBlock(item.id);
    });
    
    cell.appendChild(gradeButton);
    return cell;
}

// ===========================
// API FUNCTIONS
// ===========================

async function clearBlockGrades(ub_id, block_id) {
    const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/clear_ub';
    
    try {
        const response = await fetch(`${apiUrl}?ub_id=${ub_id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        console.log('Grades cleared:', result);
        
        alert('Grades have been cleared for this block.');
        fetchAndDisplayGrades(block_id, `grades-block-${block_id}`);
        
    } catch (error) {
        console.error('Error clearing grades:', error);
    }
}

async function getLessonGrades(lesson_id) {
    const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/grade_lesson';
    
    try {
        const response = await fetch(`${apiUrl}?lesson_id=${lesson_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        console.log('Grades calculated:', result);
        
    } catch (error) {
        console.error('Error calculating lesson grades:', error);
    }
}

async function gradeBlock(ub_id) {
    console.log('Grading user block:', ub_id);
    const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/grade_ub';
    
    try {
        const response = await fetch(`${apiUrl}?ub_id=${ub_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        console.log('User Block grades calculated:', result);
        
    } catch (error) {
        console.error('Error grading block:', error);
    }
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

function createElement(tag, className = '') {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    return element;
}

function createActionButton(text, className, clickHandler) {
    const button = createElement('div', className);
    button.textContent = text;
    button.style.cursor = 'pointer';
    button.addEventListener('click', clickHandler);
    return button;
}

function getStatusTagClass(status) {
    switch (status) {
        case 'finished':
        case 'published':
            return 'done-tag';
        case 'started':
            return 'started-tag';
        case 'draft':
        default:
            return 'idle-tag';
    }
}

function displayErrorMessage(message) {
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
        mainContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
}