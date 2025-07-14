// ===========================
// INITIALIZE ASSISTANT FORM
// ===========================

async function initializeAssistantForm(blockData, block_id, lesson_id) {
    const instructionsInput = document.getElementById('int-instructions-input');
    const submitButton = document.getElementById('int-submit-button');
    let specificationsSets = [];
    
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
    
    instructionsInput.value = blockData ? (blockData.int_instructions || '') : '';

    if (instructionsInput.tagName === 'TEXTAREA') {
        initAutoResize(instructionsInput);
    }
    
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
            
            if (currentSpecifications !== originalSpecifications) {
                specificationsChanged = true;
            }
        }
        
        const formChanged = currentInstructions !== originalInstructions || specificationsChanged;
        submitButton.className = formChanged || !blockData.id ? 'button_primary_m' : 'button_disabled_m';
    };
    
    initializeSpecifications();
    
    function initializeSpecifications() {
        const specificationsContainer = document.getElementById('specifications-container');
        if (!specificationsContainer) return;
        
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
            
            const specificationsHeader = document.createElement('div');
            specificationsHeader.className = 'ebp-section-header';
            specificationsHeader.innerText = paramsDefinition.title || 'Specifications';
            specificationsContainer.appendChild(specificationsHeader);
            
            if (paramsDefinition.user_description) {
                const userDescription = document.createElement('text');
                userDescription.className = 'field-label';
                userDescription.innerText = paramsDefinition.user_description;
                specificationsContainer.appendChild(userDescription);
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
                addButton.className = 'button_inverse_s';
                addButton.innerText = 'Add ' + (paramsDefinition.single_title || '');
                addButton.addEventListener('click', () => {
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
            textarea.className = 'text-area-def';
            textarea.rows = 2;
            textarea.placeholder = param.title;
            textarea.value = (specificationData && specificationData[param.name]) ? specificationData[param.name] : '';
            
            initAutoResize(textarea);
            textarea.addEventListener('input', updateFormChangedStatus);
            
            singleParameterSetContainer.appendChild(textarea);
            parameterSet.inputs[param.name] = textarea;
        });
        
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
        removeFocusOutlineFromContainer(singleParameterSetContainer);
        
        return parameterSet;
    }
    
    function removeParameterSet(parameterSetToRemove) {
        const index = specificationsSets.indexOf(parameterSetToRemove);
        if (index !== -1) {
            parameterSetToRemove.container.remove();
            specificationsSets.splice(index, 1);
            
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
    
    instructionsInput.addEventListener('input', updateFormChangedStatus);
    
    submitButton.className = (!blockData || !blockData.id) ? 'button_primary_m' : 'button_disabled_m';
    
    submitButton.addEventListener('click', async function (e) {
        e.preventDefault();
        
        try {
            submitButton.disabled = true;
            const originalText = submitButton.innerText;
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
            submitButton.innerText = originalText || 'Save Changes';
        }
    });
}