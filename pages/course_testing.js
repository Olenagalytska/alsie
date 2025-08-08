async function initializeTestChatsPage(course_id) {
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
        setupLessonSelectorForTests(course_id);
        
        // Display test chats for the selected lesson
        if (selectedLessonId) {
            console.log('Displaying test chats for lesson ID:', selectedLessonId);
            
            // Display lesson title
            await displayLessonTitle(lessons, selectedLessonId);

            const gradeAllTestsButton = document.getElementById('grade-all-tests-button');
            if (gradeAllTestsButton) {
                gradeAllTestsButton.addEventListener('click', () => gradeAllTests(selectedLessonId));
            }
            
            // Display test chats progress
            await displayTestChats(selectedLessonId);
        }
        
        console.log('Test chats page initialized successfully');
        
    } catch (error) {
        console.error('Error initializing test chats page:', error);
        alert('Error loading page. Please try again.');
    }
}

function setupLessonSelectorForTests(course_id) {
    const lessonSelector = document.getElementById('lesson-selector');
    
    if (!lessonSelector) {
        console.error('Lesson selector element not found');
        return;
    }

    lessonSelector.addEventListener('change', function() {
        const selectedLessonId = this.value;
        
        console.log('Lesson selected:', selectedLessonId);
        
        if (selectedLessonId) {
            // Navigate to teacher course testing page by module
            const targetUrl = `/teacher/course-testing?course_id=${course_id}&lesson_id=${selectedLessonId}`;
            console.log('Navigating to:', targetUrl);
            window.location.href = targetUrl;
        }
    });
    
    console.log('Test chats lesson selector change handler set up successfully');
}

async function displayTestChats(lesson_id) {
    try {
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/test_ub?lesson_id=${lesson_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        const blocksData = result.progress_by_module;
        console.log('Loaded test data: ', blocksData);
        renderTestChats(blocksData);
        
    } catch (error) {
        console.error('Error fetching test chats:', error);
        // Display error message to user
        const container = document.getElementById('student-chats-container');
        if (container) {
            container.innerHTML = '<div class="error-message">Error loading test chats. Please try again.</div>';
        }
    }
}

function renderTestChats(blocksData) {
    const container = document.getElementById('student-chats-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    blocksData.forEach(block => {
        const blockWrapper = document.createElement('div');
        blockWrapper.className = 'pr-block-wrapper';
        
        // Block name header
        const blockHeader = document.createElement('div');
        blockHeader.className = 'pr-block-header';
        
        const blockName = document.createElement('div');
        blockName.className = 'pr-block-name';
        blockName.textContent = block.block_name;
        blockHeader.appendChild(blockName);
        
        const blockInfo = document.createElement('div');
        blockInfo.className = 'pr-block-info';
        blockInfo.textContent = `${block.tests.length} test${block.tests.length !== 1 ? 's' : ''}`;
        blockHeader.appendChild(blockInfo);
        
        blockWrapper.appendChild(blockHeader);
        
        // Tests container
        const testsContainer = document.createElement('div');
        testsContainer.className = 'pr-tests-container';
        
        block.tests.forEach(test => {
            const testElement = createTestElement(test, block.block_id);
            testsContainer.appendChild(testElement);
        });
        
        blockWrapper.appendChild(testsContainer);
        container.appendChild(blockWrapper);
    });
}

function createTestElement(test) {
    const hasGrades = test.grading_output && Array.isArray(test.grading_output) && test.grading_output.length > 0;
    
    if (hasGrades) {
        return createGradedTest(test);
    } else {
        return createUngradedTest(test);
    }
}

