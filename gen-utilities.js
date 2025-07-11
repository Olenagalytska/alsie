// Get URL parameters
function getUrlParameters(name) {
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : null;
}

// Parse and validate email list
function parseEmailList(emailString) {
    const emailArray = emailString.split(',').map(email => email.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailArray.filter(email => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
        return { error: "Invalid email format", invalidEmails };
    }
    console.log('Email json', emailArray);
    return { emails: emailArray };
}

// Get random cover image URL
async function getRandomCoverImageUrl() {
    try {
        const response = await fetch('https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/images?type=cover', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log("Image API response status:", response.status);
        
        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`);
            return 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/67c84519dfe44ecc9a535cc3_Course%20Cover%2035.svg';
        }

        const data = await response.json();
        console.log("Image API response data:", data);
        
        if (!Array.isArray(data) || data.length === 0) {
            console.warn('No images returned from API, using default image');
            return 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/67c84519dfe44ecc9a535cc3_Course%20Cover%2035.svg';
        }
        
        const imageUrls = data.map(item => {
            if (item && item.image && item.image.url) {
                return item.image.url;
            }
            return null;
        }).filter(url => url !== null);
        
        console.log("Extracted image URLs:", imageUrls);
        
        if (imageUrls.length === 0) {
            console.warn('No valid image URLs found in the response');
            return 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/67c84519dfe44ecc9a535cc3_Course%20Cover%2035.svg';
        }
        
        const randomIndex = Math.floor(Math.random() * imageUrls.length);
        const selectedUrl = imageUrls[randomIndex];
        console.log("Selected image URL:", selectedUrl);
        return selectedUrl;
        
    } catch (error) {
        console.error('Error fetching random image:', error);
        return 'https://cdn.prod.website-files.com/6640b571ca9d09ecfa2c2de6/67c84519dfe44ecc9a535cc3_Course%20Cover%2035.svg';
    }
}