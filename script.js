const SUPABASE_URL = 'https://gszpbndruqqrrxuhbmkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzenBibmRydXFxcnJ4dWhibWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODE0ODAsImV4cCI6MjA1NTM1NzQ4MH0.sTZAKdxCLKqX4ROLswJWJQodHtEwY44tG2rMGQceKeU';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


async function fetchAllTrollCounts() {
    const { data, error } = await supabase
        .from('trollcountv2')
        .select('*')
        .order('show_date', { ascending: true });

    if (error) {
        console.error('Error fetching data:', error);
        return null;
    }
    return data;
}

function calculatePercentageChange(latest, average) {
    if (average === 0) return 0; // To avoid division by zero
    return ((latest - average) / average) * 100;
}

function getLatestAndAveragesForDays(data) {
    if (!data || data.length === 0) return { 
        thursday: { latest: 0, last100Average: 0, last10Average: 0, percentageChange: 0 },
        sunday: { latest: 0, last100Average: 0, last10Average: 0, percentageChange: 0 }
    };

    const sortedData = data.sort((a, b) => new Date(b.show_date) - new Date(a.show_date));

    let latestThursday = null;
    let latestSunday = null;
    let thursdayShows100 = [], thursdayShows10 = [];
    let sundayShows100 = [], sundayShows10 = [];

    for (let i = 0; i < sortedData.length; i++) {
        const date = new Date(sortedData[i].show_date);
        const count = Number(sortedData[i].count);

        if (date.getDay() === 4) { // Thursday
            if (!latestThursday) latestThursday = count;
            if (thursdayShows100.length < 100) thursdayShows100.push(count);
            if (thursdayShows10.length < 10) thursdayShows10.push(count);
        } else if (date.getDay() === 0) { // Sunday
            if (!latestSunday) latestSunday = count;
            if (sundayShows100.length < 100) sundayShows100.push(count);
            if (sundayShows10.length < 10) sundayShows10.push(count);
        }
        // Break if enough data for both days
        if ((thursdayShows100.length === 100 || !latestThursday) && (sundayShows100.length === 100 || !latestSunday) &&
            thursdayShows10.length === 10 && sundayShows10.length === 10) break;
    }

    const thursday100Average = thursdayShows100.length > 0 ? thursdayShows100.reduce((sum, c) => sum + c, 0) / thursdayShows100.length : 0;
    const sunday100Average = sundayShows100.length > 0 ? sundayShows100.reduce((sum, c) => sum + c, 0) / sundayShows100.length : 0;
    const thursday10Average = thursdayShows10.length > 0 ? thursdayShows10.reduce((sum, c) => sum + c, 0) / thursdayShows10.length : 0;
    const sunday10Average = sundayShows10.length > 0 ? sundayShows10.reduce((sum, c) => sum + c, 0) / sundayShows10.length : 0;

    return {
        thursday: {
            latest: latestThursday || 0,
            last100Average: thursday100Average,
            last10Average: thursday10Average,
            percentageChange: calculatePercentageChange(latestThursday || 0, thursday100Average)
        },
        sunday: {
            latest: latestSunday || 0,
            last100Average: sunday100Average,
            last10Average: sunday10Average,
            percentageChange: calculatePercentageChange(latestSunday || 0, sunday100Average)
        }
    };
}

function findAllTimeLowAndHigh(data) {
    if (!data || data.length === 0) return { 
        thursday: { low: 0, high: 0 },
        sunday: { low: Infinity, high: -Infinity } // Initialize with opposite extremes
    };

    let thursdayLow = Infinity, thursdayHigh = -Infinity;
    let sundayLow = Infinity, sundayHigh = -Infinity;

    data.forEach(row => {
        const count = Number(row.count);
        const day = new Date(row.show_date).getDay();

        if (day === 4) { // Thursday
            thursdayLow = Math.min(thursdayLow, count);
            thursdayHigh = Math.max(thursdayHigh, count);
        } else if (day === 0) { // Sunday
            sundayLow = Math.min(sundayLow, count);
            sundayHigh = Math.max(sundayHigh, count);
        }
    });

    return {
        thursday: {
            low: thursdayLow === Infinity ? 0 : thursdayLow,
            high: thursdayHigh === -Infinity ? 0 : thursdayHigh
        },
        sunday: {
            low: sundayLow === Infinity ? 0 : sundayLow,
            high: sundayHigh === -Infinity ? 0 : sundayHigh
        }
    };
}


async function loadAndCalculateAverages() {
    const data = await fetchAllTrollCounts();
    if (data) {
        const results = getLatestAndAveragesForDays(data);
        const extremes = findAllTimeLowAndHigh(data);

        // Display all shows averages
        document.getElementById('last100Thursday').textContent = Math.round(results.thursday.last100Average);
        document.getElementById('last100Sunday').textContent = Math.round(results.sunday.last100Average);

        // Display last 10 shows averages
        document.getElementById('last10Thursday').textContent = Math.round(results.thursday.last10Average);
        document.getElementById('last10Sunday').textContent = Math.round(results.sunday.last10Average);

        // Display latest counts
        document.getElementById('latestThursday').textContent = results.thursday.latest;
        document.getElementById('latestSunday').textContent = results.sunday.latest;

        // Display percentage change
        document.querySelector('#changeThursday p').textContent = results.thursday.percentageChange.toFixed(2) + '%';
        document.querySelector('#changeSunday p').textContent = results.sunday.percentageChange.toFixed(2) + '%';

        // Display all-time low and high
        document.getElementById('thursdayLow').textContent = extremes.thursday.low;
        document.getElementById('thursdayHigh').textContent = extremes.thursday.high;
        document.getElementById('sundayLow').textContent = extremes.sunday.low;
        document.getElementById('sundayHigh').textContent = extremes.sunday.high;

        // Apply the correct class for the percentage change thursday
        if(results.thursday.percentageChange < 0) {
            document.querySelector('#changeThursday').classList.add('percentage-down');
        } else if (results.thursday.percentageChange > 0) {
            document.querySelector('#changeThursday').classList.add('percentage-up');
        } else {
            document.querySelector('#changeThursday').classList.add('percentage-nochange');
        }

        // Apply the correct class for the percentage change sunday
        if(results.sunday.percentageChange < 0) {
            document.querySelector('#changeSunday').classList.add('percentage-down');
        } else if (results.sunday.percentageChange > 0) {
            document.querySelector('#changeSunday').classList.add('percentage-up');
        } else {
            document.querySelector('#changeSunday').classList.add('percentage-nochange');
        }
    }
}

loadAndCalculateAverages();

const applyColorLabel = function(data) {
    if(data < 0) {
        document.querySelector('#changeSunday').classList.add('percentage-down');
    } else if (data > 0) {
        document.querySelector('#changeSunday').classList.add('percentage-up');
    } else {
        document.querySelector('#changeSunday').classList.add('percentage-nochange');
    }
}