function createGradedTest(test) {
    const container = document.createElement('div');
    container.className = 'pr-test-container-expanded';
    
    // Test header with status and name
    const testHeader = document.createElement('div');
    testHeader.className = 'pr-test-header';
    
    const statusContainer = document.createElement('div');
    statusContainer.className = 'pr-test-status-container';
    
    const status = createTestStatusElement(test.status);
    statusContainer.appendChild(status);
    
    const testInfo = document.createElement('div');
    testInfo.className = 'pr-test-info-container';
    
    const testName = document.createElement('div');
    testName.className = 'pr-test-name';
    testName.textContent = test.test_name;
    testInfo.appendChild(testName);
    
    const testType = document.createElement('div');
    testType.className = 'pr-test-type';
    testType.textContent = test.type === 'manual_test' ? 'Manual Test' : 'Auto Test';
    testInfo.appendChild(testType);
    
    statusContainer.appendChild(testInfo);
    testHeader.appendChild(statusContainer);
    
    // Grades details
    const gradesContainer = document.createElement('div');
    gradesContainer.className = 'pr-grades-container';
    
    test.grading_output.forEach(criterion => {
        const criterionElement = createTestCriterionElement(criterion);
        gradesContainer.appendChild(criterionElement);
    });
    
    testHeader.appendChild(gradesContainer);
    container.appendChild(testHeader);
    
    // Action buttons
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'pr-test-actions-container';
    
    const totalGrade = test.grading_output.reduce((sum, criterion) => sum + (criterion.grade || 0), 0);
    const gradeText = document.createElement('div');
    gradeText.className = 'pr-total-grade';
    gradeText.textContent = totalGrade.toString();
    actionsContainer.appendChild(gradeText);
    
    const collapseButton = document.createElement('button');
    collapseButton.className = 'button_secondary_s';
    collapseButton.textContent = 'Collapse';
    collapseButton.addEventListener('click', () => collapseTest(container, test));
    actionsContainer.appendChild(collapseButton);
    
    const gradeButton = document.createElement('button');
    gradeButton.className = 'button_primary_s';
    gradeButton.textContent = 'Re-grade';
    gradeButton.addEventListener('click', () => gradeTest(test.lesson_id));
    actionsContainer.appendChild(gradeButton);

    const viewButton = document.createElement('button');
    viewButton.className = 'button_inverse_s';
    viewButton.textContent = 'View Chat';
    if (test.thread_id) {
        viewButton.addEventListener('click', () => {
            window.location.href = `lesson-page-teacher-view?ub_id=${test.id}`;
        });
    } else {
        viewButton.disabled = true;
        viewButton.className = 'button_disabled_s';
    }
    actionsContainer.appendChild(viewButton);
    
    container.appendChild(actionsContainer);
    
    return container;
}

function createUngradedTest(test) {
    const container = document.createElement('div');
    container.className = 'pr-test-container';
    
    const testHeader = document.createElement('div');
    testHeader.className = 'pr-test-header';
    
    const statusContainer = document.createElement('div');
    statusContainer.className = 'pr-test-status-container';
    
    const status = createTestStatusElement(test.status);
    statusContainer.appendChild(status);
    
    const testInfo = document.createElement('div');
    testInfo.className = 'pr-test-info-container';
    
    const testName = document.createElement('div');
    testName.className = 'pr-test-name';
    testName.textContent = test.test_name;
    testInfo.appendChild(testName);
    
    const testType = document.createElement('div');
    testType.className = 'pr-test-type';
    testType.textContent = test.type === 'manual_test' ? 'Manual Test' : 'Auto Test';
    testInfo.appendChild(testType);
    
    statusContainer.appendChild(testInfo);
    testHeader.appendChild(statusContainer);
    
    // Action buttons
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'pr-test-actions-container';
    
    const gradeButton = document.createElement('button');
    gradeButton.textContent = 'Grade';
    
    if (test.status === 'finished' || test.status === 'started') {
        gradeButton.className = 'button_primary_s';
        gradeButton.addEventListener('click', () => gradeTest(test.lesson_id));
    } else {
        gradeButton.className = 'button_disabled_s';
        gradeButton.disabled = true;
    }
    
    actionsContainer.appendChild(gradeButton);

    const viewButton = document.createElement('button');
    viewButton.className = 'button_inverse_s';
    viewButton.textContent = 'View Chat';
    if (test.thread_id && (test.status === 'finished' || test.status === 'started')) {
        viewButton.addEventListener('click', () => {
            window.location.href = `lesson-page-teacher-view?ub_id=${test.id}`;
        });
    } else {
        viewButton.disabled = true;
        viewButton.className = 'button_disabled_s';
    }
    actionsContainer.appendChild(viewButton);
    
    testHeader.appendChild(actionsContainer);
    container.appendChild(testHeader);
    
    return container;
}

