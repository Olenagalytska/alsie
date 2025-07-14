// ===========================
// INITIALIZE EVALUATION FORM
// ===========================

async function initializeEvaluationForm(blockData, block_id, lesson_id) {
    const criteriaContainer = document.getElementById('criteria-container');
    const evaluationInstructionsInput = document.getElementById('eval-instructions-input');
    const submitButton = document.getElementById('eval-submit-button');

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
    
    // Get the existing "Add another criterion" button
    const addCriterionButton = document.getElementById('add-criterion-button');
    
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
                    summary_instructions: '', 
                    grading_instructions: '', 
                    max_points: 0 
                };
                
                if (pair.criterion_name.value.trim() !== existingPair.criterion_name ||
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
    
    const createCriterionPair = (criterionNameValue = '', summaryInstructionsValue = '', gradingInstructionsValue = '', pointsValue = 0, index = criteriaPairs.length) => {
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
        
        // Only max points container now (no grading name)
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
        secondColumnContainer.appendChild(maxPointsContainer);
        
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
        
        // Append to the criteria container
        criteriaContainer.appendChild(criterionContainer);
        
        const pairObj = {
            container: criterionContainer,
            criterion_name: criterionNameInput,
            summary_instructions: summaryInstructionsTextarea,
            grading_instructions: gradingInstructionsTextarea,
            points: pointsInput,
            isEmpty: function() {
                return this.criterion_name.value.trim() === '' && 
                       this.summary_instructions.value.trim() === '' &&
                       this.grading_instructions.value.trim() === '' &&
                       (this.points.value === '' || parseInt(this.points.value, 10) === 0);
            }
        };
        
        const managePairs = () => {
            // Auto-remove empty criteria (but not if it's the only one)
            if (pairObj.isEmpty() && criteriaPairs.length > 1) {
                removePair(pairObj);
            }
            
            updateFormChangedStatus();
        };
        
        criterionNameInput.addEventListener('input', managePairs);
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
    
    // Add button click event listener
    if (addCriterionButton) {
        addCriterionButton.addEventListener('click', function(e) {
            e.preventDefault();
            addEmptyPair();
        });
    }
    
    evaluationInstructionsInput.addEventListener('input', updateFormChangedStatus);
    
    // Load existing criteria or create one empty criterion if none exist
    if (existingCriteria.length > 0) {
        existingCriteria.forEach((criteria, index) => {
            createCriterionPair(
                criteria.criterion_name || '',
                criteria.summary_instructions || '',
                criteria.grading_instructions || '',
                criteria.max_points || 0,
                index
            );
        });
    } else {
        // Create one empty criterion if no existing criteria
        addEmptyPair();
    }

    submitButton.className = blockData ? 'button_disabled_m' : 'button_primary_m';

    submitButton.addEventListener('click', async function (e) {
        e.preventDefault();
        
        const evalCritJson = criteriaPairs
            .filter(pair => !pair.isEmpty())
            .map(pair => ({
                criterion_name: pair.criterion_name.value.trim(),
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