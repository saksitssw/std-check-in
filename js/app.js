// Google Sheets configuration
const scriptURL = 'https://script.google.com/macros/s/AKfycbxJiJLjJmfYTPAvNET-53SXVrZN4xgls22dTmXfK9GE6PxrZ5trQVjarmv0bYXd58Rbqw/exec'; // Replace with your Google Apps Script URL
const sheetID = 'https://docs.google.com/spreadsheets/d/1WBAOjCTDYOhyaONiNQ91ueoHm7dVLphoVL4eGOAfksw/edit?usp=sharing'; // Replace with your Google Sheet ID
const studentsSheetName = 'Students';
const checkinsSheetName = 'CheckIns';
const absentStatsSheetName = 'AbsentStats';

// Global variables
let students = [];
let checkIns = [];
let absentStats = [];
let currentCheckIn = {
    date: '',
    students: []
};

// Initialize CheckIn Page
function initCheckInPage() {
    loadStudents();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    document.getElementById('submit-btn').addEventListener('click', submitCheckIn);
    document.getElementById('reset-btn').addEventListener('click', resetCheckIn);
}

// Initialize Dashboard Page
function initDashboardPage() {
    loadCheckIns();
    loadAbsentStats();
    
    // Close modal when clicking X
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('detail-modal').style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('detail-modal')) {
            document.getElementById('detail-modal').style.display = 'none';
        }
    });
}

// Initialize Settings Page
function initSettingsPage() {
    loadStudentsForSettings();
    
    document.getElementById('csv-file').addEventListener('change', handleFileSelect);
    document.getElementById('import-btn').addEventListener('click', importStudents);
}

// Load students from Google Sheets
function loadStudents() {
    fetch(`${scriptURL}?action=getStudents&sheetId=${sheetID}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                students = data.data;
                renderStudentList();
            } else {
                showError('Failed to load students: ' + data.message);
            }
        })
        .catch(error => {
            showError('Error loading students: ' + error);
        });
}

// Load check-ins from Google Sheets
function loadCheckIns() {
    fetch(`${scriptURL}?action=getCheckIns&sheetId=${sheetID}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                checkIns = data.data;
                renderCheckInHistory();
            } else {
                showError('Failed to load check-ins: ' + data.message);
            }
        })
        .catch(error => {
            showError('Error loading check-ins: ' + error);
        });
}

// Load absent stats from Google Sheets
function loadAbsentStats() {
    fetch(`${scriptURL}?action=getAbsentStats&sheetId=${sheetID}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                absentStats = data.data;
                renderAbsentChart();
            } else {
                showError('Failed to load absent stats: ' + data.message);
            }
        })
        .catch(error => {
            showError('Error loading absent stats: ' + error);
        });
}

// Load students for settings page
function loadStudentsForSettings() {
    fetch(`${scriptURL}?action=getStudents&sheetId=${sheetID}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderStudentListForSettings(data.data);
            } else {
                showError('Failed to load students: ' + data.message);
            }
        })
        .catch(error => {
            showError('Error loading students: ' + error);
        });
}

// Render student list for check-in page
function renderStudentList() {
    const tbody = document.getElementById('student-list');
    tbody.innerHTML = '';
    
    students.forEach(student => {
        const tr = document.createElement('tr');
        tr.dataset.id = student.id;
        
        tr.innerHTML = `
            <td>${student.number}</td>
            <td>${student.name}</td>
            <td class="status-cell">
                <button class="status-btn present" data-status="present">เข้า</button>
                <button class="status-btn leave" data-status="leave">ลา</button>
                <button class="status-btn absent" data-status="absent">ไม่เข้า</button>
                <button class="status-btn unknown" data-status="unknown">ไม่ทราบ</button>
            </td>
        `;
        
        // Add event listeners to status buttons
        const buttons = tr.querySelectorAll('.status-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => updateStudentStatus(student, button.dataset.status));
        });
        
        tbody.appendChild(tr);
    });
}

// Update student status
function updateStudentStatus(student, status) {
    // Remove student from any previous status
    const existingIndex = currentCheckIn.students.findIndex(s => s.id === student.id);
    if (existingIndex !== -1) {
        currentCheckIn.students.splice(existingIndex, 1);
    }
    
    // Add student with new status
    currentCheckIn.students.push({
        id: student.id,
        number: student.number,
        name: student.name,
        status: status
    });
    
    // Update UI
    updateStatusBoxes();
}

