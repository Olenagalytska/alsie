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