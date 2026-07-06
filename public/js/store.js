// Global State Management using LocalStorage
const Store = {
    // Default initial subjects if nothing exists
    defaultSubjects: [],
    
    init() {
        if (!localStorage.getItem('sathi_subjects')) {
            localStorage.setItem('sathi_subjects', JSON.stringify(this.defaultSubjects));
        }
        if (!localStorage.getItem('sathi_goals')) {
            localStorage.setItem('sathi_goals', JSON.stringify({ daily: 0, weekly: 0 }));
        }
    },

    getSubjects() {
        this.init();
        return JSON.parse(localStorage.getItem('sathi_subjects'));
    },

    saveSubjects(subjects) {
        localStorage.setItem('sathi_subjects', JSON.stringify(subjects));
        // Sync progress with backend for MCP usage
        fetch('/api/sync-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectsData: subjects })
        }).catch(err => console.error('Failed to sync progress:', err));
    },

    addSubject(name, color = 'var(--soft-blue)', chapters = 10) {
        const subjects = this.getSubjects();
        const newSubject = {
            id: 'sub_' + Date.now(),
            name,
            color,
            progress: 0,
            chapters: chapters,
            completed: 0
        };
        subjects.push(newSubject);
        this.saveSubjects(subjects);
        return newSubject;
    },

    removeSubject(id) {
        const subjects = this.getSubjects();
        const filtered = subjects.filter(s => s.id !== id);
        this.saveSubjects(filtered);
    },

    updateSubjectProgress(id, completedChapters) {
        const subjects = this.getSubjects();
        const subject = subjects.find(s => s.id === id);
        if (subject) {
            subject.completed = Math.min(completedChapters, subject.chapters);
            subject.progress = Math.round((subject.completed / subject.chapters) * 100);
            this.saveSubjects(subjects);
        }
    },

    getGoals() {
        this.init();
        return JSON.parse(localStorage.getItem('sathi_goals'));
    },
    
    updateGoals(daily, weekly) {
        const goals = this.getGoals();
        if (daily !== undefined) goals.daily = daily;
        if (weekly !== undefined) goals.weekly = weekly;
        localStorage.setItem('sathi_goals', JSON.stringify(goals));
    }
};

window.SathiStore = Store;
Store.init();
