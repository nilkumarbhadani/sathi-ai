const Auth = {
    // Check if user is logged in
    isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true';
    },

    // Redirect to auth page if not logged in
    requireAuth() {
        if (!this.isLoggedIn()) {
            const isScreensDir = window.location.pathname.includes('/screens/');
            const authPath = isScreensDir ? 'auth.html' : 'screens/auth.html';
            
            // Avoid redirect loop if already on auth.html
            if (!window.location.pathname.endsWith('auth.html')) {
                window.location.href = authPath;
            }
        }
    },

    // Mock Login
    login(email, password) {
        // Basic mock validation happens in the UI
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        this.redirectToHome();
    },

    // Mock Signup
    signup(name, email, password) {
        // Basic mock validation happens in the UI
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', email);
        this.redirectToHome();
    },

    // Logout function
    logout() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        
        const isScreensDir = window.location.pathname.includes('/screens/');
        const authPath = isScreensDir ? 'auth.html' : 'screens/auth.html';
        window.location.href = authPath;
    },

    // Redirect to dashboard (index.html)
    redirectToHome() {
        const isScreensDir = window.location.pathname.includes('/screens/');
        const homePath = isScreensDir ? '../index.html' : 'index.html';
        window.location.href = homePath;
    }
};

window.SathiAuth = Auth;
