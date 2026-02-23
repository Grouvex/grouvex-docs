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
async function loadVersions() {
    try {
        const response = await fetch('versions.json?' + Date.now());
        versions = await response.json();
        renderVersionHistory();
    } catch (error) {
        console.error('Error loading versions:', error);
        versions = { versions: [] };
        renderVersionHistory();
    }
}

// Guardar versión
async function saveVersion(data, changes) {
    const version = {
        id: Date.now().toString(),
        date: Math.floor(Date.now() / 1000),
        author: currentUser?.email || 'unknown',
        changes: changes || 'Actualización de documentos',
        data: data
    };
    
    versions.versions = versions.versions || [];
    versions.versions.unshift(version);
    // Mantener solo últimas 50 versiones
    versions.versions = versions.versions.slice(0, 50);
    
    // Guardar en archivo versions.json
    await saveVersionsFile();
    renderVersionHistory();
}

// Guardar archivo de versiones
async function saveVersionsFile() {
    const versionsBlob = new Blob([JSON.stringify(versions, null, 2)], { type: 'application/json' });
    const versionsUrl = URL.createObjectURL(versionsBlob);
    const versionsLink = document.createElement('a');
    versionsLink.href = versionsUrl;
    versionsLink.download = 'versions.json';
    versionsLink.click();
    URL.revokeObjectURL(versionsUrl);
    
    showEditorMessage('success', 'Archivo versions.json generado. Súbelo al servidor.');
}

// Renderizar historial
function renderVersionHistory() {
    const container = document.getElementById('versionHistory');
    const versionsList = versions.versions || [];
    
    if (!versionsList.length) {
        container.innerHTML = '<p class="loading-small">No hay versiones guardadas</p>';
        return;
    }
    
    container.innerHTML = versionsList.map(version => `
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
                Ver/Restaurar
            </button>
        </div>
    `).join('');
}

// Restaurar versión
function restoreVersion(versionId) {
    const version = versions.versions.find(v => v.id === versionId);
    if (!version) return;
    
    document.getElementById('jsonEditor').value = JSON.stringify(version.data, null, 2);
    showEditorMessage('success', 'Versión cargada en el editor. Haz clic en Guardar Cambios para aplicarla.');
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
        
        // Guardar versión en el historial
        await saveVersion(parsed, changes);
        
        // Crear archivo data.json para descarga
        const dataBlob = new Blob([jsonText], { type: 'application/json' });
        const dataUrl = URL.createObjectURL(dataBlob);
        const dataLink = document.createElement('a');
        dataLink.href = dataUrl;
        dataLink.download = 'data.json';
        dataLink.click();
        URL.revokeObjectURL(dataUrl);
        
        currentData = parsed;
        showEditorMessage('success', '✅ data.json y versions.json generados. Súbelos al servidor.');
        
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

// Exportar datos completos (data + versions)
function exportAllData() {
    if (!currentData) return;
    
    const exportData = {
        exportedAt: Math.floor(Date.now() / 1000),
        exportedBy: currentUser?.email,
        data: currentData,
        versions: versions
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ddoo_full_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Importar datos completos
function importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                
                if (imported.data && imported.versions) {
                    // Restaurar ambos archivos
                    document.getElementById('jsonEditor').value = JSON.stringify(imported.data, null, 2);
                    
                    // Guardar versions
                    versions = imported.versions;
                    await saveVersionsFile();
                    
                    showEditorMessage('success', 'Backup importado. Revisa y guarda los cambios.');
                } else {
                    showEditorMessage('error', 'Archivo de backup inválido');
                }
            } catch (error) {
                showEditorMessage('error', 'Error al importar: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Ver historial completo
function viewFullHistory() {
    if (!versions.versions || !versions.versions.length) {
        alert('No hay historial disponible');
        return;
    }
    
    let historyText = 'HISTORIAL COMPLETO DE VERSIONES\n\n';
    versions.versions.forEach((v, index) => {
        historyText += `${index + 1}. ${formatDate(v.date)} - ${v.author}\n`;
        historyText += `   Cambios: ${v.changes}\n`;
        historyText += `   ID: ${v.id}\n\n`;
    });
    
    const blob = new Blob([historyText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_${Date.now()}.txt`;
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
    
    // No auto-ocultar mensajes de éxito importantes
    if (type !== 'success' || !message.includes('✅')) {
        setTimeout(() => {
            messageEl.textContent = '';
            messageEl.className = 'editor-message';
        }, 5000);
    }
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