// Update status boxes with current data
function updateStatusBoxes() {
    // Clear all boxes first
    document.querySelectorAll('.status-box .students-list').forEach(box => {
        box.innerHTML = '';
    });
    
    // Group students by status
    const grouped = {
        present: [],
        leave: [],
        absent: [],
        unknown: []
    };
    
    currentCheckIn.students.forEach(student => {
        grouped[student.status].push(student);
    });
    
    // Update each box
    for (const [status, students] of Object.entries(grouped)) {
        const box = document.getElementById(`${status}-box`);
        const countSpan = box.querySelector('.count');
        const listDiv = box.querySelector('.students-list');
        
        countSpan.textContent = students.length;
        
        students.forEach(student => {
            const div = document.createElement('div');
            div.className = 'student-item';
            div.innerHTML = `
                <span>${student.number} ${student.name}</span>
                <button class="status-btn remove" data-id="${student.id}">×</button>
            `;
            
            // Add event listener to remove button
            div.querySelector('.remove').addEventListener('click', () => {
                removeStudentFromStatus(student.id);
            });
            
            listDiv.appendChild(div);
        });
    }
}

// Remove student from status
function removeStudentFromStatus(studentId) {
    const index = currentCheckIn.students.findIndex(s => s.id === studentId);
    if (index !== -1) {
        currentCheckIn.students.splice(index, 1);
        updateStatusBoxes();
    }
}

// Submit check-in data
function submitCheckIn() {
    if (currentCheckIn.students.length === 0) {
        showWarning('กรุณาเลือกสถานะนักเรียนอย่างน้อย 1 คนก่อนส่งข้อมูล');
        return;
    }
    
    // Set current date/time
    const now = new Date();
    currentCheckIn.date = now.toISOString();
    
    // Prepare data for submission
    const data = {
        sheetId: sheetID,
        date: currentCheckIn.date,
        students: currentCheckIn.students
    };
    
    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('บันทึกข้อมูลเรียบร้อยแล้ว');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + data.message);
        }
    })
    .catch(error => {
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error);
    });
}

// Reset check-in data
function resetCheckIn() {
    Swal.fire({
        title: 'ยืนยันการรีเซ็ต?',
        text: 'คุณต้องการล้างสถานะทั้งหมดและเริ่มใหม่หรือไม่?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, รีเซ็ตเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            currentCheckIn.students = [];
            updateStatusBoxes();
            showSuccess('รีเซ็ตข้อมูลเรียบร้อยแล้ว');
        }
    });
}

// Render check-in history
function renderCheckInHistory() {
    const container = document.getElementById('checkin-history');
    container.innerHTML = '';
    
    // Sort by date (newest first)
    const sortedCheckIns = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedCheckIns.forEach(checkIn => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        // Count students by status
        const counts = {
            present: 0,
            leave: 0,
            absent: 0,
            unknown: 0
        };
        
        checkIn.students.forEach(student => {
            counts[student.status]++;
        });
        
        const date = new Date(checkIn.date);
        const dateStr = date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        item.innerHTML = `
            <div class="history-date">${dateStr}</div>
            <div class="history-stats">
                <div class="stat-item">
                    <span class="stat-badge" style="background-color: var(--success-color);"></span>
                    เข้าแถว: ${counts.present}
                </div>
                <div class="stat-item">
                    <span class="stat-badge" style="background-color: var(--info-color);"></span>
                    ลา: ${counts.leave}
                </div>
                <div class="stat-item">
                    <span class="stat-badge" style="background-color: var(--warning-color);"></span>
                    ไม่เข้า: ${counts.absent}
                </div>
                <div class="stat-item">
                    <span class="stat-badge" style="background-color: var(--danger-color);"></span>
                    ไม่ทราบ: ${counts.unknown}
                </div>
            </div>
            <div class="history-actions">
                <button class="btn info view-detail" data-id="${checkIn.id}">ดูรายละเอียด</button>
                <button class="btn danger delete-checkin" data-id="${checkIn.id}">ลบข้อมูล</button>
            </div>
        `;
        
        // Add event listeners
        item.querySelector('.view-detail').addEventListener('click', () => {
            showCheckInDetails(checkIn);
        });
        
        item.querySelector('.delete-checkin').addEventListener('click', () => {
            deleteCheckIn(checkIn.id);
        });
        
        container.appendChild(item);
    });
}

// Show check-in details in modal
function showCheckInDetails(checkIn) {
    const modal = document.getElementById('detail-modal');
    const title = document.getElementById('modal-title');
    const date = document.getElementById('modal-date');
    const tbody = document.getElementById('detail-list');
    
    title.textContent = `รายละเอียดการเช็กชื่อ`;
    
    const dateObj = new Date(checkIn.date);
    date.textContent = dateObj.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    tbody.innerHTML = '';
    
    // Sort students by number
    const sortedStudents = [...checkIn.students].sort((a, b) => a.number - b.number);
    
    sortedStudents.forEach(student => {
        const tr = document.createElement('tr');
        
        let statusText = '';
        let statusClass = '';
        
        switch(student.status) {
            case 'present':
                statusText = 'เข้าแถว';
                statusClass = 'success';
                break;
            case 'leave':
                statusText = 'ลา';
                statusClass = 'info';
                break;
            case 'absent':
                statusText = 'ไม่เข้าแถว';
                statusClass = 'warning';
                break;
            case 'unknown':
                statusText = 'ไม่ทราบ';
                statusClass = 'danger';
                break;
        }
        
        tr.innerHTML = `
            <td>${student.number}</td>
            <td>${student.name}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        `;
        
        tbody.appendChild(tr);
    });
    
    modal.style.display = 'block';
}

