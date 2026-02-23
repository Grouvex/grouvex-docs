// Variables globales
let currentUser = null;
let currentData = null;
let versions = [];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    setupAuthListener();
    loadVersions();
});

// Configurar listener de autenticación
function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user && isAuthorized(user.email)) {
            currentUser = user;
            showAdminPanel();
            await loadCurrentData();
        } else {
            if (user) {
                await auth.signOut();
                showAuthMessage('error', 'No tienes permisos para acceder');
            }
            showAuthSection();
        }
    });
}

// Cargar datos actuales
async function loadCurrentData() {
    try {
        const response = await fetch('data.json?' + Date.now());
        currentData = await response.json();
        document.getElementById('jsonEditor').value = JSON.stringify(currentData, null, 2);
    } catch (error) {
        console.error('Error loading data:', error);
        showEditorMessage('error', 'Error al cargar los datos');
    }
}

// Cargar historial de versiones
function loadVersions() {
    const stored = localStorage.getItem('ddoo_versions');
    if (stored) {
        versions = JSON.parse(stored);
        renderVersionHistory();
    }
}

// Guardar versión
function saveVersion(data, changes) {
    const version = {
        id: Date.now().toString(),
        date: Math.floor(Date.now() / 1000),
        author: currentUser?.email || 'unknown',
        changes: changes || 'Actualización de documentos',
        data: data
    };
    
    versions.unshift(version);
    // Mantener solo últimas 20 versiones
    versions = versions.slice(0, 20);
    
    localStorage.setItem('ddoo_versions', JSON.stringify(versions));
    renderVersionHistory();
}

// Renderizar historial
function renderVersionHistory() {
    const container = document.getElementById('versionHistory');
    
    if (!versions.length) {
        container.innerHTML = '<p class="loading-small">No hay versiones guardadas</p>';
        return;
    }
    
    container.innerHTML = versions.map(version => `
        <div class="version-item">
            <div class="version-info">
                <div class="version-date">
                    <i class="fas fa-clock"></i>
                    ${formatDate(version.date)}
                </div>
                <div class="version-user">
                    <i class="fas fa-user"></i>
                    ${escapeHtml(version.author)}
                </div>
                <div class="version-changes">
                    <i class="fas fa-edit"></i>
                    ${escapeHtml(version.changes)}
                </div>
            </div>
            <button class="version-restore-btn" onclick="restoreVersion('${version.id}')">
                <i class="fas fa-history"></i>
                Restaurar
            </button>
        </div>
    `).join('');
}

// Restaurar versión
function restoreVersion(versionId) {
    if (!confirm('¿Restaurar esta versión? Se perderán los cambios no guardados.')) return;
    
    const version = versions.find(v => v.id === versionId);
    if (!version) return;
    
    document.getElementById('jsonEditor').value = JSON.stringify(version.data, null, 2);
    showEditorMessage('success', 'Versión cargada. Haz clic en Guardar para aplicarla.');
}

// Guardar JSON
async function saveJSON() {
    try {
        const jsonText = document.getElementById('jsonEditor').value;
        const changes = prompt('Describe los cambios realizados:', 'Actualización de documentos');
        
        if (!changes) {
            showEditorMessage('error', 'Debes describir los cambios');
            return;
        }
        
        // Validar JSON
        const parsed = JSON.parse(jsonText);
        
        // Validar estructura
        if (!parsed.documents || !Array.isArray(parsed.documents)) {
            showEditorMessage('error', 'El JSON debe contener un array "documents"');
            return;
        }
        
        // Guardar versión
        saveVersion(parsed, changes);
        
        // Crear archivo para descarga
        const blob = new Blob([jsonText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        currentData = parsed;
        showEditorMessage('success', 'JSON guardado correctamente');
        
    } catch (error) {
        console.error('Error saving JSON:', error);
        showEditorMessage('error', 'JSON inválido: ' + error.message);
    }
}

// Formatear JSON
function formatJSON() {
    try {
        const editor = document.getElementById('jsonEditor');
        const parsed = JSON.parse(editor.value);
        editor.value = JSON.stringify(parsed, null, 2);
        showEditorMessage('success', 'JSON formateado');
    } catch (error) {
        showEditorMessage('error', 'Error al formatear: JSON inválido');
    }
}

// Exportar datos
function exportData() {
    if (!currentData) return;
    
    const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ddoo_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Mostrar panel de admin
function showAdminPanel() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    
    document.getElementById('userName').textContent = currentUser.displayName || 'Administrador';
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').src = currentUser.photoURL || 'https://via.placeholder.com/56x56?text=Admin';
}

function showAuthSection() {
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
}

// Autenticación
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .catch(error => {
            console.error('Error signing in:', error);
            showAuthMessage('error', 'Error al iniciar sesión');
        });
}

function signOut() {
    auth.signOut()
        .then(() => {
            window.location.reload();
        })
        .catch(error => {
            console.error('Error signing out:', error);
        });
}

// Utilidades
function showAuthMessage(type, message) {
    const messageEl = document.getElementById('authMessage');
    messageEl.textContent = message;
    messageEl.className = `auth-message ${type}`;
    
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = 'auth-message';
    }, 5000);
}

function showEditorMessage(type, message) {
    const messageEl = document.getElementById('editorMessage');
    messageEl.textContent = message;
    messageEl.className = `editor-message ${type}`;
    
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = 'editor-message';
    }, 3000);
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
