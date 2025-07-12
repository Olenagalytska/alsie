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