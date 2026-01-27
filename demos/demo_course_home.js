
document.addEventListener('DOMContentLoaded', async function () {
    let user_id;
    let course_id;
    let course_name;
    let user_name;
    let userBlockData, ub_id;

    
    
    try {
        const userData = {
   			 id: 604,
   			 name: "Demo User",
  			 role: "student"
				 };
    
        user_id = 604;
        user_name = "Demo User";
        course_id = 85;

        if (!course_id) {
            console.error('Required URL parameters are missing: course_id');
            return;
        }

 
            const apiUrl = 'https://xxye-mqg7-lvux.n7d.xano.io/api:DwPBcTo5/user_lesson_full';

            const response = await fetch(`${apiUrl}?course_id=${course_id}&user_id=${user_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                    
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }

            const data = await response.json();
            console.log('Data received:', data);

            if (!data || data.length === 0) {
                alert("You don't have access to this course");
                //window.location.href = '/';
                return;
            }

            const hasUserBlocks = data.some(lesson => 
                lesson.blocks && 
                lesson.blocks.length > 0 && 
                lesson.blocks.some(block => 
                    block.ub && 
                    block.ub.length > 0 && 
                    block.ub[0].user_id == user_id
                )
            );

            if (!hasUserBlocks) {
                alert("You don't have access to this course");
                //window.location.href = '/';
                return;
            }

            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = user_name;
            }

            const courseNameElement = document.getElementById('course-name');
            if (courseNameElement) {
                courseNameElement.textContent = data[0]?._course.name || "Unknown Course";
            }

            
            const mainContainer = document.getElementById('main-container');

            if (mainContainer) {
                mainContainer.innerHTML = '';

                const userNameBlock = document.getElementById('user-name');
                if (userNameBlock) {
                    userNameBlock.textContent = user_name || 'Unknown User';
                }

                const courseNameBlock = document.getElementById('course-name');
                if (courseNameBlock) {
                    courseNameBlock.textContent = data[0]?._course.name || 'Unknown Course';
                }

                const courseTitleBlock = document.getElementById('course-name-title');
                if (courseTitleBlock) {
                    courseTitleBlock.textContent = data[0]?._course.name || 'Unknown Course';
                }

                document.getElementById('my-courses')?.addEventListener('click', () => {
                    window.location.href = `/`;
                });

                data.forEach((lesson) => {
                    const lessonNameContainer = document.createElement('div');
                    lessonNameContainer.className = 'lesson_container';

                    const labelBlockName = document.createElement('label');
                    labelBlockName.innerText = 'Module name';
                    labelBlockName.classList.add('label-text');
                    lessonNameContainer.appendChild(labelBlockName);

                    const lessonNameElement = document.createElement('div');
                    lessonNameElement.className = 'home_st_lesson_name';
                    lessonNameElement.innerText = lesson.name;

                    const lessonDescriptionElement = document.createElement('div');
                    lessonDescriptionElement.className = 'body_XS';
                    lessonDescriptionElement.innerText = lesson.description;
                    
                    lessonNameContainer.appendChild(lessonNameElement);
                    lessonNameContainer.appendChild(lessonDescriptionElement);
                    mainContainer.appendChild(lessonNameContainer);

                    if (lesson.blocks && Array.isArray(lesson.blocks) && lesson.blocks.length > 0) {
                        const blockContainer = document.createElement('div');
                        blockContainer.classList.add('home_st_block_container');

                        lesson.blocks.forEach((block) => {
                            const blockNameContainer = document.createElement('div');
                            blockNameContainer.classList.add('home_st_block_name_container');

                            const blockNameElement = document.createElement('h5');
                            blockNameElement.className = 'home_st_block_name';
                            blockNameElement.innerText = block.name;

                            const blockStatus = document.createElement('div');

                            if (block.ub[0]?.status) {
                                if(block.ub[0]?.status == 'finished'){
                                    blockStatus.classList.add('done-tag');
                                    blockStatus.innerText = 'finished';
                                } 
                                if(block.ub[0]?.status == 'started'){
                                    blockStatus.classList.add('started-tag');
                                    blockStatus.innerText = 'started';
                                }
                                if(block.ub[0]?.status == 'idle'){
                                    blockStatus.classList.add('to-do-tag');
                                    blockStatus.innerText = 'to do';
                                }
                                if(block.ub[0]?.status == 'blocked'){
                                    blockStatus.className = 'blocked-tag';
                                    blockStatus.innerText = 'blocked';
                                }
                            }

                            blockNameContainer.addEventListener('click', () => {
                                console.log('blockID: ', block.id);
                                window.location.href = `/lesson-page?user_id=${user_id}&block_id=${block.id}`;
                            });

                            blockNameContainer.appendChild(blockStatus);
                            blockNameContainer.appendChild(blockNameElement);
                            blockContainer.appendChild(blockNameContainer);
                        });
                        mainContainer.appendChild(blockContainer);
                    } else {
                        const noBlocksMessage = document.createElement('div');
                        noBlocksMessage.className = 'no-blocks-message';
                        noBlocksMessage.innerText = 'No blocks available for this lesson.';
                        lessonNameContainer.appendChild(noBlocksMessage);
                    }
                });
            } else {
                console.error('Main container not found');
            }
    } catch (error) {
        console.error('Error:', error);
    }
});