// Delete a check-in record
function deleteCheckIn(checkInId) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: 'คุณต้องการลบข้อมูลการเช็กชื่อนี้หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${scriptURL}?action=deleteCheckIn&sheetId=${sheetID}&checkInId=${checkInId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showSuccess('ลบข้อมูลเรียบร้อยแล้ว');
                    loadCheckIns(); // Refresh the list
                    loadAbsentStats(); // Refresh the chart
                } else {
                    showError('เกิดข้อผิดพลาดในการลบข้อมูล: ' + data.message);
                }
            })
            .catch(error => {
                showError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error);
            });
        }
    });
}

// Render absent chart
function renderAbsentChart() {
    const ctx = document.getElementById('absent-chart').getContext('2d');
    
    // Sort by absent count (descending)
    const sortedStats = [...absentStats].sort((a, b) => b.count - a.count).slice(0, 10);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedStats.map(item => item.name),
            datasets: [{
                label: 'จำนวนครั้งที่ไม่แจ้งข้อมูล',
                data: sortedStats.map(item => item.count),
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Handle file selection for import
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: ['number', 'name'] });
        
        // Store the data temporarily
        sessionStorage.setItem('importData', JSON.stringify(jsonData));
        
        // Enable import button
        document.getElementById('import-btn').disabled = false;
        
        showInfo(`พบรายชื่อนักเรียน ${jsonData.length} คนในไฟล์ พร้อมนำเข้าข้อมูลหรือไม่?`);
    };
    reader.readAsBinaryString(file);
}

// Import students from file
function importStudents() {
    const importData = JSON.parse(sessionStorage.getItem('importData'));
    if (!importData || importData.length === 0) {
        showError('ไม่พบข้อมูลนักเรียนที่จะนำเข้า');
        return;
    }
    
    // Prepare data for submission
    const data = {
        sheetId: sheetID,
        students: importData
    };
    
    fetch(`${scriptURL}?action=importStudents`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess(`นำเข้าข้อมูลนักเรียน ${importData.length} คนเรียบร้อยแล้ว`);
            sessionStorage.removeItem('importData');
            document.getElementById('import-btn').disabled = true;
            document.getElementById('csv-file').value = '';
            loadStudentsForSettings(); // Refresh the list
        } else {
            showError('เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ' + data.message);
        }
    })
    .catch(error => {
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error);
    });
}

// Render student list for settings page
function renderStudentListForSettings(students) {
    const tbody = document.getElementById('settings-student-list');
    tbody.innerHTML = '';
    
    students.forEach(student => {
        const tr = document.createElement('tr');
        tr.dataset.id = student.id;
        
        tr.innerHTML = `
            <td>${student.number}</td>
            <td>${student.name}</td>
            <td>
                <button class="btn danger delete-student" data-id="${student.id}">ลบ</button>
            </td>
        `;
        
        // Add event listener to delete button
        tr.querySelector('.delete-student').addEventListener('click', () => {
            deleteStudent(student.id, student.name);
        });
        
        tbody.appendChild(tr);
    });
}

// Delete a student
function deleteStudent(studentId, studentName) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        html: `คุณต้องการลบนักเรียน <b>${studentName}</b> หรือไม่?<br>การกระทำนี้จะลบข้อมูลการเช็กชื่อที่เกี่ยวข้องด้วย!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${scriptURL}?action=deleteStudent&sheetId=${sheetID}&studentId=${studentId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showSuccess('ลบนักเรียนเรียบร้อยแล้ว');
                    loadStudentsForSettings(); // Refresh the list
                    loadAbsentStats(); // Refresh the chart
                } else {
                    showError('เกิดข้อผิดพลาดในการลบนักเรียน: ' + data.message);
                }
            })
            .catch(error => {
                showError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error);
            });
        }
    });
}

// Update current time display
function updateCurrentTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    document.getElementById('current-time').textContent = now.toLocaleDateString('th-TH', options);
}

// Helper function to show success message
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: message,
        timer: 2000,
        showConfirmButton: false
    });
}

// Helper function to show error message
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'ผิดพลาด',
        text: message
    });
}

// Helper function to show warning message
function showWarning(message) {
    Swal.fire({
        icon: 'warning',
        title: 'คำเตือน',
        text: message
    });
}

// Helper function to show info message
function showInfo(message) {
    Swal.fire({
        icon: 'info',
        title: 'ข้อมูล',
        text: message
    });
}
