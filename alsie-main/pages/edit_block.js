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


// Initialite Public Data Form 
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