function createTestStatusElement(status) {
    const statusImg = document.createElement('img');
    statusImg.className = 'pr-status-icon';
    
    switch(status) {
        case 'finished':
            statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c89df353f89d2f162e_Status%3DDone.svg';
            statusImg.alt = 'Finished';
            statusImg.title = 'Test completed';
            break;
        case 'started':
            statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c8060fc4bd6aad4b6b_Status%3DIn%20Progress.svg';
            statusImg.alt = 'In progress';
            statusImg.title = 'Test in progress';
            break;
        case 'idle':
            statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c8b88ac6941a4b04a3_Status%3DIdle.svg';
            statusImg.alt = 'Not started';
            statusImg.title = 'Test not started';
            break;
        default:
            statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c8b88ac6941a4b04a3_Status%3DIdle.svg';
            statusImg.alt = 'Unknown status';
            statusImg.title = 'Unknown status';
    }
    
    return statusImg;
}

function createTestCriterionElement(criterion) {
    const container = document.createElement('div');
    container.className = 'pr-criterion-container';
    
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
    
    if (criterion.max_points) {
        const maxPoints = document.createElement('div');
        maxPoints.className = 'pr-criterion-grade-max-points';
        maxPoints.textContent = '/' + criterion.max_points;
        gradeContainer.appendChild(maxPoints);
    }
    
    nameContainer.appendChild(gradeContainer);
    container.appendChild(nameContainer);
    
    if (criterion.summary || criterion.grading_comment) {
        const summaryText = document.createElement('div');
        summaryText.className = 'pr-criterion-summary-text';
        summaryText.textContent = (criterion.summary || '') + ' ' + (criterion.grading_comment || '');
        container.appendChild(summaryText);
    }
    
    return container;
}

function collapseTest(expandedContainer, test) {
    // Replace expanded test with collapsed version
    const collapsedTest = createUngradedTest(test);
    expandedContainer.parentNode.replaceChild(collapsedTest, expandedContainer);
    
    // Add expand functionality to the collapsed test
    const expandButton = document.createElement('button');
    expandButton.className = 'button_secondary_s';
    expandButton.textContent = 'Expand';
    expandButton.addEventListener('click', () => {
        const expandedTest = createGradedTest(test);
        collapsedTest.parentNode.replaceChild(expandedTest, collapsedTest);
    });
    
    const actionsContainer = collapsedTest.querySelector('.pr-test-actions-container');
    if (actionsContainer) {
        actionsContainer.insertBefore(expandButton, actionsContainer.firstChild);
    }
}

async function gradeTest(ub_id) {
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
        
        // Refresh the test chats display after successful grading
        await refreshTestChats();
        
    } catch (error) {
        console.error('Error grading block:', error);
        alert('Error grading block. Please try again.');
    }
}

async function gradeAllTests(lesson_id) {
    console.log('Grading all tests for lesson:', lesson_id);
    const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/grade_all_lesson_tests';
    
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
        console.log('All tests graded successfully:', result);
        
        // Refresh the test chats display after successful grading
        await refreshTestChats();
        
    } catch (error) {
        console.error('Error grading all tests:', error);
        alert('Error grading all tests. Please try again.');
    }
}

async function refreshTestChats() {
    try {
        // Get the current lesson_id from the URL or lesson selector
        const urlLessonId = getUrlParameters('lesson_id');
        const lessonSelector = document.getElementById('lesson-selector');
        const selectedLessonId = urlLessonId || (lessonSelector ? lessonSelector.value : null);
        
        if (!selectedLessonId) {
            console.error('No lesson ID available for refresh');
            return;
        }
        
        console.log('Refreshing test chats for lesson:', selectedLessonId);
        
        // Re-fetch and display the updated test chats
        await displayTestChats(selectedLessonId);
        
        console.log('Test chats refreshed successfully');
        
    } catch (error) {
        console.error('Error refreshing test chats:', error);
    }
}