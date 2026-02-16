function verifyUserAuth() {
    return new Promise(async (resolve, reject) => {
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            const urlParams = new URLSearchParams(window.location.search);
            const blockId = urlParams.get('block_id');
            
            if (blockId) {
                localStorage.setItem('redirectAfterLogin', JSON.stringify({
                    block_id: blockId,
                    timestamp: Date.now()
                }));
            }
            
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

            window.user = {
                id: data.id,
                name: data.name,
                role: data.role
            };

            const redirectInfo = localStorage.getItem('redirectAfterLogin');
            if (redirectInfo) {
                try {
                    const { block_id, timestamp } = JSON.parse(redirectInfo);
                    const tenMinutes = 10 * 60 * 1000;
                    
                    if (Date.now() - timestamp < tenMinutes) {
                        localStorage.removeItem('redirectAfterLogin');
                        window.location.href = `/lesson-page?block_id=${block_id}&user_id=${data.id}`;
                        return;
                    } else {
                        localStorage.removeItem('redirectAfterLogin');
                    }
                } catch (e) {
                    localStorage.removeItem('redirectAfterLogin');
                }
            }

            resolve(window.user);
        } catch (error) {
            console.error("Error during authentication:", error);
            
            const urlParams = new URLSearchParams(window.location.search);
            const blockId = urlParams.get('block_id');
            
            if (blockId) {
                localStorage.setItem('redirectAfterLogin', JSON.stringify({
                    block_id: blockId,
                    timestamp: Date.now()
                }));
            }
            
            window.location.href = "/login";
            reject(error);
        }
    });
}

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