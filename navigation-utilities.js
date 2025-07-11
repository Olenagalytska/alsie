// Set up teacher course menu navigation
function setTeacherCourseMenu(course_id) {
    document.getElementById('progress-menu')?.addEventListener('click', () => {
        window.location.href = `/teacher/course-progress?course_id=${course_id}`;
    });

    document.getElementById('content-menu')?.addEventListener('click', () => {
        window.location.href = `/teacher/course-content?course_id=${course_id}`;
    });
    
    document.getElementById('testing-menu')?.addEventListener('click', () => {
        console.log('testing clicked!');
        window.location.href = `/teacher/course-testing?course_id=${course_id}`;
    });

    document.getElementById('students-menu')?.addEventListener('click', () => {
        console.log('students clicked!');
        window.location.href = `/teacher/course-students?course_id=${course_id}`;
    });
    
    document.getElementById('settings-menu')?.addEventListener('click', () => {
        window.location.href = `/teacher/course-settings?course_id=${course_id}`;
    });
}

// Set element names and navigation
async function setElementNames({ course_id, lesson_id, block_id, user_id }) {
    // Text trimming function (local)
    function trimText(text, n) {
        if (!text || text.length <= n) {
            return text;
        }
        return text.substring(0, n) + '...';
    }

    const apiEndpoints = {
        course: (id) => `https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/course/${id}`,
        lesson: (id) => `https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/lesson/${id}`,
        block: (id) => `https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/block/${id}`,
        user: (id) => `https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/user/${id}`
    };
    
    const elementIds = {
        course: 'course-name',
        lesson: 'lesson-name',
        block: 'block-name',
        user: 'user-name'
    };

    const maxLengths = {
        course: 20,
        lesson: 20,
        block: 20,
        user: 20
    };

    const fetchData = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching data from ${url}:`, error);
            return null;
        }
    };

    const params = { course: course_id, lesson: lesson_id, block: block_id, user: user_id };
    
    for (const [key, id] of Object.entries(params)) {
        if (id) {
            const url = apiEndpoints[key](id);
            const data = await fetchData(url);
            if (data && data.name) {
                const element = document.getElementById(elementIds[key]);
                if (element) {
                    const trimmedName = trimText(data.name, maxLengths[key]);
                    element.innerText = trimmedName;
                    console.log('set element names: ', key, ': ', trimmedName);
                } else {
                    console.warn(`Element with ID "${elementIds[key]}" not found.`);
                }
            } else {
                console.warn(`Failed to retrieve name for ${key} with ID ${id}.`);
            }
        }
    }

    // Add navigation event listeners
    document.getElementById('home-button')?.addEventListener('click', () => {
        window.location.href = `/`;
    });
    
    document.getElementById('back-button')?.addEventListener('click', () => {
        window.history.back();
    });
    
    // Note: course-name click handler removed from second version
}