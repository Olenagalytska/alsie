// Text truncation with ellipsis
function trimText(text, n) {
  if (!text || text.length <= n) {
    return text;
  }
  return text.substring(0, n) + '...';
}

// Auto-resize textarea functionality
function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function initAutoResize(textarea) {
  autoResizeTextarea(textarea);
  
  textarea.addEventListener('input', function() {
    autoResizeTextarea(this);
  });
  
  textarea.addEventListener('change', function() {
    autoResizeTextarea(this);
  });
}

function initAllTextareas(container) {
  const textareas = container.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    initAutoResize(textarea);
  });
}


function addGlobalFocusStyles() {
  // Remove any existing style with this ID
  const existingStyle = document.getElementById('custom-focus-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const style = document.createElement('style');
  style.id = 'custom-focus-styles';
  style.textContent = `
    /* Remove BOTH outline and box-shadow to eliminate blue focus ring completely */
    input:focus, 
    textarea:focus, 
    select:focus,
    input[type="text"]:focus,
    input[type="email"]:focus,
    input[type="password"]:focus,
    input[type="number"]:focus,
    input[type="tel"]:focus,
    input[type="url"]:focus,
    input[type="search"]:focus,
    .w-input:focus,
    .w-select:focus {
      outline: none !important;
      box-shadow: none !important;
      border: 1px solid #ccc !important; /* Keep a subtle border so users know it's focused */
    }
    
    /* Alternative: Custom focus styling (uncomment if you want custom focus instead of none) */
    /*
    input:focus, 
    textarea:focus, 
    select:focus,
    .w-input:focus,
    .w-select:focus {
      outline: none !important;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25) !important;
      border-color: #007bff !important;
    }
    */
  `;
  
  // Append to head with high priority
  document.head.appendChild(style);
  
  console.log('Global focus styles added - both outline and box-shadow removed');
}

  
function removeFocusOutline(element) {
  element.style.outline = 'none';
  element.style.setProperty('outline', 'none', 'important');
  
  // Optional: Add the same focus styling that Webflow uses
  element.addEventListener('focus', function() {
    this.style.outline = 'none';
    // You can add custom focus styling here if needed
    // this.style.borderColor = '#your-color';
  });
}

/**
 * Remove focus outline from multiple elements at once
 */
function removeFocusOutlineFromContainer(container) {
  const formElements = container.querySelectorAll('input, textarea, select');
  formElements.forEach(element => {
    removeFocusOutline(element);
  });
}


function createStatusElement(status) {
    const statusImg = document.createElement('img');
    statusImg.className = 'status-icon';
    
    switch(status) {
        case 'finished':
            statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c89df353f89d2f162e_Status%3DDone.svg';
            statusImg.alt = 'Finished';
            statusImg.title = 'Finished';
            break;
        case 'started':
            statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c8060fc4bd6aad4b6b_Status%3DIn%20Progress.svg';
            statusImg.alt = 'In progress';
            statusImg.title = 'In progress';
            break;
        case 'idle':
            statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c8b88ac6941a4b04a3_Status%3DIdle.svg';
            statusImg.alt = 'Not started';
            statusImg.title = 'Not started';
            break;
        default:
            statusImg.src = 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/689216c8b88ac6941a4b04a3_Status%3DIdle.svg';
            statusImg.alt = 'Unknown status';
            statusImg.title = 'Unknown status';
    }
    
    return statusImg;
}