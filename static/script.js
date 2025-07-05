document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputSection = document.getElementById('input-section');
    const statsSection = document.getElementById('stats-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    const usernameInput = document.getElementById('username-input');
    const saveButton = document.getElementById('save-button');
    const logoutButton = document.getElementById('logout-button');
    const totalSolvedEl = document.getElementById('total-solved');
    const rankingEl = document.getElementById('ranking');
    const totalSubmissionsYearEl = document.getElementById('total-submissions-year');
    const totalActiveDaysEl = document.getElementById('total-active-days');
    const maxStreakEl = document.getElementById('max-streak');
    const heatmapContainer = document.getElementById('heatmap-container');
    
    let difficultyChartInstance = null;

    const fetchAndDisplayStats = (username) => {
        inputSection.classList.add('hidden');
        statsSection.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');

        fetch(`/api/user_stats/${username}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    localStorage.setItem('leetcodeUsername', username);
                    updateUI(data);
                    statsSection.classList.remove('hidden');
                } else {
                    throw new Error(data.message || 'An unknown API error occurred.');
                }
            })
            .catch(error => {
                alert(`Error: ${error.message}`);
                showInputSection();
            })
            .finally(() => {
                loadingIndicator.classList.add('hidden');
            });
    };
    
    const updateUI = (data) => {
        totalSolvedEl.textContent = data.totalSolved.toLocaleString();
        rankingEl.textContent = data.ranking.toLocaleString();
        createDifficultyChart(data);

        // Robustly handle calendar data that might be a string OR an object
        let calendarData = data.submissionCalendar || {};
        if (typeof calendarData === 'string' && calendarData.length > 0) {
            try {
                calendarData = JSON.parse(calendarData);
            } catch (e) {
                console.error("Failed to parse submissionCalendar string:", e);
                calendarData = {}; // Default to empty object on parse error
            }
        }
        
        const calendarStats = calculateCalendarStats(calendarData);
        // Note: The stats are calculated from the full year's data for accuracy
        totalSubmissionsYearEl.textContent = `${calendarStats.totalSubmissions} submissions in the past year`;
        totalActiveDaysEl.textContent = calendarStats.activeDays;
        maxStreakEl.textContent = calendarStats.maxStreak;
        
        // Render the heatmap with the compact one-month view
        renderHeatmap(calendarData);
    };

    const createDifficultyChart = (data) => {
        const ctx = document.getElementById('difficultyChart').getContext('2d');
        if (difficultyChartInstance) difficultyChartInstance.destroy();
        difficultyChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Easy', 'Medium', 'Hard'],
                datasets: [{
                    data: [data.easySolved, data.mediumSolved, data.hardSolved],
                    backgroundColor: ['rgba(0, 184, 163, 0.7)', 'rgba(255, 192, 30, 0.7)', 'rgba(239, 71, 67, 0.7)'],
                    borderColor: ['#00b8a3', '#ffc01e', '#ef4743'],
                    borderWidth: 1.5
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top', labels: { color: '#ffffff' } } }
            }
        });
    };
    
    const calculateCalendarStats = (calendarData) => {
        const timestamps = Object.keys(calendarData).map(Number).sort((a, b) => a - b);
        if (timestamps.length === 0) {
            return { totalSubmissions: 0, activeDays: 0, maxStreak: 0 };
        }

        let totalSubmissions = 0;
        let maxStreak = 0;
        let currentStreak = 0;
        
        for(const ts in calendarData) {
            totalSubmissions += calendarData[ts];
        }

        if (timestamps.length > 0) {
            currentStreak = 1;
            maxStreak = 1;
            for (let i = 1; i < timestamps.length; i++) {
                const prevDate = new Date(timestamps[i-1] * 1000);
                const currDate = new Date(timestamps[i] * 1000);
                
                const diffTime = currDate - prevDate;
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    currentStreak++;
                } else if (diffDays > 1) {
                    currentStreak = 1;
                }
                if (currentStreak > maxStreak) {
                    maxStreak = currentStreak;
                }
            }
        }
        
        return { totalSubmissions, activeDays: timestamps.length, maxStreak };
    };

    const renderHeatmap = (calendarData) => {
        heatmapContainer.innerHTML = '';
        const today = new Date();
        const startDate = new Date();

        // Show last ~5 weeks for a compact "one month" view
        // Go back 35 days (5 weeks) from today
        startDate.setDate(today.getDate() - 35);
        // Then, rewind to the previous Sunday to ensure the grid starts cleanly on a Sunday
        startDate.setDate(startDate.getDate() - startDate.getDay());

        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'heatmap-day';

            const timestamp = Math.floor(d.getTime() / 1000);
            const startOfDayTimestamp = (timestamp - (timestamp % 86400));
            
            const count = calendarData[startOfDayTimestamp] || 0;
            let level = 0;
            if (count > 0 && count <= 2) level = 1;
            else if (count > 2 && count <= 5) level = 2;
            else if (count > 5 && count <= 9) level = 3;
            else if (count > 9) level = 4;
            
            dayDiv.classList.add(`day-level-${level}`);
            heatmapContainer.appendChild(dayDiv);
        }
    };

    const showInputSection = () => {
        localStorage.removeItem('leetcodeUsername');
        statsSection.classList.add('hidden');
        loadingIndicator.classList.add('hidden');
        inputSection.classList.remove('hidden');
        usernameInput.value = '';
        usernameInput.focus();
    };

    // Event Listeners
    saveButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username) {
            fetchAndDisplayStats(username);
        }
    });
    
    usernameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            saveButton.click();
        }
    });

    logoutButton.addEventListener('click', showInputSection);

    // Initial Load
    const savedUsername = localStorage.getItem('leetcodeUsername');
    if (savedUsername) {
        fetchAndDisplayStats(savedUsername);
    } else {
        showInputSection();
    }
});