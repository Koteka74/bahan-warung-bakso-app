// Sistem login sederhana (untuk production, gunakan sistem auth yang lebih aman)
const users = [
    { username: 'admin', password: 'admin123', name: 'Administrator' }
];

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        window.location.href = 'dashboard.html';
    } else {
        alert('Username atau password salah!');
    }
});

// Cek login di halaman lain
if (window.location.pathname.includes('dashboard.html')) {
    if (!localStorage.getItem('currentUser')) {
        window.location.href = 'index.html';
    }
}