async function initializeTestProgressPage(course_id) {
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
        setupTestLessonSelector(course_id);
        
        // Display progress for the selected lesson
        if (selectedLessonId) {
            console.log('Displaying test progress for lesson ID:', selectedLessonId);
            
            // Display lesson title
            await displayLessonTitle(lessons, selectedLessonId);

            const gradeLessonButton = document.getElementById('grade-lesson-button');
            if (gradeLessonButton) {
                gradeLessonButton.addEventListener('click', () => gradeLessonTests(selectedLessonId, gradeLessonButton));
            }
            
            // Display test progress
            await displayTestProgress(course_id, selectedLessonId);
        }
        
        console.log('Test progress page initialized successfully');
        
    } catch (error) {
        console.error('Error initializing test progress page:', error);
        alert('Error loading page. Please try again.');
    }
}

function setupTestLessonSelector(course_id) {
    const lessonSelector = document.getElementById('lesson-selector');
    
    if (!lessonSelector) {
        console.error('Lesson selector element not found');
        return;
    }

    lessonSelector.addEventListener('change', function() {
        const selectedLessonId = this.value;
        
        console.log('Lesson selected:', selectedLessonId);
        
        if (selectedLessonId) {
            // Navigate to teacher course testing by module page
            const targetUrl = `/teacher/course-testing?course_id=${course_id}&lesson_id=${selectedLessonId}`;
            console.log('Navigating to:', targetUrl);
            window.location.href = targetUrl;
        }
    });
    
    console.log('Test lesson selector change handler set up successfully');
}

async function displayTestProgress(course_id, lesson_id) {
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
        renderTestProgress(blocksData);
        
    } catch (error) {
        console.error('Error fetching test progress:', error);
    }
}

// Modified renderTestProgress function
function renderTestProgress(blocksData) {
    const container = document.getElementById('student-progress-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    blocksData.forEach(block => {
        const blockWrapper = document.createElement('div');
        blockWrapper.className = 'pr-student-grades-wrapper';
        
        // Block name row with Add Test Chat button
        const nameContainer = document.createElement('div');
        nameContainer.className = 'pr-grade-row-container';
        nameContainer.style.display = 'flex';
        nameContainer.style.justifyContent = 'space-between';
        nameContainer.style.alignItems = 'center';
        
        const blockNameText = document.createElement('span');
        blockNameText.textContent = block.block_name;
        nameContainer.appendChild(blockNameText);
        
        const addTestButton = document.createElement('button');
        addTestButton.className = 'button_primary_m';
        addTestButton.textContent = 'Add Test Chat';
        addTestButton.addEventListener('click', () => showAddTestForm(block.block_id, blockWrapper));
        nameContainer.appendChild(addTestButton);
        
        blockWrapper.appendChild(nameContainer);
        
        // Block tests main container
        const testsMainContainer = document.createElement('div');
        testsMainContainer.className = 'pr-student-grades-main-container';
        
        block.tests.forEach(test => {
            const testElement = createTestElement(test, block.block_id);
            testsMainContainer.appendChild(testElement);
        });
        
        blockWrapper.appendChild(testsMainContainer);
        container.appendChild(blockWrapper);
    });
}

// Function to show the add test form
function showAddTestForm(blockId, blockWrapper) {
    const testsMainContainer = blockWrapper.querySelector('.pr-student-grades-main-container');
    
    // Create the add test form container
    const addTestContainer = document.createElement('div');
    addTestContainer.className = 'ts-add-test-row-container';
    
    const gradeButtonContainer = document.createElement('div');
    gradeButtonContainer.className = 'ts-add-test-form-container';
    
    // Empty div with class div24x24
    const div24x24 = document.createElement('div');
    div24x24.className = 'div24x24';
    gradeButtonContainer.appendChild(div24x24);
    
    // Input field
    const testNameInput = document.createElement('input');
    testNameInput.className = 'input-default-no-margin';
    testNameInput.placeholder = 'Enter the test name here';
    gradeButtonContainer.appendChild(testNameInput);
    
    // Add Test button
    const addButton = document.createElement('button');
    addButton.className = 'button_inverse_m';
    addButton.textContent = 'Add Test';
    addButton.addEventListener('click', () => handleAddTest(blockId, testNameInput, addTestContainer, testsMainContainer));
    gradeButtonContainer.appendChild(addButton);
    
    // Close button with icon
    const closeButton = document.createElement('button');
    closeButton.className = 'iconbutton_transp_s';
    closeButton.innerHTML = '<span class="material-symbols-outlined">close</span>';
    closeButton.addEventListener('click', () => addTestContainer.remove());
    gradeButtonContainer.appendChild(closeButton);
    
    addTestContainer.appendChild(gradeButtonContainer);
    
    // Insert at the beginning of testsMainContainer
    testsMainContainer.insertBefore(addTestContainer, testsMainContainer.firstChild);
}

