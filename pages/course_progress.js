// ===== COURSE PROGRESS PAGE - MAIN ENTRY POINT =====



// ===== AUTHENTICATION & PERMISSIONS =====

async function initializeAuthentication(user_id, course_id) {
    try {
        // Verify user authentication
        const user = await verifyUserAuth();
        
        // Verify teacher permissions for this course
        if (user_id) {
            await verifyTeacherPermissions(user_id, course_id);
        }
        
        return user;
    } catch (error) {
        console.error('Authentication failed:', error);
        throw new Error('Authentication required');
    }
}

// ===== PAGE DATA INITIALIZATION =====

async function initializePageData(course_id, user_id) {
    try {
        // Set page element names (course name, user name, etc.)
        await setElementNames({ 
            course_id: course_id, 
            user_id: user_id 
        });
        
        // Set up teacher course menu navigation
        setTeacherCourseMenu(course_id);
        
        console.log('Page data initialized');
    } catch (error) {
        console.error('Error initializing page data:', error);
        throw error;
    }
}

// ===== PROGRESS DISPLAY FUNCTIONS =====

async function initializeProgressDisplay(course_id) {
    try {
        // Fetch and display course progress data
        const progressData = await fetchCourseProgressData(course_id);
        
        // Render progress overview
        renderProgressOverview(progressData.overview);
        
        // Render student progress list
        renderStudentProgressList(progressData.students);
        
        // Render progress charts/visualizations
        if (progressData.analytics) {
            renderProgressAnalytics(progressData.analytics);
        }
        
        console.log('Progress display initialized');
    } catch (error) {
        console.error('Error initializing progress display:', error);
        throw error;
    }
}

async function fetchCourseProgressData(course_id) {
    try {
        const [overview, students, analytics] = await Promise.all([
            fetchDataFromApi(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/course/${course_id}/progress-overview`),
            fetchDataFromApi(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/course/${course_id}/student-progress`),
            fetchDataFromApi(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/course/${course_id}/analytics`).catch(() => null)
        ]);
        
        return { overview, students, analytics };
    } catch (error) {
        console.error('Error fetching course progress data:', error);
        throw error;
    }
}

function renderProgressOverview(overviewData) {
    const container = document.getElementById('progress-overview-container');
    if (!container || !overviewData) return;
    
    container.innerHTML = `
        <div class="progress-stats">
            <div class="stat-item">
                <h3>${overviewData.total_students || 0}</h3>
                <p>Total Students</p>
            </div>
            <div class="stat-item">
                <h3>${overviewData.active_students || 0}</h3>
                <p>Active Students</p>
            </div>
            <div class="stat-item">
                <h3>${Math.round(overviewData.avg_completion || 0)}%</h3>
                <p>Average Completion</p>
            </div>
        </div>
    `;
}

function renderStudentProgressList(studentsData) {
    const container = document.getElementById('student-progress-container');
    if (!container || !studentsData) return;
    
    container.innerHTML = '';
    
    studentsData.forEach(student => {
        const studentElement = createStudentProgressElement(student);
        container.appendChild(studentElement);
    });
}

function createStudentProgressElement(student) {
    const element = document.createElement('div');
    element.className = 'student-progress-item';
    element.innerHTML = `
        <div class="student-info">
            <h4>${trimText(student.name, 30)}</h4>
            <p>${student.email}</p>
        </div>
        <div class="progress-info">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${student.completion_percentage || 0}%"></div>
            </div>
            <span class="progress-text">${Math.round(student.completion_percentage || 0)}%</span>
        </div>
        <div class="last-activity">
            <span>${formatLastActivity(student.last_activity)}</span>
        </div>
    `;
    
    // Add click handler to view detailed progress
    element.addEventListener('click', () => {
        showStudentDetailedProgress(student.id, student.name);
    });
    
    removeFocusOutlineFromContainer(element);
    return element;
}

function renderProgressAnalytics(analyticsData) {
    const container = document.getElementById('analytics-container');
    if (!container || !analyticsData) return;
    
    // Create charts or visualizations based on analytics data
    // This would depend on your charting library (Chart.js, D3, etc.)
    console.log('Rendering analytics:', analyticsData);
}

// ===== EVENT HANDLERS =====

async function initializeEventHandlers(course_id) {
    // Export progress data
    const exportButton = document.getElementById('export-progress-btn');
    if (exportButton) {
        exportButton.addEventListener('click', () => exportProgressData(course_id));
    }
    
    // Refresh progress data
    const refreshButton = document.getElementById('refresh-progress-btn');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => refreshProgressData(course_id));
    }
    
    // Filter controls
    const filterDropdown = document.getElementById('progress-filter');
    if (filterDropdown) {
        filterDropdown.addEventListener('change', (e) => filterProgressData(e.target.value));
    }
    
    // Search functionality
    const searchInput = document.getElementById('student-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => searchStudents(e.target.value), 300));
    }
}

// ===== UTILITY FUNCTIONS =====

function formatLastActivity(timestamp) {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
}

function showStudentDetailedProgress(student_id, student_name) {
    // Navigate to detailed student progress page or show modal
    window.location.href = `/teacher/student-progress?student_id=${student_id}&course_id=${getUrlParameters('course_id')}`;
}

async function exportProgressData(course_id) {
    try {
        showLoadingState('Exporting progress data...');
        
        const exportData = await fetchDataFromApi(
            `https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/course/${course_id}/export-progress`
        );
        
        // Create and download CSV file
        downloadCSV(exportData, `course-${course_id}-progress.csv`);
        
        hideLoadingState();
    } catch (error) {
        console.error('Error exporting progress data:', error);
        showErrorMessage('Failed to export progress data');
        hideLoadingState();
    }
}

async function refreshProgressData(course_id) {
    try {
        showLoadingState('Refreshing progress data...');
        await initializeProgressDisplay(course_id);
        hideLoadingState();
    } catch (error) {
        console.error('Error refreshing progress data:', error);
        showErrorMessage('Failed to refresh progress data');
        hideLoadingState();
    }
}

function filterProgressData(filterValue) {
    const studentItems = document.querySelectorAll('.student-progress-item');
    
    studentItems.forEach(item => {
        const shouldShow = applyProgressFilter(item, filterValue);
        item.style.display = shouldShow ? 'flex' : 'none';
    });
}

function applyProgressFilter(item, filterValue) {
    switch (filterValue) {
        case 'completed':
            return item.querySelector('.progress-text').textContent.includes('100%');
        case 'in-progress':
            const progress = parseInt(item.querySelector('.progress-text').textContent);
            return progress > 0 && progress < 100;
        case 'not-started':
            return item.querySelector('.progress-text').textContent.includes('0%');
        default:
            return true;
    }
}

function searchStudents(searchTerm) {
    const studentItems = document.querySelectorAll('.student-progress-item');
    const term = searchTerm.toLowerCase().trim();
    
    studentItems.forEach(item => {
        const studentName = item.querySelector('h4').textContent.toLowerCase();
        const studentEmail = item.querySelector('p').textContent.toLowerCase();
        const shouldShow = !term || studentName.includes(term) || studentEmail.includes(term);
        
        item.style.display = shouldShow ? 'flex' : 'none';
    });
}

// ===== UI STATE MANAGEMENT =====

function showLoadingState(message = 'Loading...') {
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
        loadingElement.textContent = message;
        loadingElement.style.display = 'block';
    }
}

function hideLoadingState() {
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

function showErrorMessage(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// ===== HELPER UTILITIES =====

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function downloadCSV(data, filename) {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function convertToCSV(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return '';
    }
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    
    return [headers, ...rows].join('\n');
}