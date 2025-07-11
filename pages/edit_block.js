async function initializeBlockData() {
  let block_id = getUrlParameters('block_id');
  
  try {
    const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/block/${block_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const blockData = await response.json();
    console.log('BlockData: ', blockData);
    return blockData;
    
  } catch (error) {
    console.error('Error fetching block data:', error);
    return null; // Return null on error
  }
}


// ===========================
// INITIALIZATION BLOCK FORMS
// ===========================

async function initializeBlockForms(blockData, lesson_id) {
    try {
        let block_id = null;
        if (blockData) {
            block_id = blockData.id;
        }
				
        
        // Initialize all three forms
        await initializePublicDataForm(blockData, block_id, lesson_id);
        await initializeAssistantForm(blockData, block_id, lesson_id);
        await initializeEvaluationForm(blockData, block_id, lesson_id);

    } catch (error) {
        console.error(`Error initializing block forms:`, error);
    }
}

async function initializePublicDataForm(blockData, block_id, lesson_id) {
    const form = document.getElementById('public-data-form');
    const nameInput = document.getElementById('block-name-input');
    const descriptionInput = document.getElementById('description-input');
    const submitButton = document.getElementById('block-data-submit-button');

    let formChanged = false;

    // Set initial values
    nameInput.value = blockData ? blockData.name : '';
    descriptionInput.value = blockData ? blockData.markdown_content : '';

    // Initialize auto-resize for textarea if it exists
    if (descriptionInput.tagName === 'TEXTAREA') {
        initAutoResize(descriptionInput);
    }

    // Function to check if form has changed
    const updateFormChangedStatus = () => {
        if (!blockData) return; // For new blocks, no need to track changes
        
        const currentName = nameInput.value.trim();
        const currentDescription = descriptionInput.value.trim();
        
        const originalName = blockData.name || '';
        const originalDescription = blockData.markdown_content || '';
        
        formChanged = 
            currentName !== originalName ||
            currentDescription !== originalDescription;
            
        // Show/hide submit button based on changes
        submitButton.style.display = (blockData && !formChanged) ? 'none' : 'flex';
        console.log("Public form changed:", formChanged);
    };

    // Add change listeners
    nameInput.addEventListener('input', updateFormChangedStatus);
    descriptionInput.addEventListener('input', updateFormChangedStatus);

    // Set initial button visibility
    submitButton.style.display = blockData ? 'none' : 'flex';

    // Handle form submission
    submitButton.addEventListener('click', async function (e) {
        e.preventDefault();
        
        const formData = {
            block_id: blockData.id,
            block_name: nameInput.value.trim(),
            description: descriptionInput.value.trim()
        };

        console.log("Submitting Public Data:", formData);
        
        await postDataToApi('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/block', formData);
        
        // Hide button after successful submission if editing existing block
        if (blockData) {
            submitButton.style.display = 'none';
        }
    });
}


// ===========================
// INITIALIZE TEMPLATE IMPORT
// ===========================

/**
 * Generic template import functionality that can be used for different template types
 * @param {Object} config - Configuration object
 * @param {string} config.templateType - Type of template ('interview' or 'evaluation')
 * @param {string} config.selectorId - ID of the template selector dropdown
 * @param {string} config.importButtonId - ID of the import button
 * @param {string} config.instructionsInputId - ID of the instructions input/textarea
 * @param {string} config.descriptionId - ID of the description paragraph
 * @param {string} config.templateNameId - ID of the template name element
 * @param {Object} config.blockData - Block data object (optional)
 * @param {string} config.instructionsField - Field name in blockData for instructions
 * @param {Function} config.updateFormChangedStatus - Callback to update form status
 * @returns {Object} - Returns object with template_id and current_template_id
 */
async function initializeTemplateImport(config) {
    const {
        templateType,
        selectorId,
        importButtonId,
        instructionsInputId,
        descriptionId,
        templateNameId,
        blockData,
        instructionsField,
        updateFormChangedStatus
    } = config;
    
    const templateSelector = document.getElementById(selectorId);
    const importTemplateButton = document.getElementById(importButtonId);
    const instructionsInput = document.getElementById(instructionsInputId);
    const descriptionParagraph = document.getElementById(descriptionId);
    const templateNameElement = document.getElementById(templateNameId);
    
    let template_id = null;
    let current_template_id = null;
    let templates = [];
    
    // Fetch and populate templates
    try {
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/templates?type=${templateType}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        templates = await response.json();
        console.log(`${templateType} templates received from API:`, templates);
        
        // Clear existing options
        templateSelector.innerHTML = '';
        
        // Find default template
        const defaultTemplate = templates.find(template => template.is_default === true);
        
        // Populate dropdown options
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            option.selected = template.is_default === true;
            templateSelector.appendChild(option);
        });
        
        // Set initial template_id to default
        if (defaultTemplate) {
            template_id = defaultTemplate.id;
            current_template_id = defaultTemplate.id; // Set as current template
            
            // Always show the default template's description and name
            if (descriptionParagraph) {
                descriptionParagraph.innerText = defaultTemplate.description || '';
            }
            if (templateNameElement) {
                templateNameElement.innerText = defaultTemplate.name || '';
            }
            
            // If blockData instructions are empty, use default template instructions
            if (blockData && (!blockData[instructionsField] || blockData[instructionsField].trim() === '')) {
                instructionsInput.value = defaultTemplate.instructions || '';
                
                // Trigger auto-resize if it's a textarea
                if (instructionsInput.tagName === 'TEXTAREA') {
                    autoResizeTextarea(instructionsInput);
                }
            }
        }
        
        // Set initial import button style
        importTemplateButton.className = 'button_disabled_m';
        
    } catch (error) {
        console.error(`Error fetching ${templateType} templates:`, error);
        // Set default import button style even if templates fail to load
        importTemplateButton.className = 'button_disabled_m';
    }
    
    // Handle template selector change to update import button style
    templateSelector.addEventListener('change', function() {
        const selectedTemplateId = parseInt(templateSelector.value);
        
        if (selectedTemplateId === current_template_id) {
            importTemplateButton.className = 'button_disabled_m';
        } else {
            importTemplateButton.className = 'button_inverse_m';
        }
    });
    
    // Handle import template button click
    importTemplateButton.addEventListener('click', function() {
        const selectedTemplateId = parseInt(templateSelector.value);
        const selectedTemplate = templates.find(template => template.id === selectedTemplateId);
        
        if (selectedTemplate) {
            console.log('Selected template:', selectedTemplate);
            
            // Check if instructions input is not empty and show confirmation
            if (instructionsInput.value.trim() !== '') {
                const userConfirmed = confirm("Importing a template will erase the old instructions. Should I proceed with the import?\n\nClick 'OK' to Proceed with Import or 'Cancel' to Cancel Import");
                
                if (!userConfirmed) {
                    console.log('Import cancelled by user');
                    return; // Exit without importing
                }
            }
            
            // Update form fields
            instructionsInput.value = selectedTemplate.instructions || '';
            if (descriptionParagraph) {
                descriptionParagraph.innerText = selectedTemplate.description || '';
            }
            if (templateNameElement) {
                templateNameElement.innerText = selectedTemplate.name || '';
            }
            template_id = selectedTemplate.id;
            current_template_id = selectedTemplate.id; // Update current template
            
            // Trigger auto-resize if it's a textarea
            if (instructionsInput.tagName === 'TEXTAREA') {
                autoResizeTextarea(instructionsInput);
            }
            
            // Reset import button style since we're now using this template
            importTemplateButton.className = 'button_disabled_m';
            
            // Update form changed status
            if (updateFormChangedStatus) {
                updateFormChangedStatus();
            }
            
            console.log('Template imported:', selectedTemplate.name);
            console.log('Instructions set to:', selectedTemplate.instructions);
            console.log('Description set to:', selectedTemplate.description);
        } else {
            console.error('Selected template not found. Template ID:', selectedTemplateId);
            console.log('Available templates:', templates);
        }
    });
    
    // Return the template IDs for use in form submission
    return {
        getTemplateId: () => template_id,
        getCurrentTemplateId: () => current_template_id
    };
}