// Function to handle adding a new test
async function handleAddTest(blockId, inputElement, formContainer, testsMainContainer) {
    const testName = inputElement.value.trim();
    
    // Validate test name
    if (!testName) {
        inputElement.style.borderColor = '#B91F21';
        return;
    }
    
    // Reset border color if validation passes
    inputElement.style.borderColor = '';
    
    try {
        // Call API to create test
        const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/test_ub', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                block_id: blockId,
                test_name: testName
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const newTest = await response.json();
        console.log('Test created successfully:', newTest);
        
        // Create UI element for the new test
        const newTestElement = createTestElement(newTest, blockId);
        
        // Remove the form
        formContainer.remove();
        
        // Add the new test at the top of the list (after any remaining forms)
        const firstNonFormElement = Array.from(testsMainContainer.children)
            .find(child => !child.classList.contains('ts-add-test-row-container'));
        
        if (firstNonFormElement) {
            testsMainContainer.insertBefore(newTestElement, firstNonFormElement);
        } else {
            testsMainContainer.appendChild(newTestElement);
        }
        
    } catch (error) {
        console.error('Error creating test:', error);
        alert('Error creating test. Please try again.');
    }
}

function createTestElement(test, block_id) {
    if (test.status === 'idle') {
        // Idle tests - show disabled Grade button
        return createUngradedTest(test, block_id, false);
    } else if (test.status === 'finished' || test.status === 'started') {
        // Check if grading output exists
        const hasGradingOutput = test.grading_output && Array.isArray(test.grading_output) && test.grading_output.length > 0;
        
        if (hasGradingOutput) {
            // Test is graded - show criteria and grades (can be either 'finished' OR 'started')
            return createGradedTest(test, block_id);
        } else {
            // Test is ready to be graded but hasn't been graded yet - show active Grade button
            return createUngradedTest(test, block_id, true);
        }
    } else {
        // Any other status - treat as not ready for grading
        return createUngradedTest(test, block_id, false);
    }
}

