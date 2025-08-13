function displayCourse(course_id) {
    const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/lesson_full';
    fetch(`${apiUrl}?course_id=${course_id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        const mainContainer = document.getElementById('main-container');
        if (!mainContainer) {
            console.error('Main container not found');
            return;
        }
        mainContainer.innerHTML = ''; // Clear previous content
        
        // Populate course title
        const courseTitleBlock = document.getElementById('course-name-title');
        if (courseTitleBlock) {
            courseTitleBlock.textContent = data[0]?._course.name || 'Unknown Course';
        }
        
        // Setup add lesson button
        const addLessonButton = document.getElementById('add-lesson-button');
        addLessonButton.title = "Add new module to this course";
        if (addLessonButton) {
            // Remove any existing event listeners to prevent duplicates
            addLessonButton.replaceWith(addLessonButton.cloneNode(true));
            const newAddLessonButton = document.getElementById('add-lesson-button');
            
            newAddLessonButton.addEventListener('click', function () {
                // Calculate the correct order (should be 1 for first position)
                const nextOrder = 1;
                
                // Create and append the empty lesson form to the main container
                const emptyLessonForm = displayEmptyLessonForm(course_id, nextOrder);
                
                // Insert at the beginning of main container (first position)
                if (mainContainer.firstChild) {
                    mainContainer.insertBefore(emptyLessonForm, mainContainer.firstChild);
                } else {
                    mainContainer.appendChild(emptyLessonForm);
                }
                
                // Optionally disable the add button while form is active
                newAddLessonButton.disabled = true;
                newAddLessonButton.innerText = 'Adding Module...';
                
                // Re-enable button when form is cancelled or submitted
                // You might want to handle this in the displayEmptyLessonForm function
            });
        }
        
        // Render existing lessons (with adjusted orders)
        data.forEach(lesson => {
            const lessonElement = displayLesson(lesson, course_id);
            mainContainer.appendChild(lessonElement);
        });
    })
    .catch(error => console.error('Error fetching lessons:', error));
}

/**
 * Display a single lesson and return the DOM element
 */
function displayLesson(lesson, course_id) {
    // Lesson content wrapper
    const lessonContentWrapper = document.createElement('div');
    lessonContentWrapper.className = 'cc-lesson-content-wrapper';
    
    // Lesson menu container
    const lessonMenuContainer = document.createElement('div');
    lessonMenuContainer.className = 'cc-lesson-menu-container';
    
    // Lesson content container
    const lessonContentContainer = document.createElement('div');
    lessonContentContainer.className = 'cc-lesson-content-container';

    // Create lesson header
    const lessonNameContainer = document.createElement('div');
    lessonNameContainer.className = 'cc-lesson-name';

    // Create status and module label
    const lessonStatus = document.createElement('div');
    lessonStatus.innerText = lesson.status;
    if (lesson.status === "draft") {
        lessonStatus.classList.add('idle-tag');
    } else if (lesson.status === "published") {
        lessonStatus.classList.add('done-tag');
    }

    const moduleLabel = document.createElement('div');
    moduleLabel.className = 'lesson-label-text';
    moduleLabel.innerText = `Module ${lesson.order}`;

    const labelContainer = document.createElement('div');
    labelContainer.classList.add('cc-lesson-header');
    labelContainer.appendChild(moduleLabel);
    labelContainer.appendChild(lessonStatus);
    

    // Create lesson name input
    const lessonNameInput = document.createElement('input');
    lessonNameInput.className = 'cc-lesson-input';
    lessonNameInput.value = lesson.name;

    // Create lesson label
    const lessonDescriptionLabel = document.createElement('div');
    lessonDescriptionLabel.className = 'label-text';
    lessonDescriptionLabel.innerText = "Description";
    
    // Create lesson description
    const lessonDescriptionInput = document.createElement('textarea');
    lessonDescriptionInput.className = 'text-area-invis';
    //lessonDescriptionInput.classList.add('no-v-margin');
    lessonDescriptionInput.placeholder = 'Add module description here';
    lessonDescriptionInput.value = lesson.description;
    autoResizeTextarea(lessonDescriptionInput);

    // Create Save Changes button (initially hidden)
    const saveChangesButton = document.createElement('button');
    saveChangesButton.className = 'button_inverse_s';
    saveChangesButton.innerText = 'Save Changes';
    saveChangesButton.style.display = 'none';
    saveChangesButton.addEventListener('click', () => {
        postLesson(lesson.id, course_id, lesson.order, lessonNameInput.value, lessonDescriptionInput.value, saveChangesButton);
        autoResizeTextarea(lessonDescriptionInput);
    });

    // Function to show/hide save button based on changes
    function checkForChanges() {
        const nameChanged = lessonNameInput.value !== lesson.name;
        const descriptionChanged = lessonDescriptionInput.value !== lesson.description;
        
        if (nameChanged || descriptionChanged) {
            saveChangesButton.style.display = 'block';
        } else {
            saveChangesButton.style.display = 'none';
        }
    }

    // Add event listeners to inputs
    lessonNameInput.addEventListener('input', checkForChanges);
    lessonDescriptionInput.addEventListener('input', checkForChanges);

    
    // Assemble lesson header
    lessonNameContainer.appendChild(labelContainer);
    lessonNameContainer.appendChild(lessonNameInput);
    lessonNameContainer.appendChild(lessonDescriptionLabel);
    autoResizeTextarea(lessonDescriptionInput);
    lessonNameContainer.appendChild(lessonDescriptionInput);
    lessonNameContainer.appendChild(saveChangesButton);

    lessonContentContainer.appendChild(lessonNameContainer);

    
    // Create blocks container
    const blocksContainer = document.createElement('div');
    blocksContainer.className = 'cc-block-list';

    // Create container for blocks label and add button
    const blocksHeaderContainer = document.createElement('div');
    blocksHeaderContainer.className = 'cc-block-header-container';

    const blocksLabel = document.createElement('text');
    blocksLabel.className = 'label-text';
    blocksLabel.innerText = 'Blocks';

    // Create Add Block button for first position
    const addFirstBlockButton = document.createElement('button');
    addFirstBlockButton.className = 'button_primary_s';
    addFirstBlockButton.innerText = 'Add Block';
    addFirstBlockButton.addEventListener('click', () => {
        addBlockToFirstPosition(lesson.id, course_id, lessonContentWrapper);
    });

    // Assemble header container
    blocksHeaderContainer.appendChild(blocksLabel);
    blocksHeaderContainer.appendChild(addFirstBlockButton);

    // Add header to blocks container
    blocksContainer.appendChild(blocksHeaderContainer);

    // Render blocks
    if (lesson.blocks && Array.isArray(lesson.blocks) && lesson.blocks.length > 0) {
        lesson.blocks.forEach(block => {
            displayBlock(block, lesson.id, blocksContainer, course_id);
        });
    }

    lessonContentContainer.appendChild(blocksContainer);

    // Create menu buttons
    const deleteLessonButton = document.createElement('button');
    deleteLessonButton.className = 'button_red_s';
    deleteLessonButton.innerText = 'Delete Module';
    deleteLessonButton.addEventListener('click', () => {
        deleteLesson(lesson.id, course_id);
    });

    const publishLessonButton = document.createElement('button');
    if (lesson.status === 'published') {
        publishLessonButton.className = 'button_secondary_s';
        publishLessonButton.innerText = 'Unpublish';
        publishLessonButton.addEventListener('click', () => {
            unPublishLesson(lesson.id, course_id);
        });
    } else {
        publishLessonButton.className = 'button_primary_s';
        publishLessonButton.innerText = 'Publish';
        publishLessonButton.addEventListener('click', () => {
            publishLesson(lesson.id, course_id);
        });
    }

    lessonMenuContainer.appendChild(deleteLessonButton);
    lessonMenuContainer.appendChild(publishLessonButton);

    // Assemble final structure
    lessonContentWrapper.appendChild(lessonContentContainer);
    lessonContentWrapper.appendChild(lessonMenuContainer);
    
    removeFocusOutlineFromContainer(lessonContentWrapper);

    return lessonContentWrapper; // Return the content container to match original behavior
}


function displayEmptyLessonForm(course_id, order) {
    // Lesson content wrapper
    const lessonContentWrapper = document.createElement('div');
    lessonContentWrapper.className = 'cc-lesson-content-wrapper';
    
    // Lesson menu container
    const lessonMenuContainer = document.createElement('div');
    lessonMenuContainer.className = 'cc-lesson-menu-container';
    
    // Lesson content container
    const lessonContentContainer = document.createElement('div');
    lessonContentContainer.className = 'cc-lesson-content-container';

    // Create lesson header
    const lessonNameContainer = document.createElement('div');
    lessonNameContainer.className = 'cc-lesson-name';

    // Create status and module label
    const lessonStatus = document.createElement('div');
    lessonStatus.innerText = 'draft';
    lessonStatus.classList.add('idle-tag');

    const moduleLabel = document.createElement('h6');
    //moduleLabel.className = 'lesson-label-text';
    moduleLabel.innerText = 'Add Module';

    const labelContainer = document.createElement('div');
    labelContainer.classList.add('cc-lesson-header');
    labelContainer.appendChild(moduleLabel);
    labelContainer.appendChild(lessonStatus);

    // Create lesson name input
    const lessonNameInput = document.createElement('input');
    lessonNameInput.className = 'cc-add-lesson-input';
    lessonNameInput.placeholder = 'Enter module name';
    lessonNameInput.value = '';

    // Create lesson label
    const lessonDescriptionLabel = document.createElement('div');
    lessonDescriptionLabel.className = 'label-text';
    lessonDescriptionLabel.innerText = "Description";
    
    // Create lesson description
    const lessonDescriptionInput = document.createElement('textarea');
    lessonDescriptionInput.className = 'text-area-def';
    //lessonDescriptionInput.classList.add('no-v-margin');
    lessonDescriptionInput.placeholder = 'Add module description here';
    lessonDescriptionInput.value = '';
    //initAutoResize(lessonDescriptionInput); // Use the initialization function

    // Assemble lesson header
    lessonNameContainer.appendChild(labelContainer);
    lessonNameContainer.appendChild(lessonNameInput);
    lessonNameContainer.appendChild(lessonDescriptionLabel);
    lessonNameContainer.appendChild(lessonDescriptionInput);

    lessonContentContainer.appendChild(lessonNameContainer);

    // Create menu buttons
    const cancelButton = document.createElement('button');
    cancelButton.className = 'button_secondary_s';
    cancelButton.innerText = 'Cancel';
    cancelButton.addEventListener('click', () => {
        lessonContentWrapper.remove();
    });

    const addModuleButton = document.createElement('button');
    addModuleButton.className = 'button_inverse_s';
    addModuleButton.innerText = 'Add Module';
    addModuleButton.addEventListener('click', async () => {
        const lessonName = lessonNameInput.value.trim();
        const lessonDescription = lessonDescriptionInput.value.trim();
        
        if (!lessonName) {
            alert('Please enter a module name');
            lessonNameInput.focus();
            return;
        }
        
        try {
            // Disable button and show loading state
            addModuleButton.disabled = true;
            addModuleButton.innerText = 'Adding...';
            
            // Call postLesson function to create the lesson
            await postLesson(null, course_id, order, lessonName, lessonDescription);
            
            // Remove the empty form
            lessonContentWrapper.remove();
            
            // Re-display the entire course to show the new lesson
            displayCourse(course_id);
            
        } catch (error) {
            console.error('Error creating lesson:', error);
            alert('Failed to create module. Please try again.');
            
            // Reset button state
            addModuleButton.disabled = false;
            addModuleButton.innerText = 'Add Module';
        }
    });

    // Add Enter key support for the lesson name input
    lessonNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addModuleButton.click();
        }
    });

    // Lesson content container
    const lessonButtonsContainer = document.createElement('div');
    lessonButtonsContainer.className = 'cc-lesson-header';

    
    
    lessonButtonsContainer.appendChild(addModuleButton);
    lessonButtonsContainer.appendChild(cancelButton);
    lessonContentContainer.appendChild(lessonButtonsContainer);

    // Assemble final structure
    lessonContentWrapper.appendChild(lessonContentContainer);
    lessonContentWrapper.appendChild(lessonMenuContainer);

    // Focus on the lesson name input for better UX
    setTimeout(() => {
        lessonNameInput.focus();
    }, 100);
    
    removeFocusOutlineFromContainer(lessonContentWrapper);

    return lessonContentWrapper;
}


// POST function for updating lesson
async function postLesson(lesson_id, course_id, order, name, description, saveButton) {
    try {
        // Show loading state on the specific button
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerText = 'Saving...';
        }
        
        const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/lesson', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lesson_id: lesson_id,
                course_id: course_id,
                order: order,
                name: name,
                description: description
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Lesson updated successfully:', result);
        
        // Hide and reset the specific save button
        if (saveButton) {
            saveButton.style.display = 'none';
            saveButton.disabled = false;
            saveButton.innerText = 'Save Changes';
        }
        
        // Optional: Show success message
        // alert('Lesson updated successfully!');
        
        return result;
    } catch (error) {
        console.error('Error updating lesson:', error);
        // Optional: Show error message
        alert('Error updating lesson. Please try again.');
        throw error;
    }
}

function displayBlock(block, lesson_id, container, course_id) {
  // Create main block container
  const blockDiv = document.createElement('div');
  blockDiv.className = 'cc-block-container';
  blockDiv.setAttribute('data-block-id', block.id); // Add data attribute for easy finding
  
  // Create block name element (now clickable for edit)
  const blockName = document.createElement('div');
  blockName.className = 'cc-block-name';
  blockName.innerText = block.name;
  blockName.style.cursor = 'pointer'; // Visual indicator that it's clickable
  
  // Add click event to block name for edit functionality
  blockName.addEventListener('click', () => {
    window.location.href = `/teacher/edit-block?block_id=${block.id}`;
  });
  
  // Create button container (initially hidden)
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'cc-block-button-container';
  buttonContainer.style.opacity = '0';
  buttonContainer.style.transition = 'opacity 0.3s ease';
  
  // Create Delete button
  const deleteButton = document.createElement('button');
  deleteButton.className = 'button_red_s';
  deleteButton.innerText = 'Delete';
  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering block name click
    
    // Show confirmation alert before deleting
    if (confirm('You are trying to delete a block. This operation is unreversible. When deleting a block you also delete all student chats associated with it, as well as feedback and evaluations. Proceed?')) {
      deleteBlock(block.id, lesson_id, course_id);
    }
  });
  
  // Create Move button
  const moveButton = document.createElement('button');
  moveButton.className = 'button_secondary_s';
  moveButton.innerText = 'Move';
  moveButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering block name click
    console.log('Move button clicked for block:', block.id);
    // Keep idle for now as requested
  });
  
  // Create Add button
  const addButton = document.createElement('button');
  addButton.className = 'button_primary_s';
  addButton.innerText = 'Add';
  addButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering block name click
    addBlock(block.id, lesson_id, course_id); // Call the addBlock function
  });
  
  // Assemble button container
  buttonContainer.appendChild(deleteButton);
  buttonContainer.appendChild(moveButton);
  buttonContainer.appendChild(addButton);
  
  // Add hover effects to main block container
  blockDiv.addEventListener('mouseenter', () => {
    buttonContainer.style.opacity = '1';
  });
  
  blockDiv.addEventListener('mouseleave', () => {
    buttonContainer.style.opacity = '0';
  });
  
  // Assemble the structure
  blockDiv.appendChild(blockName);
  blockDiv.appendChild(buttonContainer);
  
  // Add to container
  container.appendChild(blockDiv);
  removeFocusOutlineFromContainer(blockDiv);
  return blockDiv;
}

function addBlock(prev_block_id, lesson_id, course_id) {
  // Create the add block container
  const addBlockDiv = document.createElement('div');
  addBlockDiv.className = 'cc-block-container';
  
  // Create input for block name
  const blockNameInput = document.createElement('input');
  blockNameInput.className = 'input-default';
  blockNameInput.classList.add('no-v-margin');
  blockNameInput.type = 'text';
  blockNameInput.placeholder = 'Enter block name';
    removeFocusOutlineFromContainer(addBlockDiv);

  // Create Add Block button
  const addBlockButton = document.createElement('button');
  addBlockButton.className = 'button_inverse_m';
  addBlockButton.innerText = 'Add Block';
  
  // Create Cancel button with SVG
  const cancelButton = document.createElement('button');
  cancelButton.className = 'iconbutton_secondary_s';
  
  // Create and configure the SVG image
  const cancelIcon = document.createElement('img');
  cancelIcon.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/685c52a6d22aaec1335578d4_Close%20Primary.svg';
  cancelIcon.alt = 'Cancel';
  cancelButton.appendChild(cancelIcon);
  
  // Add cancel functionality
  cancelButton.addEventListener('click', () => {
    addBlockDiv.remove();
  });
  
  // Add event listener to the Add Block button
  addBlockButton.addEventListener('click', async () => {
    const blockName = blockNameInput.value.trim();
    
    if (!blockName) {
      alert('Please enter a block name');
      return;
    }
    
    try {
      // Disable button and show loading state
      addBlockButton.disabled = true;
      addBlockButton.innerText = 'Adding...';
      
      // Make API call to create new block
      const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          block_name: blockName,
          prev_id: prev_block_id,
          lesson_id: lesson_id
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const newBlock = await response.json();
      console.log('New block created:', newBlock);
      
      // Remove the add block input container
      addBlockDiv.remove();
      
      // Re-display the entire course to show the new block in the correct position
      displayCourse(course_id);
      
    } catch (error) {
      console.error('Error creating block:', error);
      alert('Failed to create block. Please try again.');
      
      // Reset button state
      addBlockButton.disabled = false;
      addBlockButton.innerText = 'Add Block';
    }
  });
  
  // Add Enter key support for the input
  blockNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addBlockButton.click();
    }
  });
  
  // Assemble the structure
  addBlockDiv.appendChild(blockNameInput);
  addBlockDiv.appendChild(addBlockButton);
  addBlockDiv.appendChild(cancelButton);
  
  // Find the current block element that triggered this add action
  const currentBlockElement = document.querySelector(`[data-block-id="${prev_block_id}"]`);
  
  if (currentBlockElement && currentBlockElement.parentElement) {
    // Insert the add block container after the current block
    currentBlockElement.parentElement.insertBefore(addBlockDiv, currentBlockElement.nextSibling);
  } else {
    console.error('Could not find current block element');
    alert('Could not position the add block form. Please try again.');
    return;
  }
  
  // Focus on the input for better UX
  blockNameInput.focus();
}

// Function to add block to first position
function addBlockToFirstPosition(lesson_id, course_id, lessonElement) {
  // Create the add block container
  const addBlockDiv = document.createElement('div');
  addBlockDiv.className = 'cc-block-container';
  
  // Create input for block name
  const blockNameInput = document.createElement('input');
  blockNameInput.className = 'input-default';
  blockNameInput.classList.add('no-v-margin');
  blockNameInput.type = 'text';
  blockNameInput.placeholder = 'Enter block name';
  
  // Create Add Block button
  const addBlockButton = document.createElement('button');
  addBlockButton.className = 'button_inverse_m';
  addBlockButton.innerText = 'Add Block';
  
  // Create Cancel button with SVG
  const cancelButton = document.createElement('button');
  cancelButton.className = 'iconbutton_secondary_s';
  
  // Create and configure the SVG image
  const cancelIcon = document.createElement('img');
  cancelIcon.className = 'icon';
  cancelIcon.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/685c52a6d22aaec1335578d4_Close%20Primary.svg';
  cancelIcon.alt = 'Cancel';
  cancelButton.appendChild(cancelIcon);
  
  // Add cancel functionality
  cancelButton.addEventListener('click', () => {
    addBlockDiv.remove();
  });
  
  // Add event listener to the Add Block button
  addBlockButton.addEventListener('click', async () => {
    const blockName = blockNameInput.value.trim();
    
    if (!blockName) {
      alert('Please enter a block name');
      return;
    }
    
    try {
      // Disable button and show loading state
      addBlockButton.disabled = true;
      addBlockButton.innerText = 'Adding...';
      
      // Make API call to create new block at first position (no prev_id)
      const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          block_name: blockName,
          lesson_id: lesson_id
          // No prev_id means it will be placed at the first position
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const newBlock = await response.json();
      console.log('New block created at first position:', newBlock);
      
      // Remove the add block input container
      addBlockDiv.remove();
      
      // Re-display the entire course to show the new block in the correct position
      displayCourse(course_id);
      
    } catch (error) {
      console.error('Error creating block:', error);
      alert('Failed to create block. Please try again.');
      
      // Reset button state
      addBlockButton.disabled = false;
      addBlockButton.innerText = 'Add Block';
    }
  });
  
  // Add Enter key support for the input
  blockNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addBlockButton.click();
    }
  });
  
  // Assemble the structure
  addBlockDiv.appendChild(blockNameInput);
  addBlockDiv.appendChild(addBlockButton);
  addBlockDiv.appendChild(cancelButton);
  
  // Find the blocks container and insert after the header
  const blocksContainer = lessonElement.querySelector('.cc-block-list');
  const blocksHeaderContainer = blocksContainer.querySelector('.cc-block-header-container');
  
  if (blocksHeaderContainer && blocksHeaderContainer.parentElement) {
    // Insert the add block container after the header
    blocksHeaderContainer.parentElement.insertBefore(addBlockDiv, blocksHeaderContainer.nextSibling);
  } else {
    console.error('Could not find blocks header container');
    alert('Could not position the add block form. Please try again.');
    return;
  }
  
  // Focus on the input for better UX
  blockNameInput.focus();
}

// Delete Lesson function
function deleteLesson(lesson_id, course_id) {
        if (confirm('This action is irreversible. Please confirm again to proceed with deleting the lesson.')) {
            const apiUrl = `https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/lesson?lesson_id=${lesson_id}`;

            fetch(apiUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    //'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                },
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Lesson deleted successfully:', data);
                displayCourse(course_id); // Refresh the lesson display after deletion
            })
            .catch(error => {
                console.error('Error deleting lesson:', error);
            });
        } else {
            console.log('Second confirmation canceled. Lesson deletion aborted.');
        }
    }
    
// Function to delete a block
async function deleteBlock(block_id, lesson_id, course_id) {
    const apiUrl = `https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/block`;

    try {
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                block_id: block_id
            })
        });

        if (!response.ok) {
            throw new Error('Failed to delete block: ' + response.statusText);
        }

        const result = await response.json();
        console.log('Block deleted successfully:', result);
        alert('Block deleted successfully!');

        // Refresh the data to reflect the deletion
        displayCourse(course_id);
    } catch (error) {
        console.error('Error deleting block:', error);
    }
}


// Function to publish the lesson data
async function unPublishLesson(lesson_id, course_id) {
    const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/unpublish_lesson';

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lesson_id: lesson_id
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add new block ' + response.statusText);
        }

        const result = await response.json();
        alert('Lesson unpublished successfully');
				displayCourse(course_id);
       
    } catch (error) {
        console.error('Error unpublishing lesson:', error);
    }
}



// Function to publish the lesson data
async function publishLesson(lesson_id, course_id) {
    const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/publish_lesson';

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lesson_id: lesson_id
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add new block ' + response.statusText);
        }

        const result = await response.json();
       
        alert('Lesson published successfully');
				displayCourse(course_id);
       
    } catch (error) {
        console.error('Error publishing lesson:', error);
    }
}