// ===========================
// INITIALIZE ASSISTANT FORM (FIXED VERSION)
// ===========================

async function initializeAssistantForm(blockData, block_id, lesson_id) {
    const form = document.getElementById('int-assistant-form');
    const instructionsInput = document.getElementById('int-instructions-input');
    const submitButton = document.getElementById('int-submit-button');
    const templateSelector = document.getElementById('int-template-selector');
    const templateNameElement = document.getElementById('int-template-name');
    const templateDescriptionElement = document.getElementById('int-description');
    const importTemplateButton = document.getElementById('int-import-template-button');
    
    let formChanged = false;
    let templateImport = null;
    let specificationsSets = [];
    
   
    
    instructionsInput.value = blockData ? (blockData.int_instructions || '') : '';
    

    
    // Initialize auto-resize for textarea
    if (instructionsInput.tagName === 'TEXTAREA') {
        initAutoResize(instructionsInput);
    }
    
    // Set template selector initially
    templateNameElement.innerText = blockData._int_template.name || '';
    templateDescriptionElement.innerText = blockData._int_template.description || '';
    templateSelector.innerHTML = blockData._int_template.name || '';
    importTemplateButton.className = 'button_disabled_m';
    
    const specificationsContainer = document.getElementById('specifications-container');
    
    // Fixed getSpecificationsData function - handles empty blocks
    function getSpecificationsData() {
        // If no block data or no specifications structure, return null
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
                // Filter out empty sets
                return Object.values(setData).some(value => value !== '');
            });
            
            return specificationsData.length > 0 ? JSON.stringify(specificationsData) : null;
        } catch (error) {
            console.error('Error getting specifications data:', error);
            return null;
        }
    }
    
    // Function to check if form has changed - handles empty blocks
    const updateFormChangedStatus = () => {
        // For new blocks or blocks without data, always show the save button as enabled
        if (!blockData || !blockData.id) {
            submitButton.className = 'button_primary_m';
            console.log("New block - save button enabled");
            return;
        }
        
        const currentInstructions = instructionsInput.value.trim();
        const originalInstructions = blockData.int_instructions || '';
        
        // Check if specifications have changed (only if block has specifications structure)
        let specificationsChanged = false;
        if (blockData.params_structure && blockData.params_definition) {
            const currentSpecifications = getSpecificationsData();
            const originalSpecifications = blockData.specifications ? JSON.stringify(
                typeof blockData.specifications === 'string' 
                    ? JSON.parse(blockData.specifications) 
                    : blockData.specifications
            ) : null;
            
            if (currentSpecifications !== originalSpecifications) {
                specificationsChanged = true;
            }
        }
        
        formChanged = currentInstructions !== originalInstructions || specificationsChanged;
            
        // Update button style based on changes
        if (formChanged || !blockData.id) {
            submitButton.className = 'button_primary_m';
        } else {
            submitButton.className = 'button_disabled_m';
        }
        console.log("Assistant form changed:", formChanged);
    };
    
    // Initialize specifications
    initializeSpecifications();
    
    function initializeSpecifications() {
        const specificationsContainer = document.getElementById('specifications-container');
        if (!specificationsContainer) {
            console.warn('specifications-container not found in DOM');
            return;
        }
        
        specificationsContainer.innerHTML = '';
        
        // If no block data or missing specifications structure, just clear and return
        if (!blockData || !blockData.params_structure || !blockData.params_definition) {
            console.log('No specifications structure found - specifications section will be empty');
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
            
            
            
            // Create specifications header
            const specificationsHeader = document.createElement('div');
            specificationsHeader.className = 'ebp-section-header';
            specificationsHeader.innerText = paramsDefinition.title || 'Specifications';
            specificationsContainer.appendChild(specificationsHeader);
            
            // Create user description if available
            if (paramsDefinition.user_description) {
                const userDescription = document.createElement('text');
                userDescription.className = 'field-label';
                userDescription.innerText = paramsDefinition.user_description;
                specificationsContainer.appendChild(userDescription);
            }
            
            // Create specifications sets container
            const setsContainer = document.createElement('div');
            setsContainer.id = 'specifications-sets-container';
            setsContainer.className = 'specifications-sets-container';
            specificationsContainer.appendChild(setsContainer);
            
            if (paramsDefinition.is_list) {
                // Handle list of parameter sets
                if (specifications.length > 0) {
                    specifications.forEach((spec, index) => {
                        createParameterSet(paramsStructure, setsContainer, spec, index, paramsDefinition);
                    });
                } else {
                    createParameterSet(paramsStructure, setsContainer, {}, 0, paramsDefinition);
                }
                
                // Add "Add" button for lists
                const addButton = document.createElement('button');
                addButton.className = 'button_inverse_s';
                addButton.innerText = 'Add ' + (paramsDefinition.single_title || '');
                addButton.addEventListener('click', () => {
                    const newIndex = specificationsSets.length;
                    createParameterSet(paramsStructure, setsContainer, {}, newIndex, paramsDefinition);
                    updateFormChangedStatus();
                });
                specificationsContainer.appendChild(addButton);
            } else {
                // Handle single parameter set
                const singleSpec = specifications.length > 0 ? specifications[0] : {};
                createParameterSet(paramsStructure, setsContainer, singleSpec, 0, paramsDefinition);
            }
            
        } catch (error) {
            console.error('Error initializing specifications:', error);
            // Clear the container on error to prevent broken UI
            specificationsContainer.innerHTML = '';
        }
    }
    
    function createParameterSet(paramsStructure, container, specificationData, index, paramsDefinition) {
        const singleParameterSetContainer = document.createElement('div');
        singleParameterSetContainer.className = 'single-parameter-set-container';
        singleParameterSetContainer.id = 'single-parameter-set-container';
        
        const parameterSet = {
            container: singleParameterSetContainer,
            inputs: {},
            index: index
        };
        
        // Add set title for lists
        if (paramsDefinition.is_list) {
            const setTitle = document.createElement('div');
            setTitle.className = 'criterion-header';
            setTitle.innerText = `${paramsDefinition.single_title || 'Item'} ${index + 1}`;
            singleParameterSetContainer.appendChild(setTitle);
        }
        
        // Create inputs for each parameter in the structure
        paramsStructure.forEach(param => {
            // Create label
            const label = document.createElement('div');
            label.className = 'label-text';
            label.innerText = param.title;
            singleParameterSetContainer.appendChild(label);
            
            // Create description if available
            if (param.description) {
                const description = document.createElement('div');
                description.className = 'body_XS';
                description.classList.add('textcolor-lighter');
                description.innerText = param.description;
                singleParameterSetContainer.appendChild(description);
            }
            
            // Create textarea input
            const textarea = document.createElement('textarea');
            textarea.className = 'text-area-def';
            textarea.rows = 2;
            textarea.placeholder = param.title;
            
            // Set value from specification data
            textarea.value = (specificationData && specificationData[param.name]) ? specificationData[param.name] : '';
            
            // Initialize auto-resize
            initAutoResize(textarea);
            
            // Add change listener
            textarea.addEventListener('input', updateFormChangedStatus);
            
            singleParameterSetContainer.appendChild(textarea);
            
            // Store reference to input
            parameterSet.inputs[param.name] = textarea;
        });
        
        // Add delete button for all parameter sets
        const deleteButton = document.createElement('button');
        deleteButton.className = 'button_red_s';
        deleteButton.innerText = 'Delete';
        deleteButton.addEventListener('click', () => {
            removeParameterSet(parameterSet);
            updateFormChangedStatus();
        });
        singleParameterSetContainer.appendChild(deleteButton);
        
        container.appendChild(singleParameterSetContainer);
        specificationsSets.push(parameterSet);
        
        // Apply focus outline removal
        removeFocusOutlineFromContainer(singleParameterSetContainer);
        
        return parameterSet;
    }
    
    function removeParameterSet(parameterSetToRemove) {
        const index = specificationsSets.indexOf(parameterSetToRemove);
        if (index !== -1) {
            // Remove from DOM
            parameterSetToRemove.container.remove();
            // Remove from array
            specificationsSets.splice(index, 1);
            
            // Update indices and titles for remaining sets
            specificationsSets.forEach((set, i) => {
                set.index = i;
                const titleElement = set.container.querySelector('.criterion-header');
                if (titleElement && blockData && blockData.params_definition) {
                    const paramsDefinition = typeof blockData.params_definition === 'string' 
                        ? JSON.parse(blockData.params_definition) 
                        : blockData.params_definition;
                    if (paramsDefinition.is_list) {
                        titleElement.innerText = `${paramsDefinition.single_title || 'Item'} ${i + 1}`;
                    }
                }
            });
        }
    }
    
    // Add change listeners
    instructionsInput.addEventListener('input', updateFormChangedStatus);
    
    // Set initial button style - handles empty blocks
    if (!blockData || !blockData.id) {
        // For new blocks, always enable the save button
        submitButton.className = 'button_primary_m';
    } else {
        // For existing blocks, start with disabled until changes are made
        submitButton.className = 'button_disabled_m';
    }
    
    // Initialize template import functionality only when selector changes
    let templatesLoaded = false;
    
    templateSelector.addEventListener('focus', async function() {
        if (!templatesLoaded) {
            console.log('Loading templates for the first time...');
            
            try {
                const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/templates?type=interview', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const templates = await response.json();
                console.log('Interview templates received from API:', templates);
                
                // Populate dropdown options
                templates.forEach(template => {
                    const option = document.createElement('option');
                    option.value = template.id;
                    option.textContent = template.name;
                    templateSelector.appendChild(option);
                });
                
                // Initialize the template import object
                templateImport = initializeTemplateImportHandler(templates, updateFormChangedStatus);
                
                templatesLoaded = true;
                
            } catch (error) {
                console.error('Error fetching interview templates:', error);
            }
        }
    });
    
    // Function to handle template import
    function initializeTemplateImportHandler(templates, updateFormChangedStatus) {
        const descriptionParagraph = document.getElementById('int-description');
        const templateNameElement = document.getElementById('int-template-name');
        
        let template_id = null;
        let current_template_id = null;
        
        // Set current template ID if block already has one
        if (blockData && blockData.int_template_id) {
            current_template_id = blockData.int_template_id;
            template_id = blockData.int_template_id;
            console.log('Block already has template ID:', current_template_id);
        }
        
        // Handle template selector change to update import button style
        templateSelector.addEventListener('change', function() {
            const selectedTemplateId = parseInt(templateSelector.value);
            
            if (selectedTemplateId && selectedTemplateId !== current_template_id) {
                importTemplateButton.className = 'button_inverse_m';
                
                // Update description and name preview
                const selectedTemplate = templates.find(template => template.id === selectedTemplateId);
                if (selectedTemplate) {
                    if (descriptionParagraph) {
                        descriptionParagraph.innerText = selectedTemplate.description || '';
                    }
                    if (templateNameElement) {
                        templateNameElement.innerText = selectedTemplate.name || '';
                    }
                }
            } else {
                importTemplateButton.className = 'button_disabled_m';
            }
        });
        
        // Handle import template button click
        importTemplateButton.addEventListener('click', async function() {
            const selectedTemplateId = parseInt(templateSelector.value);
            const selectedTemplate = templates.find(template => template.id === selectedTemplateId);
            
            if (selectedTemplate) {
                console.log('Selected template:', selectedTemplate);
                
                // Check if instructions input is not empty and show confirmation
                if (instructionsInput.value.trim() !== '') {
                    const userConfirmed = confirm("Importing a template will erase the old instructions. Should I proceed with the import?\n\nClick 'OK' to Proceed with Import or 'Cancel' to Cancel Import");
                    
                    if (!userConfirmed) {
                        console.log('Import cancelled by user');
                        return;
                    }
                }
                
                try {
                    // Disable import button and show loading state
                    importTemplateButton.disabled = true;
                    const originalText = importTemplateButton.innerText;
                    importTemplateButton.innerText = 'Importing...';
                    importTemplateButton.className = 'button_disabled_m';
                    
                    // Call the import template API
                    const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/import_template', {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            block_id: blockData.id,
                            template_id: selectedTemplate.id
                        })
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Server response:', errorText);
                        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                    }
                    
                    const result = await response.json();
                    console.log('Template imported successfully:', result);
                    
                    // Update form fields with the imported data
                    instructionsInput.value = selectedTemplate.instructions || '';
                    if (descriptionParagraph) {
                        descriptionParagraph.innerText = selectedTemplate.description || '';
                    }
                    if (templateNameElement) {
                        templateNameElement.innerText = selectedTemplate.name || '';
                    }
                    template_id = selectedTemplate.id;
                    current_template_id = selectedTemplate.id;
                    
                    // Trigger auto-resize if it's a textarea
                    if (instructionsInput.tagName === 'TEXTAREA') {
                        autoResizeTextarea(instructionsInput);
                    }
                    
                    // Reset import button style
                    importTemplateButton.className = 'button_disabled_m';
                    
                    // Update form changed status
                    if (updateFormChangedStatus) {
                        updateFormChangedStatus();
                    }
                    
                    console.log('Template imported:', selectedTemplate.name);
                    alert('Template imported successfully!');
                    
                } catch (error) {
                    console.error('Error importing template:', error);
                    alert(`Error importing template: ${error.message}`);
                    
                    // Reset button state on error
                    importTemplateButton.className = 'button_inverse_m';
                } finally {
                    // Re-enable button
                    importTemplateButton.disabled = false;
                    importTemplateButton.innerText = originalText || 'Import Template';
                }
            }
        });
        
        return {
            getTemplateId: () => template_id,
            getCurrentTemplateId: () => current_template_id
        };
    }
    
    // FIXED FORM SUBMISSION with better error handling
    submitButton.addEventListener('click', async function (e) {
        e.preventDefault();
        
        try {
            // Disable button and show loading state
            submitButton.disabled = true;
            const originalText = submitButton.innerText;
            submitButton.innerText = 'Saving...';
            submitButton.className = 'button_disabled_m';
            
            // Ensure we have a valid block_id
            if (!blockData || !blockData.id) {
                throw new Error('Block ID is required for saving assistant instructions');
            }
            
            const formData = {
                block_id: blockData.id,
                int_instructions: instructionsInput.value.trim(),
                template_id: templateImport ? templateImport.getTemplateId() : null
            };
            
            // Add specifications data if available
            const specificationsData = getSpecificationsData();
            if (specificationsData) {
                formData.specifications = specificationsData;
            }
            
            console.log("Submitting Assistant Data:", formData);
            
            // Use fetch directly with better error handling instead of postDataToApi
            const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/set_int_instructions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                // Log the response for debugging
                const errorText = await response.text();
                console.error('Server response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Assistant data updated successfully:', result);
            
            // Update button style after successful submission
            if (blockData && blockData.id) {
                submitButton.className = 'button_disabled_m';
            } else {
                submitButton.className = 'button_primary_m';
            }
            
            // Show success message
            alert('Assistant instructions saved successfully!');
            
        } catch (error) {
            console.error('Error updating assistant data:', error);
            alert(`Error saving assistant instructions: ${error.message}`);
            
            // Reset button to original state
            submitButton.className = 'button_primary_m';
        } finally {
            // Re-enable button and reset text
            submitButton.disabled = false;
            submitButton.innerText = originalText || 'Save Changes';
        }
    });
}



