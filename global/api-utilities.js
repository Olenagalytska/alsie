// Fetch data from API with query parameters
async function fetchDataFromApi(endpoint, params = {}, authToken = null, method = "GET") {
    const queryString = new URLSearchParams(params).toString();
    const url = `${endpoint}?${queryString}`;

    const headers = {
        "Content-Type": "application/json",
    };

    if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Data received:", data);
        return data;
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
}

// POST data to API
async function postDataToApi(endpoint, data = {}, authToken = null) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending POST request:', error);
        throw error;
    }
}


async function fetchLessons(course_id) {
    try {
        const response = await fetch(`https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/get_lesson_list?course_id=${course_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const lessons = await response.json();
        console.log('Lessons fetched:', lessons);
        return lessons;
        
    } catch (error) {
        console.error('Error fetching lessons:', error);
        throw error;
    }
}
