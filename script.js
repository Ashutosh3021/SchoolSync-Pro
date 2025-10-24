// Sample Data
let teachers = [
    { id: 1, name: "Dr. Sharma", branch: "Science", subjects: ["Physics", "Math"], available: true },
    { id: 2, name: "Mrs. Patel", branch: "Commerce", subjects: ["Accounts", "Economics"], available: true },
    { id: 3, name: "Mr. Kumar", branch: "Science", subjects: ["Chemistry", "Biology"], available: true },
    { id: 4, name: "Ms. Singh", branch: "Arts", subjects: ["English", "History"], available: true },
    { id: 5, name: "Dr. Reddy", branch: "Science", subjects: ["Physics", "Math"], available: true }
];
let timetable = [
    { day: "Monday", time: "9:00", class: "10A", subject: "Physics", teacherId: 1, room: "301" },
    { day: "Monday", time: "10:00", class: "10B", subject: "Math", teacherId: 1, room: "302" },
    { day: "Tuesday", time: "9:00", class: "11A", subject: "Chemistry", teacherId: 3, room: "303" },
    { day: "Wednesday", time: "11:00", class: "10A", subject: "English", teacherId: 4, room: "201" },
    { day: "Thursday", time: "14:00", class: "12A", subject: "Biology", teacherId: 3, room: "304" }
];
let attendance = {};
let activities = [];
let substitutions = [];
const timeSlots = ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    initializeAttendance();
    updateDashboard();
    renderTimetable();
    renderTeacherList();
    populateTeacherDropdown();
    renderTodaySchedule();
    renderActivityFeed();
    setupDragDrop();
});
function loadFromStorage() {
    const stored = localStorage.getItem('schoolData');
    if (stored) {
        const data = JSON.parse(stored);
        teachers = data.teachers || teachers;
        timetable = data.timetable || timetable;
        attendance = data.attendance || {};
        activities = data.activities || [];
        substitutions = data.substitutions || [];
    }
}
function saveToStorage() {
    localStorage.setItem('schoolData', JSON.stringify({
        teachers, timetable, attendance, activities, substitutions
    }));
}
function initializeAttendance() {
    const today = new Date().toISOString().split('T')[0];
    if (!attendance[today]) {
        attendance[today] = {};
        teachers.forEach(t => {
            attendance[today][t.id] = 'present';
            t.available = true;
        });
    } else {
        teachers.forEach(t => {
            t.available = attendance[today][t.id] === 'present';
        });
    }
}
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.target.closest('.nav-item').classList.add('active');
    
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}
function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance[today] || {};
    
    const present = Object.values(todayAttendance).filter(s => s === 'present').length;
    const absent = teachers.length - present;
    
    document.getElementById('totalTeachers').textContent = teachers.length;
    document.getElementById('presentToday').textContent = present;
    document.getElementById('absentToday').textContent = absent;
    document.getElementById('substitutions').textContent = substitutions.length;
}
function renderTimetable() {
    const tbody = document.getElementById('timetableBody');
    tbody.innerHTML = '';
    
    timeSlots.forEach(time => {
        const row = document.createElement('tr');
        row.innerHTML = `<td><strong>${formatTime(time)}</strong></td>`;
        
        days.forEach(day => {
            const cell = document.createElement('td');
            cell.dataset.day = day;
            cell.dataset.time = time;
            cell.style.minHeight = '60px';
            
            const classes = timetable.filter(c => c.day === day && c.time === time);
            classes.forEach(cls => {
                const teacher = teachers.find(t => t.id === cls.teacherId);
                const div = document.createElement('div');
                div.className = `schedule-cell subject-${cls.subject.toLowerCase()}`;
                div.draggable = true;
                div.dataset.classId = timetable.indexOf(cls);
                div.innerHTML = `
                    <strong>${cls.class}</strong><br>
                    ${cls.subject}<br>
                    <small>${teacher ? teacher.name : 'N/A'} - ${cls.room}</small>
                `;
                div.ondragstart = drag;
                cell.appendChild(div);
            });
            
            cell.ondrop = drop;
            cell.ondragover = allowDrop;
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
}
function setupDragDrop() {
    // Drag and drop handlers are set in renderTimetable
}
function drag(ev) {
    ev.dataTransfer.setData("classId", ev.target.dataset.classId);
}
function allowDrop(ev) {
    ev.preventDefault();
}
function drop(ev) {
    ev.preventDefault();
    const classId = ev.dataTransfer.getData("classId");
    const cell = ev.target.closest('td');
    
    if (cell && cell.dataset.day && cell.dataset.time) {
        timetable[classId].day = cell.dataset.day;
        timetable[classId].time = cell.dataset.time;
        renderTimetable();
        saveToStorage();
        showNotification('Class moved successfully');
        addActivity('Class rescheduled', 'success');
    }
}
function renderTeacherList() {
    const list = document.getElementById('teacherList');
    list.innerHTML = '';
    
    teachers.forEach(teacher => {
        const card = document.createElement('div');
        card.className = 'teacher-card';
        card.innerHTML = `
            <div class="teacher-info">
                <h4>${teacher.name}</h4>
                <p>${teacher.branch} - ${teacher.subjects.join(', ')}</p>
            </div>
            <div class="attendance-toggle ${teacher.available ? 'present' : ''}" onclick="toggleAttendance(${teacher.id})"></div>
        `;
        list.appendChild(card);
    });
}
function toggleAttendance(teacherId) {
    const teacher = teachers.find(t => t.id === teacherId);
    const today = new Date().toISOString().split('T')[0];
    
    teacher.available = !teacher.available;
    attendance[today][teacherId] = teacher.available ? 'present' : 'absent';
    
    renderTeacherList();
    updateDashboard();
    saveToStorage();
    
    if (!teacher.available) {
        // Teacher marked absent, find substitutes
        findSubstitutes(teacherId);
    } else {
        showNotification(`${teacher.name} marked present`);
        addActivity(`${teacher.name} marked present`, 'success');
    }
}
function findSubstitutes(teacherId) {
    const teacher = teachers.find(t => t.id === teacherId);
    const todayClasses = getTodayClasses().filter(c => c.teacherId === teacherId);
    
    if (todayClasses.length === 0) {
        showNotification(`${teacher.name} marked absent (no classes today)`);
        addActivity(`${teacher.name} marked absent`, 'warning');
        return;
    }
    
    const suggestions = [];
    
    todayClasses.forEach(cls => {
        // Layer 1: Same subject teachers
        const sameSubject = teachers.filter(t => 
            t.id !== teacherId && 
            t.available && 
            t.subjects.includes(cls.subject)
        );
        
        sameSubject.forEach(t => {
            const hasConflict = timetable.some(c => 
                c.teacherId === t.id && 
                c.day === cls.day && 
                c.time === cls.time
            );
            if (!hasConflict) {
                suggestions.push({ teacher: t, class: cls, layer: 1 });
            }
        });
        
        // Layer 2: Available teachers in same time slot
        const available = teachers.filter(t => 
            t.id !== teacherId && 
            t.available
        );
        
        available.forEach(t => {
            const hasConflict = timetable.some(c => 
                c.teacherId === t.id && 
                c.day === cls.day && 
                c.time === cls.time
            );
            if (!hasConflict && !sameSubject.includes(t)) {
                suggestions.push({ teacher: t, class: cls, layer: 2 });
            }
        });
    });
    
    if (suggestions.length > 0) {
        showSubstituteModal(teacher, suggestions);
    } else {
        showNotification(`${teacher.name} marked absent - No substitutes available`, true);
        addActivity(`${teacher.name} marked absent - No substitute found`, 'warning');
    }
}
function showSubstituteModal(absentTeacher, suggestions) {
    const content = document.getElementById('substituteContent');
    content.innerHTML = `
        <p><strong>${absentTeacher.name}</strong> has been marked absent.</p>
        <p>Classes requiring substitutes:</p>
        <div class="substitute-suggestions">
    `;
    
    const uniqueClasses = [...new Map(suggestions.map(s => [s.class.day + s.class.time, s])).values()];
    
    uniqueClasses.forEach(item => {
        const classTeachers = suggestions.filter(s => 
            s.class.day === item.class.day && 
            s.class.time === item.class.time
        );
        
        content.innerHTML += `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-light); border-radius: 8px;">
                <h4>${item.class.day} ${formatTime(item.class.time)} - ${item.class.class} (${item.class.subject})</h4>
                <div style="margin-top: 0.5rem;">
        `;
        
        classTeachers.forEach(sug => {
            content.innerHTML += `
                <div class="suggestion-item">
                    <div>
                        <strong>${sug.teacher.name}</strong>
                        <p style="font-size: 0.875rem; color: #64748b; margin: 0;">${sug.teacher.subjects.join(', ')}</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span class="suggestion-badge">${sug.layer === 1 ? 'Same Subject' : 'Available'}</span>
                        <button class="btn btn-primary" style="padding: 0.5rem 1rem;" onclick="assignSubstitute(${sug.teacher.id}, ${item.class.day}, '${item.class.time}', ${absentTeacher.id})">
                            Assign
                        </button>
                    </div>
                </div>
            `;
        });
        
        content.innerHTML += '</div></div>';
    });
    
    content.innerHTML += '</div>';
    openModal('substituteModal');
}
function assignSubstitute(substituteId, day, time, absentTeacherId) {
    const substitute = teachers.find(t => t.id === substituteId);
    const absentTeacher = teachers.find(t => t.id === absentTeacherId);
    
    const classIndex = timetable.findIndex(c => 
        c.teacherId === absentTeacherId && 
        c.day === day && 
        c.time === time
    );
    
    if (classIndex !== -1) {
        timetable[classIndex].teacherId = substituteId;
        substitutions.push({
            original: absentTeacherId,
            substitute: substituteId,
            class: timetable[classIndex],
            date: new Date().toISOString().split('T')[0]
        });
        
        renderTimetable();
        renderTodaySchedule();
        updateDashboard();
        saveToStorage();
        closeModal('substituteModal');
        showNotification(`${substitute.name} assigned as substitute`);
        addActivity(`${substitute.name} substituting for ${absentTeacher.name}`, 'success');
    }
}
function getTodayClasses() {
    const today = new Date().getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today];
    return timetable.filter(c => c.day === todayName);
}
function renderTodaySchedule() {
    const tbody = document.getElementById('todaySchedule');
    const todayClasses = getTodayClasses().sort((a, b) => a.time.localeCompare(b.time));
    
    tbody.innerHTML = '';
    if (todayClasses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">No classes scheduled for today</td></tr>';
        return;
    }
    
    todayClasses.forEach(cls => {
        const teacher = teachers.find(t => t.id === cls.teacherId);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatTime(cls.time)}</td>
            <td>${cls.class}</td>
            <td>${cls.subject}</td>
            <td>${teacher ? teacher.name : 'N/A'}</td>
            <td>${cls.room}</td>
        `;
        tbody.appendChild(row);
    });
}
function addClass(event) {
    event.preventDefault();
    
    const newClass = {
        day: document.getElementById('classDay').value,
        time: document.getElementById('classTime').value,
        class: document.getElementById('className').value,
        subject: document.getElementById('classSubject').value,
        teacherId: parseInt(document.getElementById('classTeacher').value),
        room: document.getElementById('classRoom').value
    };
    
    timetable.push(newClass);
    renderTimetable();
    renderTodaySchedule();
    saveToStorage();
    closeModal('classModal');
    showNotification('Class added successfully');
    addActivity(`New class added: ${newClass.class} - ${newClass.subject}`, 'success');
    event.target.reset();
}
function populateTeacherDropdown() {
    const select = document.getElementById('classTeacher');
    select.innerHTML = '';
    teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.id;
        option.textContent = `${teacher.name} (${teacher.subjects.join(', ')})`;
        select.appendChild(option);
    });
}
function detectConflicts() {
    const conflicts = [];
    
    timetable.forEach((cls, index) => {
        // Check for teacher conflicts
        const teacherConflicts = timetable.filter((c, i) => 
            i !== index && 
            c.teacherId === cls.teacherId && 
            c.day === cls.day && 
            c.time === cls.time
        );
        
        if (teacherConflicts.length > 0) {
            conflicts.push({
                type: 'teacher',
                class1: cls,
                class2: teacherConflicts[0],
                teacher: teachers.find(t => t.id === cls.teacherId)
            });
        }
        
        // Check for room conflicts
        const roomConflicts = timetable.filter((c, i) => 
            i !== index && 
            c.room === cls.room && 
            c.day === cls.day && 
            c.time === cls.time
        );
        
        if (roomConflicts.length > 0) {
            conflicts.push({
                type: 'room',
                class1: cls,
                class2: roomConflicts[0]
            });
        }
    });
    
    // Highlight conflicts
    document.querySelectorAll('.schedule-cell').forEach(cell => {
        cell.classList.remove('conflict');
    });
    
    conflicts.forEach(conflict => {
        const cells = document.querySelectorAll(`[data-class-id]`);
        cells.forEach(cell => {
            const classId = parseInt(cell.dataset.classId);
            const cls = timetable[classId];
            if (cls === conflict.class1 || cls === conflict.class2) {
                cell.classList.add('conflict');
            }
        });
    });
    
    if (conflicts.length > 0) {
        showNotification(`${conflicts.length} conflict(s) detected and highlighted`, true);
    } else {
        showNotification('No conflicts found');
    }
}
function saveRoutine() {
    saveToStorage();
    showNotification('Routine saved successfully');
    addActivity('Timetable saved', 'success');
}
function renderActivityFeed() {
    const feed = document.getElementById('activityFeed');
    if (activities.length === 0) {
        feed.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">No recent activity</p>';
        return;
    }
    
    feed.innerHTML = '';
    activities.slice(-5).reverse().forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon ${activity.type}">
                <i class="fas ${activity.type === 'success' ? 'fa-check' : 'fa-exclamation'}"></i>
            </div>
            <div>
                <p>${activity.text}</p>
                <small style="color: #64748b;">${formatDateTime(activity.time)}</small>
            </div>
        `;
        feed.appendChild(item);
    });
}
function addActivity(text, type) {
    activities.push({ text, type, time: new Date().toISOString() });
    renderActivityFeed();
    saveToStorage();
}
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const validTypes = ['.xlsx', '.xls', '.csv', '.pdf', '.txt'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.some(type => fileExt.includes(type))) {
        showNotification('Invalid file format', true);
        return;
    }
    
    // Simulate file parsing
    setTimeout(() => {
        simulateDataImport(file.name);
    }, 1000);
}
function simulateDataImport(filename) {
    const preview = document.getElementById('importPreview');
    const header = document.getElementById('previewHeader');
    const body = document.getElementById('previewBody');
    
    // Sample data
    const sampleData = [
        { day: 'Monday', time: '9:00', class: '12A', subject: 'Physics', teacher: 'Dr. Sharma', room: '305' },
        { day: 'Monday', time: '10:00', class: '12B', subject: 'Chemistry', teacher: 'Mr. Kumar', room: '306' },
        { day: 'Tuesday', time: '11:00', class: '11A', subject: 'Math', teacher: 'Dr. Reddy', room: '307' }
    ];
    
    header.innerHTML = '<tr><th>Day</th><th>Time</th><th>Class</th><th>Subject</th><th>Teacher</th><th>Room</th></tr>';
    body.innerHTML = '';
    
    sampleData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.day}</td>
            <td>${row.time}</td>
            <td>${row.class}</td>
            <td>${row.subject}</td>
            <td>${row.teacher}</td>
            <td>${row.room}</td>
        `;
        body.appendChild(tr);
    });
    
    preview.style.display = 'block';
    showNotification(`File "${filename}" uploaded successfully`);
}
function confirmImport() {
    showNotification('Data imported successfully');
    addActivity('Data imported from file', 'success');
    cancelImport();
}
function cancelImport() {
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('fileInput').value = '';
}
// Setup drag and drop for upload area
const uploadArea = document.getElementById('uploadArea');
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
});
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.add('dragover');
    });
});
['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.remove('dragover');
    });
});
uploadArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        document.getElementById('fileInput').files = files;
        handleFileUpload({ target: { files: files } });
    }
});
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
function showNotification(text, isError = false) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = text;
    notification.className = 'notification active';
    if (isError) notification.classList.add('error');
    
    setTimeout(() => {
        notification.classList.remove('active');
    }, 3000);
}
function formatTime(time) {
    const hour = parseInt(time.split(':')[0]);
    return hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
}
function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric' 
    });
}
// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}