// ===========================
// INITIALIZE EVALUATION FORM
// ===========================

async function initializeEvaluationForm(blockData, block_id, lesson_id) {
    const form = document.getElementById('evaluation-form');
    const criteriaContainer = document.getElementById('criteria-container');
    const evaluationInstructionsInput = document.getElementById('eval-instructions-input');
    const submitButton = document.getElementById('eval-submit-button');
    const templateSelector = document.getElementById('eval-template-selector');
    const importTemplateButton = document.getElementById('eval-import-template-button');

    let formChanged = false;
    let templateImport = null; // Will be initialized only when needed

    // Set initial values - show existing instructions or empty field
    evaluationInstructionsInput.value = blockData ? (blockData.eval_instructions || '') : '';

    // Initialize auto-resize for textarea
    if (evaluationInstructionsInput.tagName === 'TEXTAREA') {
        initAutoResize(evaluationInstructionsInput);
    }

    // Clear template selector initially
    templateSelector.innerHTML = '';
    
    // Disable import button initially
    importTemplateButton.className = 'button_disabled_m';

    // Parse existing eval criteria JSON if available
    let existingCriteria = [];
    try {
        if (blockData && blockData.eval_crit_json) {
            // If it's a string, parse it
            existingCriteria = typeof blockData.eval_crit_json === 'string' 
                ? JSON.parse(blockData.eval_crit_json) 
                : blockData.eval_crit_json;
            console.log("existing criteria: ", existingCriteria);
        }
    } catch (e) {
        console.error('Error parsing existing criteria JSON:', e);
    }

    // Clear existing criteria container
    criteriaContainer.innerHTML = '';
    
    // Array to track all criterion pairs
    const criteriaPairs = [];
    
    // Function to check if form has changed compared to original data
    const updateFormChangedStatus = () => {
        if (!blockData) return; // For new blocks, no need to track changes
        
        const currentEvaluationInstructions = evaluationInstructionsInput.value.trim();
        const originalEvaluationInstructions = blockData.eval_instructions || '';
        
        // Check if criteria have changed
        let criteriaPairsChanged = false;
        
        // First, compare the number of non-empty pairs with the number of original criteria
        const nonEmptyPairs = criteriaPairs.filter(pair => !pair.isEmpty());
        if (nonEmptyPairs.length !== existingCriteria.length) {
            criteriaPairsChanged = true;
        } else {
            // If counts match, check if content is different
            for (let i = 0; i < nonEmptyPairs.length; i++) {
                const pair = nonEmptyPairs[i];
                const existingPair = existingCriteria[i] || { 
                    criterion_name: '', 
                    grading_name: '',
                    summary_instructions: '', 
                    grading_instructions: '', 
                    max_points: 0 
                };
                
                if (pair.criterion_name.value.trim() !== existingPair.criterion_name ||
                    pair.grading_name.value.trim() !== existingPair.grading_name || 
                    pair.summary_instructions.value.trim() !== existingPair.summary_instructions ||
                    pair.grading_instructions.value.trim() !== existingPair.grading_instructions ||
                    (parseInt(pair.points.value, 10) || 0) !== existingPair.max_points) {
                    criteriaPairsChanged = true;
                    break;
                }
            }
        }
        
        // Check if any field has changed
        formChanged = 
            currentEvaluationInstructions !== originalEvaluationInstructions ||
            criteriaPairsChanged;
            
        // Update button style based on changes
        if (blockData && !formChanged) {
            submitButton.className = 'button_disabled_m';
        } else {
            submitButton.className = 'button_primary_m';
        }
        console.log("Evaluation form changed:", formChanged);
    };
    
    // Initialize template import functionality only when selector changes (user interacts with it)
    let templatesLoaded = false;
    
    templateSelector.addEventListener('focus', async function() {
        if (!templatesLoaded) {
            console.log('Loading evaluation templates for the first time...');
            
            try {
                // Fetch templates
                const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/templates?type=evaluation', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const templates = await response.json();
                console.log('Evaluation templates received from API:', templates);
                
                // Populate dropdown options
                templates.forEach(template => {
                    const option = document.createElement('option');
                    option.value = template.id;
                    option.textContent = template.name;
                    templateSelector.appendChild(option);
                });
                
                // Initialize the template import object
                templateImport = initializeEvaluationTemplateImportHandler(templates, updateFormChangedStatus);
                
                templatesLoaded = true;
                
            } catch (error) {
                console.error('Error fetching evaluation templates:', error);
            }
        }
    });
    
    // Function to handle evaluation template import
    function initializeEvaluationTemplateImportHandler(templates, updateFormChangedStatus) {
        const descriptionParagraph = document.getElementById('eval-description');
        const templateNameElement = document.getElementById('eval-template-name');
        
        let template_id = null;
        let current_template_id = null;
        
        // Handle template selector change to update import button style
        templateSelector.addEventListener('change', function() {
            const selectedTemplateId = parseInt(templateSelector.value);
            
            if (selectedTemplateId && selectedTemplateId !== current_template_id) {
                importTemplateButton.className = 'button_inverse_m';
                
                // Update description and name preview
                const selectedTemplate = templates.find(template => template.id === selectedTemplateId);
                if (selectedTemplate) {
                    if (descriptionParagraph) {
                        descriptionParagraph.innerText = selectedTemplate.description || '';
                    }
                    if (templateNameElement) {
                        templateNameElement.innerText = selectedTemplate.name || '';
                    }
                }
            } else {
                importTemplateButton.className = 'button_disabled_m';
            }
        });
        
        // Handle import template button click
        importTemplateButton.addEventListener('click', function() {
            const selectedTemplateId = parseInt(templateSelector.value);
            const selectedTemplate = templates.find(template => template.id === selectedTemplateId);
            
            if (selectedTemplate) {
                console.log('Selected evaluation template:', selectedTemplate);
                
                // Check if instructions input is not empty and show confirmation
                if (evaluationInstructionsInput.value.trim() !== '') {
                    const userConfirmed = confirm("Importing a template will erase the old instructions. Should I proceed with the import?\n\nClick 'OK' to Proceed with Import or 'Cancel' to Cancel Import");
                    
                    if (!userConfirmed) {
                        console.log('Import cancelled by user');
                        return;
                    }
                }
                
                // Update form fields
                evaluationInstructionsInput.value = selectedTemplate.instructions || '';
                if (descriptionParagraph) {
                    descriptionParagraph.innerText = selectedTemplate.description || '';
                }
                if (templateNameElement) {
                    templateNameElement.innerText = selectedTemplate.name || '';
                }
                template_id = selectedTemplate.id;
                current_template_id = selectedTemplate.id;
                
                // Trigger auto-resize if it's a textarea
                if (evaluationInstructionsInput.tagName === 'TEXTAREA') {
                    autoResizeTextarea(evaluationInstructionsInput);
                }
                
                // Reset import button style
                importTemplateButton.className = 'button_disabled_m';
                
                // Update form changed status
                if (updateFormChangedStatus) {
                    updateFormChangedStatus();
                }
                
                console.log('Evaluation template imported:', selectedTemplate.name);
            }
        });
        
        return {
            getTemplateId: () => template_id,
            getCurrentTemplateId: () => current_template_id
        };
    }
    
    // Function to create a new criterion-points pair
    const createCriterionPair = (criterionNameValue = '', gradingNameValue = '', summaryInstructionsValue = '', gradingInstructionsValue = '', pointsValue = 0, index = criteriaPairs.length) => {
        // Create main criterion-container
        const criterionContainer = document.createElement('div');
        criterionContainer.classList.add('criterion-container');
        
        // Create criterion-pair container
        const pairContainer = document.createElement('div');
        pairContainer.classList.add('criterion-pair');
        
        // First labeled-input-container for criterion name
        const criterionNameContainer = document.createElement('div');
        criterionNameContainer.classList.add('labeled-input-container');
        
        const criterionNameLabel = document.createElement('div');
        criterionNameLabel.classList.add('label-text');
        criterionNameLabel.textContent = 'Criterion name';
        
        const criterionNameInput = document.createElement('input');
        criterionNameInput.type = 'text';
        criterionNameInput.classList.add('input-default');
        criterionNameInput.placeholder = `criterion_${index+1}`;
        criterionNameInput.value = criterionNameValue;
        
        // Add input filter to prevent spaces and special characters
        criterionNameInput.addEventListener('input', function(e) {
            // Allow only letters, numbers, and underscores
            this.value = this.value.replace(/[^a-zA-Z0-9_]/g, '');
        });
        
        // Third labeled-input-container for summary instructions
        const summaryContainer = document.createElement('div');
        summaryContainer.classList.add('labeled-input-container');
        
        const summaryLabel = document.createElement('div');
        summaryLabel.classList.add('label-text');
        summaryLabel.textContent = 'Summary instructions';
        
        const summaryInstructionsTextarea = document.createElement('textarea');
        summaryInstructionsTextarea.classList.add('text-area-def');
        summaryInstructionsTextarea.rows = 4;
        summaryInstructionsTextarea.placeholder = 'Summary Instructions';
        summaryInstructionsTextarea.value = summaryInstructionsValue;
        
        criterionNameContainer.appendChild(criterionNameLabel);
        criterionNameContainer.appendChild(criterionNameInput);
        criterionNameContainer.appendChild(summaryLabel);
        criterionNameContainer.appendChild(summaryInstructionsTextarea);
        
        
        // Second labeled-input-container containing inputs-pair
        const secondColumnContainer = document.createElement('div');
        secondColumnContainer.classList.add('labeled-input-container');
        
        // inputs-pair container for grading name and max points
        const inputsPairContainer = document.createElement('div');
        inputsPairContainer.classList.add('inputs-pair');
        
        // First labeled-input-container inside inputs-pair (for grading name)
        const gradingNameContainer = document.createElement('div');
        gradingNameContainer.classList.add('labeled-input-container');
        
        const gradingNameLabel = document.createElement('div');
        gradingNameLabel.classList.add('label-text');
        gradingNameLabel.textContent = 'Grading name';
        
        const gradingNameInput = document.createElement('input');
        gradingNameInput.type = 'text';
        gradingNameInput.classList.add('input-default');
        gradingNameInput.placeholder = 'Grading name';
        gradingNameInput.value = gradingNameValue;
        
        gradingNameContainer.appendChild(gradingNameLabel);
        gradingNameContainer.appendChild(gradingNameInput);
        
        // Second labeled-input-container inside inputs-pair (for max points)
        const maxPointsContainer = document.createElement('div');
        maxPointsContainer.classList.add('labeled-input-container');
        
        const maxPointsLabel = document.createElement('div');
        maxPointsLabel.classList.add('label-text');
        maxPointsLabel.textContent = 'Max points';
        
        const pointsInput = document.createElement('input');
        pointsInput.type = 'number';
        pointsInput.classList.add('input-default-compact');
        pointsInput.placeholder = 'Points';
        pointsInput.min = 0;
        pointsInput.value = pointsValue;
        
        maxPointsContainer.appendChild(maxPointsLabel);
        maxPointsContainer.appendChild(pointsInput);
        
        // Add both labeled-input-containers to inputs-pair
        inputsPairContainer.appendChild(gradingNameContainer);
        inputsPairContainer.appendChild(maxPointsContainer);
        
        // Add inputs-pair to the second row container
        secondColumnContainer.appendChild(inputsPairContainer);
        
        
        
        // Fourth labeled-input-container for grading instructions
        const gradingContainer = document.createElement('div');
        gradingContainer.classList.add('labeled-input-container');
        
        const gradingLabel = document.createElement('div');
        gradingLabel.classList.add('label-text');
        gradingLabel.textContent = 'Grading instructions';
        
        const gradingInstructionsTextarea = document.createElement('textarea');
        gradingInstructionsTextarea.classList.add('text-area-def');
        gradingInstructionsTextarea.rows = 4;
        gradingInstructionsTextarea.placeholder = 'Grading Instructions';
        gradingInstructionsTextarea.value = gradingInstructionsValue;
        
        gradingContainer.appendChild(gradingLabel);
        gradingContainer.appendChild(gradingInstructionsTextarea);
        secondColumnContainer.appendChild(gradingContainer);
        
        // Assemble the complete structure
        pairContainer.appendChild(criterionNameContainer);
        pairContainer.appendChild(secondColumnContainer);
        
        criterionContainer.appendChild(pairContainer);
        
        // Add to criteria container
        criteriaContainer.appendChild(criterionContainer);
        
        // Create the pair object with the new grading_name field
        const pairObj = {
            container: criterionContainer,
            criterion_name: criterionNameInput,
            grading_name: gradingNameInput,
            summary_instructions: summaryInstructionsTextarea,
            grading_instructions: gradingInstructionsTextarea,
            points: pointsInput,
            isEmpty: function() {
                return this.criterion_name.value.trim() === '' && 
                       this.grading_name.value.trim() === '' &&
                       this.summary_instructions.value.trim() === '' &&
                       this.grading_instructions.value.trim() === '' &&
                       (this.points.value === '' || parseInt(this.points.value, 10) === 0);
            }
        };
        
        // Add event listeners to manage dynamic behavior
        const managePairs = () => {
            // Check if this is the last pair and it's not empty
            const isLastPair = criteriaPairs.indexOf(pairObj) === criteriaPairs.length - 1;
            
            if (isLastPair && !pairObj.isEmpty()) {
                // If last pair and not empty, add a new empty pair
                addEmptyPair();
            }
            
            // If this pair is empty and it's not the only pair left, and it's not the last pair
            if (pairObj.isEmpty() && criteriaPairs.length > 1 && !isLastPair) {
                // Remove this pair
                removePair(pairObj);
            }
            
            // Update form changed status
            updateFormChangedStatus();
        };
        
        criterionNameInput.addEventListener('input', managePairs);
        gradingNameInput.addEventListener('input', managePairs);
        summaryInstructionsTextarea.addEventListener('input', managePairs);
        gradingInstructionsTextarea.addEventListener('input', managePairs);
        pointsInput.addEventListener('input', managePairs);
        
        // Initialize auto-resize for textareas
        initAutoResize(summaryInstructionsTextarea);
        initAutoResize(gradingInstructionsTextarea);
        
        // Add to the array of pairs
        criteriaPairs.push(pairObj);
        removeFocusOutlineFromContainer(criterionContainer);
        return pairObj;
    };
        
    // Function to add a new empty pair
    const addEmptyPair = () => {
        createCriterionPair();
    };
    
    // Function to remove a specific pair
    const removePair = (pairToRemove) => {
        const index = criteriaPairs.indexOf(pairToRemove);
        if (index !== -1) {
            // Remove from DOM
            pairToRemove.container.remove();
            // Remove from array
            criteriaPairs.splice(index, 1);
            // Update placeholders for remaining pairs
            criteriaPairs.forEach((pair, i) => {
                pair.criterion_name.placeholder = `criterion_${i+1}`;
            });
        }
    };
    
    // Add change listeners to evaluation instructions
    evaluationInstructionsInput.addEventListener('input', updateFormChangedStatus);
    
    // Initialize with existing criteria plus one empty pair
    if (existingCriteria.length > 0) {
        // Add existing criteria
        existingCriteria.forEach((criteria, index) => {
            createCriterionPair(
                criteria.criterion_name || '',
                criteria.grading_name || '',
                criteria.summary_instructions || '',
                criteria.grading_instructions || '',
                criteria.max_points || 0,
                index
            );
        });
    }
    
    // Always add one empty pair at the end
    addEmptyPair();

    // Set initial button style
    if (blockData) {
        submitButton.className = 'button_disabled_m';
    } else {
        submitButton.className = 'button_primary_m';
    }

    // Handle form submission
    submitButton.addEventListener('click', async function (e) {
        e.preventDefault();
        
        // Build the evaluation criteria JSON
        const evalCritJson = criteriaPairs
            .filter(pair => !pair.isEmpty()) // Skip empty pairs
            .map(pair => ({
                criterion_name: pair.criterion_name.value.trim(),
                grading_name: pair.grading_name.value.trim(), // Include grading_name in submission
                summary_instructions: pair.summary_instructions.value.trim(),
                grading_instructions: pair.grading_instructions.value.trim(),
                max_points: parseInt(pair.points.value, 10) || 0
            }));
        
        const formData = {
            block_id: blockData.id,
            eval_instructions: evaluationInstructionsInput.value.trim(),
            criteria_json: JSON.stringify(evalCritJson),
            template_id: templateImport ? templateImport.getTemplateId() : null // Only use template_id if a template was imported
        };

        console.log("Submitting Evaluation Data:", formData);
        console.log("Evaluation Criteria JSON:", evalCritJson);
        
        await postDataToApi('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/set_eval_instructions', formData);
        
        // Update button style after successful submission if editing existing block
        if (blockData) {
            submitButton.className = 'button_disabled_m';
        }
    });
}
