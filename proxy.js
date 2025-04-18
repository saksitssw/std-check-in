// ใช้ฟังก์ชันนี้แทนการเรียก GAS โดยตรง
async function callGoogleScript(action, data) {
  const response = await fetch('/.netlify/functions/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data })
  });
  return response.json();
}

// เรียกใช้
callGoogleScript('importStudents', { students: [...] })
  .then(console.log)
  .catch(console.error);
