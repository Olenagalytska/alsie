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
    return blockData;
    
  } catch (error) {
    console.error('Error fetching block data:', error);
    return null;
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
        
        await initializePublicDataForm(blockData, block_id, lesson_id);
        await initializeAssistantForm(blockData, block_id, lesson_id);
        await initializeEvaluationForm(blockData, block_id, lesson_id);

    } catch (error) {
        console.error(`Error initializing block forms:`, error);
    }
}

async function initializePublicDataForm(blockData, block_id, lesson_id) {
    const nameInput = document.getElementById('block-name-input');
    const descriptionInput = document.getElementById('description-input');
    const submitButton = document.getElementById('block-data-submit-button');

    nameInput.value = blockData ? blockData.name : '';
    descriptionInput.value = blockData ? blockData.markdown_content : '';

    if (descriptionInput.tagName === 'TEXTAREA') {
        initAutoResize(descriptionInput);
    }

    const updateFormChangedStatus = () => {
        if (!blockData) return;
        
        const nameChanged = nameInput.value.trim() !== (blockData.name || '');
        const descriptionChanged = descriptionInput.value.trim() !== (blockData.markdown_content || '');
        
        const formChanged = nameChanged || descriptionChanged;
        submitButton.style.display = (blockData && !formChanged) ? 'none' : 'flex';
    };

    nameInput.addEventListener('input', updateFormChangedStatus);
    descriptionInput.addEventListener('input', updateFormChangedStatus);

    submitButton.style.display = blockData ? 'none' : 'flex';

    submitButton.addEventListener('click', async function (e) {
        e.preventDefault();
        
        const formData = {
            block_id: blockData.id,
            block_name: nameInput.value.trim(),
            description: descriptionInput.value.trim()
        };
        
        await postDataToApi('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/block', formData);
        
        if (blockData) {
            submitButton.style.display = 'none';
        }
    });
}

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

// ===========================
// INITIALIZE EVALUATION FORM
// ===========================

async function initializeEvaluationForm(blockData, block_id, lesson_id) {
    const criteriaContainer = document.getElementById('criteria-container');
    const evaluationInstructionsInput = document.getElementById('eval-instructions-input');
    const submitButton = document.getElementById('eval-submit-button');

    // Fetch templates for the library
    let templates = [];
    try {
        const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/templates?type=evaluation', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            templates = await response.json();
        }
    } catch (error) {
        console.error('Error fetching evaluation templates:', error);
    }

    evaluationInstructionsInput.value = blockData ? (blockData.eval_instructions || '') : '';

    if (evaluationInstructionsInput.tagName === 'TEXTAREA') {
        initAutoResize(evaluationInstructionsInput);
    }

    let existingCriteria = [];
    try {
        if (blockData && blockData.eval_crit_json) {
            existingCriteria = typeof blockData.eval_crit_json === 'string' 
                ? JSON.parse(blockData.eval_crit_json) 
                : blockData.eval_crit_json;
        }
    } catch (e) {
        console.error('Error parsing existing criteria JSON:', e);
    }

    criteriaContainer.innerHTML = '';
    const criteriaPairs = [];
    
    const updateFormChangedStatus = () => {
        if (!blockData) return;
        
        const currentEvaluationInstructions = evaluationInstructionsInput.value.trim();
        const originalEvaluationInstructions = blockData.eval_instructions || '';
        
        let criteriaPairsChanged = false;
        const nonEmptyPairs = criteriaPairs.filter(pair => !pair.isEmpty());
        
        if (nonEmptyPairs.length !== existingCriteria.length) {
            criteriaPairsChanged = true;
        } else {
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
        
        const formChanged = currentEvaluationInstructions !== originalEvaluationInstructions || criteriaPairsChanged;
        submitButton.className = (blockData && !formChanged) ? 'button_disabled_m' : 'button_primary_m';
    };
    
    const createCriterionPair = (criterionNameValue = '', gradingNameValue = '', summaryInstructionsValue = '', gradingInstructionsValue = '', pointsValue = 0, index = criteriaPairs.length) => {
        const criterionContainer = document.createElement('div');
        criterionContainer.classList.add('criterion-container');
        
        const pairContainer = document.createElement('div');
        pairContainer.classList.add('criterion-pair');
        
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
        
        criterionNameInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^a-zA-Z0-9_]/g, '');
        });
        
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
        
        const secondColumnContainer = document.createElement('div');
        secondColumnContainer.classList.add('labeled-input-container');
        
        const inputsPairContainer = document.createElement('div');
        inputsPairContainer.classList.add('inputs-pair');
        
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
        
        inputsPairContainer.appendChild(gradingNameContainer);
        inputsPairContainer.appendChild(maxPointsContainer);
        secondColumnContainer.appendChild(inputsPairContainer);
        
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
        
        pairContainer.appendChild(criterionNameContainer);
        pairContainer.appendChild(secondColumnContainer);
        criterionContainer.appendChild(pairContainer);
        criteriaContainer.appendChild(criterionContainer);
        
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
        
        const managePairs = () => {
            const isLastPair = criteriaPairs.indexOf(pairObj) === criteriaPairs.length - 1;
            
            if (isLastPair && !pairObj.isEmpty()) {
                addEmptyPair();
            }
            
            if (pairObj.isEmpty() && criteriaPairs.length > 1 && !isLastPair) {
                removePair(pairObj);
            }
            
            updateFormChangedStatus();
        };
        
        criterionNameInput.addEventListener('input', managePairs);
        gradingNameInput.addEventListener('input', managePairs);
        summaryInstructionsTextarea.addEventListener('input', managePairs);
        gradingInstructionsTextarea.addEventListener('input', managePairs);
        pointsInput.addEventListener('input', managePairs);
        
        initAutoResize(summaryInstructionsTextarea);
        initAutoResize(gradingInstructionsTextarea);
        
        criteriaPairs.push(pairObj);
        removeFocusOutlineFromContainer(criterionContainer);
        return pairObj;
    };
        
    const addEmptyPair = () => {
        createCriterionPair();
    };
    
    const removePair = (pairToRemove) => {
        const index = criteriaPairs.indexOf(pairToRemove);
        if (index !== -1) {
            pairToRemove.container.remove();
            criteriaPairs.splice(index, 1);
            criteriaPairs.forEach((pair, i) => {
                pair.criterion_name.placeholder = `criterion_${i+1}`;
            });
        }
    };
    
    evaluationInstructionsInput.addEventListener('input', updateFormChangedStatus);
    
    if (existingCriteria.length > 0) {
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
    
    addEmptyPair();

    submitButton.className = blockData ? 'button_disabled_m' : 'button_primary_m';

    submitButton.addEventListener('click', async function (e) {
        e.preventDefault();
        
        const evalCritJson = criteriaPairs
            .filter(pair => !pair.isEmpty())
            .map(pair => ({
                criterion_name: pair.criterion_name.value.trim(),
                grading_name: pair.grading_name.value.trim(),
                summary_instructions: pair.summary_instructions.value.trim(),
                grading_instructions: pair.grading_instructions.value.trim(),
                max_points: parseInt(pair.points.value, 10) || 0
            }));
        
        const formData = {
            block_id: blockData.id,
            eval_instructions: evaluationInstructionsInput.value.trim(),
            criteria_json: JSON.stringify(evalCritJson)
        };
        
        await postDataToApi('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/set_eval_instructions', formData);
        
        if (blockData) {
            submitButton.className = 'button_disabled_m';
        }
    });
}