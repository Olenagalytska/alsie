// Universal Authentication Function
function verifyUserAuth() {
    return new Promise(async (resolve, reject) => {
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            window.location.href = "/login";
            reject('No auth token found');
            return;
        }

        try {
            const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/auth/me', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Authorization failed');
            }

            const data = await response.json();

            // Assign user data to a global variable
            window.user = {
                id: data.id,
                name: data.name,
                role: data.role
            };

            resolve(window.user);
        } catch (error) {
            console.error("Error during authentication:", error);
            window.location.href = "/login";
            reject(error);
        }
    });
}

// Verify teacher permissions for a course
async function verifyTeacherPermissions(user_id, course_id) {
    try {
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/course/${course_id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch course');
        }
        
        const course = await response.json();
        
        if (user_id != course.user_id) {
            alert("You don't have the rights to view this page");
            window.location.href = '/';
            throw new Error('Unauthorized access');
        }
        
        return true;
    } catch (error) {
        console.error('Permission check failed:', error);
        window.location.href = '/';
        throw error;
    }
}