// ===========================
// INITIALIZE ASSISTANT FORM
// ===========================

async function initializeAssistantForm(blockData, block_id, lesson_id) {
    const instructionsInput = document.getElementById('int-instructions-input');
    const submitButton = document.getElementById('int-submit-button');
    const importTemplateButton = document.getElementById('init-template-import-button');
    let specificationsSets = [];
    
    if (!instructionsInput || !submitButton) {
        return;
    }
    
    // Define updateFormChangedStatus BEFORE any other functions that use it
    const updateFormChangedStatus = () => {
        if (!blockData || !blockData.id) {
            submitButton.className = 'button_primary_m';
            return;
        }
        
        const currentInstructions = instructionsInput.value.trim();
        const originalInstructions = blockData.int_instructions || '';
        
        let specificationsChanged = false;
        if (blockData.params_structure && blockData.params_definition) {
            const currentSpecifications = getSpecificationsData();
            const originalSpecifications = blockData.specifications ? JSON.stringify(
                typeof blockData.specifications === 'string' 
                    ? JSON.parse(blockData.specifications) 
                    : blockData.specifications
            ) : null;
            
            specificationsChanged = currentSpecifications !== originalSpecifications;
        }
        
        const formChanged = currentInstructions !== originalInstructions || specificationsChanged;
        submitButton.className = formChanged || !blockData.id ? 'button_primary_m' : 'button_disabled_m';
    };
    
    // Define getSpecificationsData before updateFormChangedStatus uses it
    function getSpecificationsData() {
        if (!blockData || !blockData.params_structure || specificationsSets.length === 0) {
            return null;
        }
        
        try {
            const paramsStructure = typeof blockData.params_structure === 'string' 
                ? JSON.parse(blockData.params_structure) 
                : blockData.params_structure;
            
            const specificationsData = specificationsSets.map(set => {
                const setData = {};
                paramsStructure.forEach(param => {
                    if (set.inputs && set.inputs[param.name]) {
                        setData[param.name] = set.inputs[param.name].value.trim();
                    }
                });
                return setData;
            }).filter(setData => {
                return Object.values(setData).some(value => value !== '');
            });
            
            return specificationsData.length > 0 ? JSON.stringify(specificationsData) : null;
        } catch (error) {
            console.error('Error getting specifications data:', error);
            return null;
        }
    }
    
    // Fetch templates for the library
    let templates = [];
    try {
        const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/templates?type=interview', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            templates = await response.json();
        }
    } catch (error) {
        console.error('Error fetching interview templates:', error);
    }
    
    // Initialize template handling
    await initializeTemplateHandling(blockData, templates, block_id, lesson_id);
    
    // Only initialize assistant form if template_id exists
    if (blockData && blockData.int_template_id) {
        initializeAssistantFormUI();
    }
    
    // Add event listener for import template button
    if (importTemplateButton) {
        importTemplateButton.addEventListener('click', () => {
            console.log('clicked');
            showTemplateForm(templates);
        });
    } else console.log('not found');
    
    async function initializeTemplateHandling(blockData, templates, block_id, lesson_id) {
        const templateForm = document.getElementById('int-template-form');
        const assistantForm = document.getElementById('int-assistant-form');
        const evaluationSection = document.getElementById('evaluation-setup-section');
        
        if (blockData && blockData.int_template_id) {
            // Template exists - show assistant form
            if (templateForm) templateForm.style.display = 'none';
            if (assistantForm) assistantForm.style.display = 'block';
            if (evaluationSection) evaluationSection.style.display = 'block';
        } else {
            // No template - show template selection form
            showTemplateForm(templates);
        }
    }
    
    function showTemplateForm(templates) {
        const templateForm = document.getElementById('int-template-form');
        const assistantForm = document.getElementById('int-assistant-form');
        const evaluationSection = document.getElementById('evaluation-setup-section');
        const templateSelector = document.getElementById('int-template-selector');
        const templateDescription = document.getElementById('int-template-description');
        const importButton = document.getElementById('import-template-button');
        
        // Show/hide sections
        if (evaluationSection) evaluationSection.style.display = 'none';
        if (templateForm) templateForm.style.display = 'block';
        if (assistantForm) assistantForm.style.display = 'none';
        
        // Populate dropdown
        if (templateSelector) {
            templateSelector.innerHTML = '<option value="">Select a template...</option>';
            templates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = template.name;
                templateSelector.appendChild(option);
            });
            
            // Add event listener for template selection
            templateSelector.addEventListener('change', function() {
                const selectedTemplateId = this.value;
                const selectedTemplate = templates.find(t => t.id == selectedTemplateId);
                
                if (selectedTemplate && templateDescription) {
                    templateDescription.textContent = selectedTemplate.description;
                }
                
                // Enable/disable import button
                if (importButton) {
                    if (selectedTemplateId) {
                        importButton.disabled = false;
                        importButton.className = 'button_primary_m';
                    } else {
                        importButton.disabled = true;
                        importButton.className = 'button_disabled_m';
                    }
                }
            });
        }
        
        // Initialize import button as disabled
        if (importButton) {
            importButton.disabled = true;
            importButton.className = 'button_disabled_m';
            
            // Add event listener for import button
// Add event listener for import button
importButton.addEventListener('click', async function() {
    const selectedTemplateId = templateSelector ? templateSelector.value : null;
    if (!selectedTemplateId || !blockData || !blockData.id) return;
    
    // Declare originalText outside try block so it's accessible in finally
    const originalText = importButton.textContent;
    
    try {
        importButton.disabled = true;
        importButton.textContent = 'Importing...';
        
        // Call import template API
        const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/import_template', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                block_id: blockData.id,
                template_id: selectedTemplateId
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const updatedBlockData = await response.json();
        console.log('Updated block: ', updatedBlockData);

        // Force page refresh to ensure all UI elements are properly updated
        window.location.reload();
        
    } catch (error) {
        console.error('Error importing template:', error);
        alert(`Error importing template: ${error.message}`);
        
        // Only restore button state if there was an error
        importButton.disabled = false;
        importButton.textContent = originalText;
    }
    // Note: No finally block needed since we're refreshing the page on success
});
        }
    }
    
    function initializeAssistantFormUI() {
        instructionsInput.value = blockData ? (blockData.int_instructions || '') : '';

        if (instructionsInput.tagName === 'TEXTAREA') {
            autoResizeTextarea(instructionsInput);
        }
        
        // Display template name
        const templateNameElement = document.getElementById('int-template-name');
        if (templateNameElement && blockData && blockData._int_template && blockData._int_template.name) {
            templateNameElement.textContent = blockData._int_template.name;
        }
        
        initializeSpecifications();
        
        // Add input event listener
        instructionsInput.addEventListener('input', updateFormChangedStatus);
        
        // Set initial button state
        submitButton.className = (!blockData || !blockData.id) ? 'button_primary_m' : 'button_disabled_m';
        
        // Add click event listener to submit button
        submitButton.addEventListener('click', async function (e) {
            e.preventDefault();
            
            // Declare originalText outside try block so it's accessible in finally
            const originalText = submitButton.innerText;
            
            try {
                submitButton.disabled = true;
                submitButton.innerText = 'Saving...';
                submitButton.className = 'button_disabled_m';
                
                if (!blockData || !blockData.id) {
                    throw new Error('Block ID is required for saving assistant instructions');
                }
                
                const formData = {
                    block_id: blockData.id,
                    int_instructions: instructionsInput.value.trim()
                };
                
                const specificationsData = getSpecificationsData();
                if (specificationsData) {
                    formData.specifications = specificationsData;
                }
                
                const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/set_int_instructions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                }
                
                const result = await response.json();
                
                if (blockData && blockData.id) {
                    submitButton.className = 'button_disabled_m';
                } else {
                    submitButton.className = 'button_primary_m';
                }
                
                alert('Assistant instructions saved successfully!');
                
            } catch (error) {
                console.error('Error updating assistant data:', error);
                alert(`Error saving assistant instructions: ${error.message}`);
                submitButton.className = 'button_primary_m';
            } finally {
                submitButton.disabled = false;
                submitButton.innerText = originalText;
            }
        });
    }
    
    function initializeSpecifications() {
        const specificationsContainer = document.getElementById('specifications-container');
        if (!specificationsContainer) {
            return;
        }
        
        specificationsContainer.innerHTML = '';
        
        if (!blockData || !blockData.params_structure || !blockData.params_definition) {
            return;
        }
        
        try {
            const paramsStructure = typeof blockData.params_structure === 'string' 
                ? JSON.parse(blockData.params_structure) 
                : blockData.params_structure;
            
            const paramsDefinition = typeof blockData.params_definition === 'string' 
                ? JSON.parse(blockData.params_definition) 
                : blockData.params_definition;
            
            let specifications = [];
            if (blockData.specifications) {
                specifications = typeof blockData.specifications === 'string' 
                    ? JSON.parse(blockData.specifications) 
                    : blockData.specifications;
            }
            
            // Find and update existing title element instead of creating new one
            const paramsTitle = document.getElementById('params-title');
            if (paramsTitle) {
                paramsTitle.innerText = paramsDefinition.title || 'Specifications';
            }
            
            // Find and update existing description element instead of creating new one
            const paramsDescription = document.getElementById('params-description');
            if (paramsDescription && paramsDefinition.user_description) {
                paramsDescription.innerText = paramsDefinition.user_description;
            } else if (paramsDescription) {
                paramsDescription.innerText = 'woops!';
            }
            
            const setsContainer = document.createElement('div');
            setsContainer.id = 'specifications-sets-container';
            setsContainer.className = 'specifications-sets-container';
            specificationsContainer.appendChild(setsContainer);
            
            if (paramsDefinition.is_list) {
                if (specifications.length > 0) {
                    specifications.forEach((spec, index) => {
                        createParameterSet(paramsStructure, setsContainer, spec, index, paramsDefinition);
                    });
                } else {
                    createParameterSet(paramsStructure, setsContainer, {}, 0, paramsDefinition);
                }
                

                
                const addButton = document.createElement('button');
                addButton.className = 'button_secondary_m';
                addButton.innerText = '+ Add ' + (paramsDefinition.single_title || '');
                addButton.addEventListener('click', (event) => {
                    event.preventDefault(); // Prevent default form submission behavior
    
                    const newIndex = specificationsSets.length;
                 createParameterSet(paramsStructure, setsContainer, {}, newIndex, paramsDefinition);
                    updateFormChangedStatus();
                });
                specificationsContainer.appendChild(addButton);
            } else {
                const singleSpec = specifications.length > 0 ? specifications[0] : {};
                createParameterSet(paramsStructure, setsContainer, singleSpec, 0, paramsDefinition);
            }
            
        } catch (error) {
            console.error('Error initializing specifications:', error);
            specificationsContainer.innerHTML = '';
        }
    }
    
    function createParameterSet(paramsStructure, container, specificationData, index, paramsDefinition) {
    const singleParameterSetContainer = document.createElement('div');
    singleParameterSetContainer.className = 'single-parameter-set-container';
    
    const parameterSet = {
        container: singleParameterSetContainer,
        inputs: {},
        index: index
    };
    
    if (paramsDefinition.is_list) {
        const setTitle = document.createElement('div');
        setTitle.className = 'criterion-header';
        setTitle.innerText = `${paramsDefinition.single_title || 'Item'} ${index + 1}`;
        singleParameterSetContainer.appendChild(setTitle);
    }
    
    paramsStructure.forEach(param => {
        const label = document.createElement('div');
        label.className = 'label-text';
        label.innerText = param.title;
        singleParameterSetContainer.appendChild(label);
        
        if (param.description) {
            const description = document.createElement('div');
            description.className = 'body_XS';
            description.classList.add('textcolor-lighter');
            description.innerText = param.description;
            singleParameterSetContainer.appendChild(description);
        }
        
        const textarea = document.createElement('textarea');
        textarea.className = 'text-area-default';
        textarea.rows = 4;
        textarea.placeholder = param.title;
        textarea.value = (specificationData && specificationData[param.name]) ? specificationData[param.name] : '';
        
        autoResizeTextarea(textarea);
        textarea.addEventListener('input', updateFormChangedStatus);
        
        singleParameterSetContainer.appendChild(textarea);
        parameterSet.inputs[param.name] = textarea;
    });
    
    // Always create delete button if is_list is true, but control visibility later
    if (paramsDefinition.is_list) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'button_red_s';
        deleteButton.innerText = 'Delete';
        deleteButton.addEventListener('click', () => {
            removeParameterSet(parameterSet);
            updateFormChangedStatus();
            // After deletion, update delete button visibility for remaining sets
            updateDeleteButtonsVisibility(paramsDefinition);
        });
        singleParameterSetContainer.appendChild(deleteButton);
        parameterSet.deleteButton = deleteButton; // Store reference for later updates
    }
    
    container.appendChild(singleParameterSetContainer);
    specificationsSets.push(parameterSet);
    removeFocusOutlineFromContainer(singleParameterSetContainer);
    
    // Update delete button visibility for all sets
    updateDeleteButtonsVisibility(paramsDefinition);
    

    
    return parameterSet;
}
function updateDeleteButtonsVisibility(paramsDefinition) {
    // Only show delete buttons if is_list is true and there are more than 1 sets
    const shouldShowDeleteButtons = paramsDefinition.is_list && specificationsSets.length > 1;
    
    specificationsSets.forEach(set => {
        if (set.deleteButton) {
            set.deleteButton.style.display = shouldShowDeleteButtons ? 'block' : 'none';
        }
    });
}

}


