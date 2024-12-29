document.addEventListener("DOMContentLoaded", function() {
    const generateBtn = document.getElementById('generateBtn');
    const archiveBtn = document.getElementById('archiveBtn');
    const generateView = document.getElementById('generateView');
    const archiveView = document.getElementById('archiveView');
    const emailAddress = document.getElementById('emailAddress');
    const copyBtn = document.getElementById('copyBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const generateEmailBtn = document.getElementById('generateEmailBtn');
    const getPreviousEmailBtn = document.getElementById('getPreviousEmailBtn');
    const emailFrom = document.getElementById('emailFrom');
    const emailContent = document.getElementById('emailContent');
    const archiveMessageBtn = document.getElementById('archiveMessageBtn');
    const archiveEmails = document.getElementById('archiveEmails');
    const previousArchiveBtn = document.getElementById('previousArchiveBtn');
    const nextArchiveBtn = document.getElementById('nextArchiveBtn');
    const clearAllArchivesBtn = document.getElementById('clearAllArchivesBtn');
    const apiKey = '241a7cb6cb7a5519c56bdc787ba146b137c13060f6816109ad43f289e7f86713';

    let emailId = null;
    let emails = [];
    let archivedEmails = [];
    let archivePage = 1;
    let emailIndex = 0;
    const pageSize = 3;

    // Add this after other state variables
    let lastEmailState = null;

    const EMAIL_LIMIT = 5; // Maximum emails per device
    const deviceId = getOrCreateDeviceId();

    // Add after existing state variables
    function getOrCreateDeviceId() {
        let id = localStorage.getItem('deviceId');
        if (!id) {
            id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', id);
        }
        return id;
    }

    function getDeviceEmailCount() {
        const count = localStorage.getItem(`emailCount_${deviceId}`) || '0';
        return parseInt(count, 10);
    }

    function incrementDeviceEmailCount() {
        const currentCount = getDeviceEmailCount();
        localStorage.setItem(`emailCount_${deviceId}`, currentCount + 1);
    }

    function decrementDeviceEmailCount() {
        const currentCount = getDeviceEmailCount();
        if (currentCount > 0) {
            localStorage.setItem(`emailCount_${deviceId}`, currentCount - 1);
        }
    }

    // Add new function to track total emails created
    function getTotalEmailsCreated() {
        return parseInt(localStorage.getItem(`totalEmails_${deviceId}`) || '0');
    }

    function incrementTotalEmails() {
        const total = getTotalEmailsCreated();
        localStorage.setItem(`totalEmails_${deviceId}`, total + 1);
    }

    // Load emails from localStorage
    function loadEmailsFromStorage() {
        const storedEmails = localStorage.getItem('emails');
        const storedArchivedEmails = localStorage.getItem('archivedEmails');
        const storedEmailId = localStorage.getItem('emailId');
        if (storedEmails) {
            emails = JSON.parse(storedEmails);
            displayEmails(emails);
        }
        if (storedArchivedEmails) {
            archivedEmails = JSON.parse(storedArchivedEmails);
            displayArchivedEmails(archivedEmails);
        }
        if (storedEmailId) {
            emailId = storedEmailId;
            emailAddress.textContent = localStorage.getItem('emailAddress');
        }
    }

    // Save emails to localStorage
    function saveEmailsToStorage() {
        localStorage.setItem('emails', JSON.stringify(emails));
        localStorage.setItem('archivedEmails', JSON.stringify(archivedEmails));
        if (emailId) {
            localStorage.setItem('emailId', emailId);
            localStorage.setItem('emailAddress', emailAddress.textContent);
        }
    }

    // Add new function to manage email creation
    async function deleteOldEmail() {
        const oldEmailId = localStorage.getItem('previousEmailId');
        if (oldEmailId) {
            try {
                await fetch(`https://api.mailslurp.com/inboxes/${oldEmailId}`, {
                    method: 'DELETE',
                    headers: {
                        'x-api-key': apiKey
                    }
                });
                console.log('Old email deleted successfully');
            } catch (error) {
                console.error('Error deleting old email:', error);
            }
        }
    }

    async function generateEmail() {
        const totalCreated = getTotalEmailsCreated();
        if (totalCreated >= EMAIL_LIMIT) {
            alert('عذراً، لقد وصلت للحد الأقصى من البريد الإلكتروني (5).');
            return;
        }

        try {
            // Delete old email but keep the count
            await deleteOldEmail();

            // Save current emailId before creating new one
            if (emailId) {
                localStorage.setItem('previousEmailId', emailId);
            }

            // Save current state before generating new email
            if (emailId) {
                lastEmailState = {
                    emailId: emailId,
                    emailAddress: emailAddress.textContent,
                    emails: emails,
                    archivedEmails: archivedEmails
                };
                localStorage.setItem('lastEmailState', JSON.stringify(lastEmailState));
            }

            const username = generateRandomString(10);
            const response = await fetch('https://api.mailslurp.com/inboxes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ emailAddress: `${username}@mailslurp.com` })
            });
            const inbox = await response.json();
            emailId = inbox.id;
            emailAddress.textContent = inbox.emailAddress;
            emails = []; // Clear any previous emails
            emailFrom.value = '';
            emailContent.innerHTML = '';
            localStorage.setItem('lastEmail', inbox.emailAddress);
            saveEmailsToStorage(); // Save emails to local storage
            fetchEmails(); // Fetch emails immediately after generating a new email
            
            incrementTotalEmails(); // Add to total count
            
            // Only increment count if we didn't have a previous email
            if (!localStorage.getItem('previousEmailId')) {
                incrementDeviceEmailCount();
            }

            // Check if this is the last possible email
            if (totalCreated === EMAIL_LIMIT - 1) {
                localStorage.setItem('isLastEmail', 'true');
            }
        } catch (error) {
            console.error('Error generating email:', error);
            alert('حدث خطأ أثناء إنشاء البريد الإلكتروني');
        }
    }

    function generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    async function fetchEmails() {
        if (!emailId) return;
        
        try {
            const response = await fetch(`https://api.mailslurp.com/inboxes/${emailId}/emails`, {
                headers: {
                    'x-api-key': apiKey
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch emails');
            }

            const fetchedEmails = await response.json();
            const deletedEmailIds = JSON.parse(localStorage.getItem('deletedEmailIds') || '[]');
            
            emails = Array.isArray(fetchedEmails) ? fetchedEmails : [];
            emails = emails.filter(email => 
                !archivedEmails.some(archived => archived.id === email.id) &&
                !deletedEmailIds.includes(email.id)
            );
            
            displayEmails(emails);
            saveEmailsToStorage();
        } catch (error) {
            console.error('Error fetching emails:', error);
            emails = [];
            displayEmails([]);
        }
    }

    function displayEmails(emails) {
        // Reset the display elements
        emailFrom.value = '';
        emailContent.innerHTML = '';
        
        // Hide navigation buttons by default
        previousEmailBtn.style.display = 'none';
        nextEmailBtn.style.display = 'none';

        if (!emails || !emails.length) {
            return;
        }

        // Ensure emailIndex is within bounds
        if (emailIndex >= emails.length) {
            emailIndex = 0;
        }

        // Get current email
        const currentEmail = emails[emailIndex];
        if (!currentEmail) return;

        // Show navigation buttons if there are multiple emails
        if (emails.length > 1) {
            previousEmailBtn.style.display = 'inline-block';
            nextEmailBtn.style.display = 'inline-block';
        }

        // Display current email
        emailFrom.value = currentEmail.from || 'Unknown sender';
        fetchEmailDetails(currentEmail.id)
            .then(details => {
                if (!details) return;
                let emailBody = details.body || 'No content';
                emailBody = cleanEmailBody(emailBody);
                emailContent.innerHTML = emailBody;
            })
            .catch(err => {
                console.error('Error fetching email details:', err);
                emailContent.innerHTML = 'Error loading email content';
            });
    }

    async function fetchEmailDetails(emailId) {
        try {
            const response = await fetch(`https://api.mailslurp.com/emails/${emailId}`, {
                headers: {
                    'x-api-key': apiKey
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching email details:', error);
            return {};
        }
    }

    function cleanEmailBody(html) {
        if (!html) return '';
        
        // Remove potentially dangerous tags and attributes
        const safeHtml = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['a', 'b', 'i', 'strong', 'em', 'p', 'br', 'div', 'span'],
            ALLOWED_ATTR: ['href', 'class', 'target']
        });

        // Clean up empty lines and spaces more aggressively
        let cleanedHtml = safeHtml
            .replace(/&nbsp;/g, ' ')
            .replace(/[\u200B-\u200F\uFEFF\u200E\u200D]/g, '') // Remove all zero-width spaces and directional marks
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .replace(/(?:\r\n|\r|\n){2,}/g, '\n') // Collapse multiple newlines
            .replace(/^\s+|\s+$/gm, '') // Trim each line
            .trim();

        // Add classes to links
        const div = document.createElement('div');
        div.innerHTML = cleanedHtml;
        div.querySelectorAll('a').forEach(link => {
            link.classList.add('text-blue-500', 'hover:text-blue-700');
            link.setAttribute('target', '_blank');
        });

        return div.innerHTML;
    }

    function parseSubject(subject) {
        // Support for verification links
        subject = subject.replace(/(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim, 
            (url) => {
                if (url.toLowerCase().includes('verify') || url.toLowerCase().includes('confirm')) {
                    return `<a href="${url}" target="_blank" class="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 inline-flex items-center">
                        <i class="ph ph-check-circle mr-1"></i> Verify Email
                    </a>`;
                }
                return `<a href="${url}" target="_blank" class="text-blue-500 hover:text-blue-700">${url}</a>`;
            }
        );

        // Support for other common patterns
        subject = subject.replace(/\[(.*?)\]/g, '<span class="px-2 bg-gray-200 rounded">[$1]</span>');
        subject = subject.replace(/\{(.*?)\}/g, '<span class="px-2 bg-yellow-100 rounded">{$1}</span>');

        return subject;
    }

    function displayArchivedEmails(emails) {
        archiveEmails.innerHTML = '';
        if (emails.length === 0) {
            archiveEmails.innerHTML = '<p class="text-center text-gray-500">No archived emails.</p>';
        } else {
            const paginatedEmails = getPaginatedArchives(archivePage);
            paginatedEmails.forEach(email => {
                const emailElement = document.createElement('div');
                emailElement.classList.add('p-4', 'mb-4', 'bg-gray-100', 'rounded', 'relative');
                const emailBody = cleanEmailBody(email.body || 'No content');
                emailElement.innerHTML = `
                    <div class="font-bold">From: ${email.from || 'Unknown sender'}</div>
                    <div class="text-sm pb-8 md:pb-2">${emailBody}</div>
                    <button onclick="removeArchivedEmail('${email.id}')" 
                            class="absolute md:top-2 md:right-2 bottom-2 right-2 md:bottom-auto p-2 text-red-500 hover:text-red-700 transition-colors" 
                            title="Remove from Archive">
                        <i class="ph ph-trash text-lg"></i>
                    </button>
                `;
                archiveEmails.appendChild(emailElement);
            });
        }
        updateArchiveNavigationButtons();
    }

    function updateArchiveNavigationButtons() {
        const totalPages = Math.ceil(archivedEmails.length / pageSize);
        if (totalPages > 1) {
            if (archivePage < totalPages) {
                nextArchiveBtn.style.display = 'inline-block';
                nextArchiveBtn.disabled = false;
            } else {
                nextArchiveBtn.style.display = 'none';
            }
            if (archivePage > 1) {
                previousArchiveBtn.style.display = 'inline-block';
                previousArchiveBtn.disabled = false;
            } else {
                previousArchiveBtn.style.display = 'none';
            }
        } else {
            nextArchiveBtn.style.display = 'none';
            previousArchiveBtn.style.display = 'none';
        }
    }

    function navigateEmails(direction) {
        if (direction === 'next') {
            emailIndex = (emailIndex + 1) % emails.length; // Go to the next email, loop back to the first
        } else if (direction === 'previous') {
            emailIndex = (emailIndex - 1 + emails.length) % emails.length; // Go to the previous email, loop back to the last
        }
        displayEmails(emails);
    }

    nextEmailBtn.addEventListener('click', () => navigateEmails('next'));
    previousEmailBtn.addEventListener('click', () => navigateEmails('previous'));

    nextArchiveBtn.addEventListener('click', function() {
        archivePage++;
        displayArchivedEmails(getPaginatedArchives(archivePage));
    });

    previousArchiveBtn.addEventListener('click', function() {
        if (archivePage > 1) {
            archivePage--;
            displayArchivedEmails(getPaginatedArchives(archivePage));
        }
    });

    function getPaginatedArchives(page) {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return archivedEmails.slice(start, end);
    }

    function refreshEmails() {
        if (!emailId) {
            setTimeout(refreshEmails, 10000);
            return;
        }

        fetchEmails()
            .then(() => {
                setTimeout(refreshEmails, 10000);
            })
            .catch(error => {
                console.error('Error in refresh loop:', error);
                setTimeout(refreshEmails, 10000);
            });
    }

    // Simplified view switching
    function switchView(view) {
        if (view === 'generate') {
            generateView.classList.remove('hidden');
            archiveView.classList.add('hidden');
            generateBtn.classList.add('bg-gray-100', 'font-medium');
            archiveBtn.classList.remove('bg-gray-100', 'font-medium');
        } else {
            generateView.classList.add('hidden');
            archiveView.classList.remove('hidden');
            generateBtn.classList.remove('bg-gray-100', 'font-medium');
            archiveBtn.classList.add('bg-gray-100', 'font-medium');
            displayArchivedEmails(archivedEmails);
        }
    }

    // Single event listeners for view switching
    generateBtn.addEventListener('click', () => switchView('generate'));
    archiveBtn.addEventListener('click', () => switchView('archive'));

    // Set initial view
    switchView('generate');

    // Action button handlers
    generateEmailBtn.addEventListener('click', generateEmail);
    
    getPreviousEmailBtn.addEventListener('click', async function() {
        const lastState = localStorage.getItem('lastEmailState');
        if (!lastState) {
            alert('لا يوجد بريد إلكتروني سابق للاستعادة');
            return;
        }

        const totalCreated = getTotalEmailsCreated();
        if (totalCreated >= EMAIL_LIMIT && isLastUsableEmail()) {
            if (!confirm('تنبيه: هذا هو بريدك الإلكتروني الأخير المتاح!\n\nهل أنت متأكد من استعادة البريد السابق؟\nلن تتمكن من:\n- العودة إلى البريد الحالي\n- إنشاء بريد جديد\n\nهذا القرار نهائي.')) {
                return;
            }
        }

        try {
            const state = JSON.parse(lastState);
            
            // Save current email info before restoring
            const currentEmailId = emailId;
            
            // Restore previous state
            emailId = state.emailId;
            emailAddress.textContent = state.emailAddress;
            archivedEmails = state.archivedEmails || [];
            
            // Delete current email if it exists
            if (currentEmailId) {
                try {
                    await fetch(`https://api.mailslurp.com/inboxes/${currentEmailId}`, {
                        method: 'DELETE',
                        headers: {
                            'x-api-key': apiKey
                        }
                    });
                } catch (error) {
                    console.error('Error deleting current email:', error);
                }
            }

            // Fetch emails for restored inbox
            const response = await fetch(`https://api.mailslurp.com/inboxes/${emailId}/emails`, {
                headers: {
                    'x-api-key': apiKey
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch emails');
            
            const currentEmails = await response.json();
            emails = currentEmails.filter(email => 
                !archivedEmails.some(archived => archived.id === email.id)
            );
            
            emailIndex = 0;
            displayEmails(emails);
            displayArchivedEmails(archivedEmails);
            saveEmailsToStorage();
            localStorage.removeItem('lastEmailState');
            
            alert('تم استعادة البريد السابق بنجاح');
        } catch (error) {
            console.error('Error restoring previous email:', error);
            alert('حدث خطأ أثناء استعادة البريد السابق');
        }
    });

    copyBtn.addEventListener('click', function() {
        const emailText = emailAddress.textContent;
        if (!emailText) return;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(emailText)
                .then(() => alert('تم نسخ عنوان البريد الإلكتروني'))
                .catch(err => console.error('Failed to copy:', err));
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = emailText;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('تم نسخ البريد الإلكتروني إلى الحافظة');
            } catch (err) {
                console.error('Failed to copy:', err);
            }
            document.body.removeChild(textArea);
        }
    });

    // Add new function to check if this is the last usable email
    function isLastUsableEmail() {
        const totalCreated = getTotalEmailsCreated();
        const currentCount = getDeviceEmailCount();
        return totalCreated >= EMAIL_LIMIT && currentCount === 1;
    }

    // Update deleteBtn event listener
    deleteBtn.addEventListener('click', async function() {
        // Check if this is the last usable email
        if (isLastUsableEmail()) {
            alert('لا يمكن حذف البريد الإلكتروني الأخير. لقد استنفذت الحد الأقصى (5 إيميلات).');
            return;
        }

        if (!emailId || !confirm('هل أنت متأكد أنك تريد حذف هذا البريد الإلكتروني؟')) return;

        try {
            await fetch(`https://api.mailslurp.com/inboxes/${emailId}`, {
                method: 'DELETE',
                headers: {
                    'x-api-key': apiKey
                }
            });
            
            // Clear storage
            localStorage.removeItem('previousEmailId');
            decrementDeviceEmailCount();
            
            // Reset UI
            emailId = null;
            emailAddress.textContent = '';
            emailFrom.value = '';
            emailContent.innerHTML = '';
            emails = [];
            archivedEmails = [];
            localStorage.removeItem('emailId');
            localStorage.removeItem('emailAddress');
            localStorage.removeItem('lastEmailState');
            localStorage.removeItem('isLastEmail');
            saveEmailsToStorage();
            
            // Update the message based on remaining count
            const remaining = EMAIL_LIMIT - getTotalEmailsCreated();
            if (remaining === 0 && getDeviceEmailCount() === 1) {
                alert('تم حذف البريد الإلكتروني بنجاح. هذا هو البريد الإلكتروني الأخير المتاح لك.');
            } else if (remaining > 0) {
                alert(`تم حذف البريد الإلكتروني بنجاح. يمكنك إنشاء ${remaining} بريد إلكتروني آخر.`);
            } else {
                alert('تم حذف البريد الإلكتروني بنجاح.');
            }
        } catch (error) {
            console.error('Error deleting email:', error);
            alert('حدث خطأ أثناء حذف البريد الإلكتروني');
        }
    });

    archiveMessageBtn.addEventListener('click', async function() {
        if (emails.length > 0) {
            const latestEmail = emails.shift();
            const details = await fetchEmailDetails(latestEmail.id);
            const archivedEmail = {
                id: latestEmail.id,
                from: details.from || 'Unknown sender',
                body: cleanEmailBody(details.body || 'No content')
            };
            archivedEmails.push(archivedEmail);
            displayEmails(emails);
            displayArchivedEmails(archivedEmails);
            saveEmailsToStorage(); // Save emails to local storage
        }
    });

    // Start the email refresh loop
    refreshEmails();

    // Load emails from local storage on page load
    loadEmailsFromStorage();

    // Function to remove an email from the archive
    window.removeArchivedEmail = function(emailId) {
        if (!confirm('هل أنت متأكد من حذف هذه الرسالة من الأرشيف؟ لن تتمكن من استعادتها لاحقاً.')) {
            return;
        }

        // Add to permanent blacklist
        const deletedEmailIds = JSON.parse(localStorage.getItem('deletedEmailIds') || '[]');
        deletedEmailIds.push(emailId);
        localStorage.setItem('deletedEmailIds', JSON.stringify(deletedEmailIds));

        // Remove from archived emails
        archivedEmails = archivedEmails.filter(email => email.id !== emailId);
        
        // Remove from current emails if exists
        emails = emails.filter(email => email.id !== emailId);
        
        // Update displays
        displayEmails(emails);
        displayArchivedEmails(archivedEmails);
        
        // Save changes to storage
        saveEmailsToStorage();
        
        alert('تم حذف الرسالة نهائياً');
    };

    // const menuToggle = document.getElementById('menuToggle');
    // const mobileNav = document.getElementById('mobileNav');
    // let isMenuOpen = false;

    // menuToggle.addEventListener('click', (e) => {
    //     e.stopPropagation();
    //     isMenuOpen = !isMenuOpen;
    //     mobileNav.classList.toggle('-translate-y-full');
    //     mobileNav.classList.toggle('translate-y-0');
    //     document.body.classList.toggle('menu-open');
    //     menuToggle.classList.toggle('text-blue-500');
    // });

    // // Close menu when clicking anywhere else
    // document.addEventListener('click', () => {
    //     if (isMenuOpen) {
    //         isMenuOpen = false;
    //         mobileNav.classList.add('-translate-y-full');
    //         mobileNav.classList.remove('translate-y-0');
    //         menuToggle.classList.remove('text-blue-500');
    //     }
    // });

    // mobileNav?.addEventListener('click', (e) => e.stopPropagation());

    // // Update mobile handlers to use switchView
    // document.getElementById('generateBtnMobile')?.addEventListener('click', () => {
    //     switchView('generate');
    //     isMenuOpen = false;
    //     mobileNav.classList.add('-translate-y-full');
    //     mobileNav.classList.remove('translate-y-0');
    //     menuToggle.classList.remove('text-blue-500');
    // });

    // document.getElementById('archiveBtnMobile')?.addEventListener('click', () => {
    //     switchView('archive');
    //     isMenuOpen = false;
    //     mobileNav.classList.add('-translate-y-full');
    //     mobileNav.classList.remove('translate-y-0');
    //     menuToggle.classList.remove('text-blue-500');
    // });

    // Remove duplicate mobile button handlers and references
    // ...rest of existing code...
});