// Function to handle test deletion
async function deleteTest(testId, testElement) {
    // Show confirmation dialog
    const confirmDelete = confirm('Are you sure you want to delete this test? This action cannot be undone.');
    
    if (!confirmDelete) {
        return; // User cancelled
    }
    
    try {
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/test_ub?ub_id=${testId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Delete request failed with status ${response.status}`);
        }
        
        // Remove the test element from the DOM
        testElement.remove();
        console.log('Test deleted successfully:', testId);
        
    } catch (error) {
        console.error('Error deleting test:', error);
        alert('The deletion did not happen. Please try again.');
    }
}

// Modified createGradedTest function (add delete button after view button)
function createGradedTest(test, block_id) {
    const container = document.createElement('div');
    container.className = 'pr-grade-row-container-expanded';
    
    // First test-status-container
    const testStatusContainer = document.createElement('div');
    testStatusContainer.className = 'pr-block-status-container';
    
    const status = createStatusElement(test.status);
    testStatusContainer.appendChild(status);
    
    const testGradesContainer = document.createElement('div');
    testGradesContainer.className = 'pr-block-grades-container';
    
    const testName = document.createElement('div');
    testName.className = 'pr-block-name';
    testName.textContent = test.test_name;
    testName.addEventListener('click', () => {
        console.log('test id:', test.id);
        window.location.href = `lesson-page-teacher-view?block_id=${block_id}&ub_id=${test.id}`;
    });
    testGradesContainer.appendChild(testName);
    


    const gradeDetailsContainer = document.createElement('div');
    gradeDetailsContainer.className = 'pr-grade-details-container';
    
    test.grading_output.forEach(criterion => {
        const criterionElement = createTestCriterionElement(criterion);
        gradeDetailsContainer.appendChild(criterionElement);
    });
    
    testGradesContainer.appendChild(gradeDetailsContainer);
    testStatusContainer.appendChild(testGradesContainer);
    
    container.appendChild(testStatusContainer);

    // Second grade-button-container
    const secondButtonContainer = document.createElement('div');
    secondButtonContainer.className = 'pr-grade-button-container';
    
    const totalGrade = test.grading_output.reduce((sum, criterion) => sum + (criterion.grade || 0), 0);
    const gradeText = document.createElement('div');
    gradeText.className = 'body_m';
    gradeText.textContent = totalGrade.toString();
    secondButtonContainer.appendChild(gradeText);
    
    const gradeButton = document.createElement('button');
    gradeButton.className = 'button_primary_s';
    gradeButton.textContent = 'Grade';
    gradeButton.addEventListener('click', () => gradeTestBlock(test.id, gradeButton));
    secondButtonContainer.appendChild(gradeButton);

    const viewButton = document.createElement('button');
    viewButton.className = 'iconbutton_transp_s';
    viewButton.innerHTML = '<span class="material-symbols-outlined" style = "font-size: 1.2rem;">arrow_right_alt</span>';
    viewButton.addEventListener('click', () => {
        console.log('test id:', test.id);
        window.location.href = `lesson-page-teacher-view?ub_id=${test.id}`;
    });
    secondButtonContainer.appendChild(viewButton);
    
    // ADD DELETE BUTTON HERE
    const deleteButton = document.createElement('button');
    deleteButton.className = 'icon_red_transp_s';
    deleteButton.innerHTML = '<span class="material-symbols-outlined" style = "font-size: 1.2rem;">delete</span>';
    deleteButton.addEventListener('click', () => deleteTest(test.id, container));
    secondButtonContainer.appendChild(deleteButton);
    
    container.appendChild(secondButtonContainer);
    
    return container;
}

// Corrected createUngradedTest function
function createUngradedTest(test, block_id, showGradeButton) {
    const container = document.createElement('div');
    container.className = 'pr-grade-row-container';

    const testStatusContainer = document.createElement('div');
    testStatusContainer.className = 'pr-block-status-container';
    
    const status = createStatusElement(test.status);
    testStatusContainer.appendChild(status);
    
    const testGradesContainer = document.createElement('div');
    testGradesContainer.className = 'pr-block-grades-container';
    
    const testName = document.createElement('div');
    testName.className = 'pr-block-name';
    testName.textContent = test.test_name;
    testName.addEventListener('click', () => {
        console.log('test id:', test.id);
        window.location.href = `lesson-page-teacher-view?block_id=${block_id}&ub_id=${test.id}`;
    });
    testGradesContainer.appendChild(testName);
    
    testStatusContainer.appendChild(testGradesContainer);

    container.appendChild(testStatusContainer);
    
    const secondButtonContainer = document.createElement('div');
    secondButtonContainer.className = 'pr-grade-button-container';

    const gradeButton = document.createElement('button');
    gradeButton.textContent = 'Grade';
    
    if (showGradeButton) {
        // For finished/started tests - active button
        gradeButton.className = 'button_primary_s';
        gradeButton.addEventListener('click', () => gradeTestBlock(test.id, gradeButton));
    } else {
        // For idle tests - disabled button
        gradeButton.className = 'button_disabled_s';
    }
    
    secondButtonContainer.appendChild(gradeButton);

    const viewButton = document.createElement('button');
    viewButton.className = 'iconbutton_transp_s';
    viewButton.innerHTML = '<span class="material-symbols-outlined" style = "font-size: 1.2rem;">arrow_right_alt</span>';
    viewButton.addEventListener('click', () => {
        console.log('test id:', test.id);
        window.location.href = `lesson-page-teacher-view?block_id=${block_id}&ub_id=${test.id}`;
    });
    secondButtonContainer.appendChild(viewButton);
    
    // ADD DELETE BUTTON HERE
    const deleteButton = document.createElement('button');
    deleteButton.className = 'icon_red_transp_s';
    deleteButton.innerHTML = '<span class="material-symbols-outlined" style = "font-size: 1.2rem;">delete</span>';
    deleteButton.addEventListener('click', () => deleteTest(test.id, container));
    secondButtonContainer.appendChild(deleteButton);

    testStatusContainer.appendChild(secondButtonContainer);
    
    return container;
}

function createTestCriterionElement(criterion) {
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
    summaryText.textContent = (criterion.summary || '');
    container.appendChild(summaryText);
    
    return container;
}

async function gradeTestBlock(ub_id, gradeButton) {
    console.log('Grading user block:', ub_id);
    gradeButton.textContent = 'Wait...';
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
        
        // Refresh the student progress display after successful grading
        await refreshTestProgress();
        
    } catch (error) {
        console.error('Error grading block:', error);
        // Optionally show an error message to the user
        alert('Error grading block. Please try again.');
    }
}

async function refreshTestProgress() {
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
        
        console.log('Refreshing test progress for lesson:', selectedLessonId);
        
        // Re-fetch and display the updated test progress
        await displayTestProgress(course_id, selectedLessonId);
        
        console.log('Test progress refreshed successfully');
        
    } catch (error) {
        console.error('Error refreshing test progress:', error);
    }
}



async function gradeLessonTests(lesson_id, gradeLessonButton) {
    const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/grade_lesson_tests';
    
    try {
        gradeLessonButton.textContent = 'Grading...';
        alert('Grading process started. Feel free to leave the page in a few seconds. Grading will continue on the background');
        
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
        //console.log('Grades calculated:', result);
        
        // Only refresh and update button if user is still on the page
        if (document.visibilityState === 'visible') {
            refreshTestProgress();
            // You might want to reset the button text here too
            gradeLessonButton.textContent = 'Grade Lesson'; // or whatever the original text was
        }
        
    } catch (error) {
        console.error('Error calculating lesson grades:', error);
        
        // Only update button if user is still on the page
        if (document.visibilityState === 'visible') {
            gradeLessonButton.textContent = 'Grade Lesson'; // Reset button on error
        }
    }
}