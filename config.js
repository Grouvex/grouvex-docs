// Variables globales
let currentUser = null;
let currentData = null;
let versions = [];
let currentEditingDoc = null;

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
        renderDocumentsList();
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

// Renderizar lista de documentos
function renderDocumentsList() {
    const container = document.getElementById('documentsList');
    const organismFilter = document.getElementById('organismFilter')?.value || 'all';
    
    if (!currentData || !currentData.documents) {
        container.innerHTML = '<p class="loading-small">No hay documentos</p>';
        return;
    }
    
    let filteredDocs = currentData.documents;
    if (organismFilter !== 'all') {
        filteredDocs = filteredDocs.filter(doc => doc.organism === organismFilter);
    }
    
    // Agrupar por organismo
    const grouped = {};
    filteredDocs.forEach(doc => {
        if (!grouped[doc.organism]) grouped[doc.organism] = [];
        grouped[doc.organism].push(doc);
    });
    
    let html = '';
    
    // Orden de organismos
    const organismOrder = ['grouvex', 'records', 'designs', 'games'];
    
    organismOrder.forEach(org => {
        if (grouped[org]) {
            html += `<div class="organism-group">`;
            html += `<h4 class="organism-title ${org}">${getOrganismLabel(org)}</h4>`;
            html += `<div class="organism-documents">`;
            
            grouped[org].forEach(doc => {
                html += `
                    <div class="doc-management-card">
                        <div class="doc-info">
                            <span class="doc-type-badge ${doc.type}">${getTypeLabel(doc.type)}</span>
                            <h5>${escapeHtml(doc.title)}</h5>
                            <p class="doc-ref">${escapeHtml(doc.reference || 'Sin referencia')}</p>
                        </div>
                        <div class="doc-actions">
                            <button class="icon-btn" onclick="editDocument('${doc.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="icon-btn" onclick="viewDocumentVersions('${doc.id}')" title="Versiones">
                                <i class="fas fa-history"></i>
                            </button>
                            <button class="icon-btn delete" onclick="deleteDocument('${doc.id}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
    });
    
    container.innerHTML = html;
}

// Filtrar documentos por organismo
function filterDocumentsByOrganism() {
    renderDocumentsList();
}

// Mostrar formulario de nuevo documento
function showNewDocumentForm() {
    currentEditingDoc = null;
    
    const formHtml = `
        <form id="documentForm" class="document-form" onsubmit="saveDocument(event)">
            <div class="form-grid">
                <div class="form-group">
                    <label>Organismo *</label>
                    <select id="docOrganism" required>
                        <option value="">Seleccionar...</option>
                        <option value="grouvex">Grouvex Studios</option>
                        <option value="records">Grouvex Records</option>
                        <option value="designs">Grouvex Designs</option>
                        <option value="games">Grouvex Games</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Tipo *</label>
                    <select id="docType" required>
                        <option value="">Seleccionar...</option>
                        <option value="bo">B.O. (Boletín Oficial)</option>
                        <option value="miembros">Miembros</option>
                        <option value="no">N.O. (Noticias)</option>
                        <option value="tos">ToS&PP</option>
                    </select>
                </div>
                
                <div class="form-group full-width">
                    <label>Título *</label>
                    <input type="text" id="docTitle" required placeholder="Título del documento">
                </div>
                
                <div class="form-group">
                    <label>Referencia</label>
                    <input type="text" id="docReference" placeholder="Ej: BOGS/2025/001">
                </div>
                
                <div class="form-group">
                    <label>Fecha (Unix timestamp)</label>
                    <input type="number" id="docDate" value="${Math.floor(Date.now() / 1000)}">
                </div>
                
                <div class="form-group full-width">
                    <label>Descripción</label>
                    <textarea id="docDescription" rows="2" placeholder="Breve descripción"></textarea>
                </div>
                
                <div class="form-group full-width">
                    <label>Contenido *</label>
                    <textarea id="docContent" rows="10" required placeholder="Contenido del documento..."></textarea>
                </div>
                
                <div class="form-group">
                    <label>Tags (separados por coma)</label>
                    <input type="text" id="docTags" placeholder="tag1, tag2, tag3">
                </div>
                
                <div class="form-group">
                    <label>Versión</label>
                    <input type="number" id="docVersion" value="1" min="1">
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeDocumentModal()">
                    Cancelar
                </button>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Guardar Documento
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('modalTitle').textContent = 'Nuevo Documento';
    document.getElementById('documentModalBody').innerHTML = formHtml;
    document.getElementById('documentModal').classList.add('active');
}

// Editar documento existente
function editDocument(docId) {
    const doc = currentData.documents.find(d => d.id === docId);
    if (!doc) return;
    
    currentEditingDoc = doc;
    
    const tagsValue = doc.tags ? doc.tags.join(', ') : '';
    
    const formHtml = `
        <form id="documentForm" class="document-form" onsubmit="saveDocument(event)">
            <div class="form-grid">
                <div class="form-group">
                    <label>Organismo *</label>
                    <select id="docOrganism" required>
                        <option value="grouvex" ${doc.organism === 'grouvex' ? 'selected' : ''}>Grouvex Studios</option>
                        <option value="records" ${doc.organism === 'records' ? 'selected' : ''}>Grouvex Records</option>
                        <option value="designs" ${doc.organism === 'designs' ? 'selected' : ''}>Grouvex Designs</option>
                        <option value="games" ${doc.organism === 'games' ? 'selected' : ''}>Grouvex Games</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Tipo *</label>
                    <select id="docType" required>
                        <option value="bo" ${doc.type === 'bo' ? 'selected' : ''}>B.O. (Boletín Oficial)</option>
                        <option value="miembros" ${doc.type === 'miembros' ? 'selected' : ''}>Miembros</option>
                        <option value="no" ${doc.type === 'no' ? 'selected' : ''}>N.O. (Noticias)</option>
                        <option value="tos" ${doc.type === 'tos' ? 'selected' : ''}>ToS&PP</option>
                    </select>
                </div>
                
                <div class="form-group full-width">
                    <label>Título *</label>
                    <input type="text" id="docTitle" required value="${escapeHtml(doc.title || '')}">
                </div>
                
                <div class="form-group">
                    <label>Referencia</label>
                    <input type="text" id="docReference" value="${escapeHtml(doc.reference || '')}">
                </div>
                
                <div class="form-group">
                    <label>Fecha (Unix timestamp)</label>
                    <input type="number" id="docDate" value="${doc.date || Math.floor(Date.now() / 1000)}">
                </div>
                
                <div class="form-group full-width">
                    <label>Descripción</label>
                    <textarea id="docDescription" rows="2">${escapeHtml(doc.description || '')}</textarea>
                </div>
                
                <div class="form-group full-width">
                    <label>Contenido *</label>
                    <textarea id="docContent" rows="10" required>${escapeHtml(doc.content || '')}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Tags (separados por coma)</label>
                    <input type="text" id="docTags" value="${escapeHtml(tagsValue)}">
                </div>
                
                <div class="form-group">
                    <label>Versión</label>
                    <input type="number" id="docVersion" value="${doc.version || 1}" min="1">
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeDocumentModal()">
                    Cancelar
                </button>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Guardar Cambios
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('modalTitle').textContent = 'Editar Documento';
    document.getElementById('documentModalBody').innerHTML = formHtml;
    document.getElementById('documentModal').classList.add('active');
}

// Guardar documento (nuevo o editado)
async function saveDocument(event) {
    event.preventDefault();
    
    try {
        const changes = prompt('Describe los cambios realizados:', 
            currentEditingDoc ? 'Actualización de documento' : 'Nuevo documento');
        
        if (!changes) {
            showEditorMessage('error', 'Debes describir los cambios');
            return;
        }
        
        const docData = {
            id: currentEditingDoc?.id || generateId(),
            organism: document.getElementById('docOrganism').value,
            type: document.getElementById('docType').value,
            title: document.getElementById('docTitle').value,
            reference: document.getElementById('docReference').value,
            date: parseInt(document.getElementById('docDate').value),
            description: document.getElementById('docDescription').value,
            content: document.getElementById('docContent').value,
            tags: document.getElementById('docTags').value.split(',').map(t => t.trim()).filter(t => t),
            version: parseInt(document.getElementById('docVersion').value) || 1
        };
        
        if (!currentEditingDoc) {
            // Nuevo documento
            currentData.documents.push(docData);
        } else {
            // Actualizar documento existente
            const index = currentData.documents.findIndex(d => d.id === currentEditingDoc.id);
            if (index !== -1) {
                currentData.documents[index] = docData;
            }
        }
        
        // Guardar versión en historial
        await saveVersion(currentData, changes);
        
        // Actualizar JSON editor
        document.getElementById('jsonEditor').value = JSON.stringify(currentData, null, 2);
        
        // Crear archivo data.json para descarga
        const dataBlob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
        const dataUrl = URL.createObjectURL(dataBlob);
        const dataLink = document.createElement('a');
        dataLink.href = dataUrl;
        dataLink.download = 'data.json';
        dataLink.click();
        URL.revokeObjectURL(dataUrl);
        
        closeDocumentModal();
        renderDocumentsList();
        
        showEditorMessage('success', '✅ Documento guardado correctamente');
        
    } catch (error) {
        console.error('Error saving document:', error);
        showEditorMessage('error', 'Error al guardar el documento');
    }
}

// Eliminar documento
async function deleteDocument(docId) {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;
    
    try {
        const changes = prompt('Describe el motivo de la eliminación:', 'Documento eliminado');
        if (!changes) return;
        
        // Filtrar el documento
        currentData.documents = currentData.documents.filter(d => d.id !== docId);
        
        // Guardar versión en historial
        await saveVersion(currentData, changes);
        
        // Actualizar JSON editor
        document.getElementById('jsonEditor').value = JSON.stringify(currentData, null, 2);
        
        // Crear archivo data.json para descarga
        const dataBlob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
        const dataUrl = URL.createObjectURL(dataBlob);
        const dataLink = document.createElement('a');
        dataLink.href = dataUrl;
        dataLink.download = 'data.json';
        dataLink.click();
        URL.revokeObjectURL(dataUrl);
        
        renderDocumentsList();
        
        showEditorMessage('success', '✅ Documento eliminado correctamente');
        
    } catch (error) {
        console.error('Error deleting document:', error);
        showEditorMessage('error', 'Error al eliminar el documento');
    }
}

// Ver versiones de un documento específico
function viewDocumentVersions(docId) {
    const doc = currentData.documents.find(d => d.id === docId);
    if (!doc) return;
    
    const docVersions = [];
    if (versions.versions) {
        versions.versions.forEach(v => {
            if (v.data && v.data.documents) {
                const versionDoc = v.data.documents.find(d => d.id === docId);
                if (versionDoc) {
                    docVersions.push({
                        ...v,
                        docVersion: versionDoc
                    });
                }
            }
        });
    }
    
    let html = `
        <div class="document-viewer">
            <div class="doc-metadata">
                <p><strong>Documento:</strong> ${escapeHtml(doc.title)}</p>
                <p><strong>Versión actual:</strong> v${doc.version}</p>
            </div>
            <div class="versions-list">
    `;
    
    if (docVersions.length === 0) {
        html += '<p class="loading-small">No hay versiones anteriores</p>';
    } else {
        docVersions.forEach(v => {
            html += `
                <div class="version-item">
                    <div class="version-header">
                        <span class="version-badge">v${v.docVersion.version}</span>
                        <span class="version-date">${formatDate(v.date)}</span>
                        <span class="version-author">${escapeHtml(v.author)}</span>
                    </div>
                    <div class="version-changes">${escapeHtml(v.changes)}</div>
                </div>
            `;
        });
    }
    
    html += '</div></div>';
    
    document.getElementById('modalTitle').textContent = 'Versiones del Documento';
    document.getElementById('documentModalBody').innerHTML = html;
    document.getElementById('documentModal').classList.add('active');
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
    versions.versions = versions.versions.slice(0, 50);
    
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
            <button class="version-restore-btn" onclick="previewVersion('${version.id}')">
                <i class="fas fa-eye"></i>
                Previsualizar
            </button>
        </div>
    `).join('');
}

// Previsualizar versión
function previewVersion(versionId) {
    const version = versions.versions.find(v => v.id === versionId);
    if (!version) return;
    
    const previewHtml = `
        <div class="version-preview">
            <h3>Vista previa de versión</h3>
            <p><strong>Fecha:</strong> ${formatDate(version.date)}</p>
            <p><strong>Autor:</strong> ${escapeHtml(version.author)}</p>
            <p><strong>Cambios:</strong> ${escapeHtml(version.changes)}</p>
            <hr>
            <pre>${escapeHtml(JSON.stringify(version.data, null, 2))}</pre>
            <div class="preview-actions">
                <button class="btn-primary" onclick="restoreVersion('${versionId}')">
                    <i class="fas fa-history"></i> Restaurar esta versión
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('modalTitle').textContent = 'Previsualizar Versión';
    document.getElementById('documentModalBody').innerHTML = previewHtml;
    document.getElementById('documentModal').classList.add('active');
}

// Restaurar versión
function restoreVersion(versionId) {
    if (!confirm('¿Restaurar esta versión? Se perderán los cambios no guardados.')) return;
    
    const version = versions.versions.find(v => v.id === versionId);
    if (!version) return;
    
    currentData = version.data;
    document.getElementById('jsonEditor').value = JSON.stringify(currentData, null, 2);
    renderDocumentsList();
    
    closeDocumentModal();
    showEditorMessage('success', 'Versión restaurada. Haz clic en Guardar Cambios para aplicarla definitivamente.');
}

// Cambiar de pestaña
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tabName === 'editor') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('visualEditorTab').classList.add('active');
        renderDocumentsList();
    } else if (tabName === 'json') {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('jsonEditorTab').classList.add('active');
    } else if (tabName === 'history') {
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        document.getElementById('historyTab').classList.add('active');
        renderVersionHistory();
    }
}

// Funciones del editor JSON (mantenidas del original)
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

async function saveJSON() {
    try {
        const jsonText = document.getElementById('jsonEditor').value;
        const changes = prompt('Describe los cambios realizados:', 'Actualización mediante editor JSON');
        
        if (!changes) {
            showEditorMessage('error', 'Debes describir los cambios');
            return;
        }
        
        const parsed = JSON.parse(jsonText);
        
        if (!parsed.documents || !Array.isArray(parsed.documents)) {
            showEditorMessage('error', 'El JSON debe contener un array "documents"');
            return;
        }
        
        currentData = parsed;
        await saveVersion(parsed, changes);
        
        const dataBlob = new Blob([jsonText], { type: 'application/json' });
        const dataUrl = URL.createObjectURL(dataBlob);
        const dataLink = document.createElement('a');
        dataLink.href = dataUrl;
        dataLink.download = 'data.json';
        dataLink.click();
        URL.revokeObjectURL(dataUrl);
        
        renderDocumentsList();
        showEditorMessage('success', '✅ data.json y versions.json generados. Súbelos al servidor.');
        
    } catch (error) {
        showEditorMessage('error', 'JSON inválido: ' + error.message);
    }
}

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
                    document.getElementById('jsonEditor').value = JSON.stringify(imported.data, null, 2);
                    versions = imported.versions;
                    await saveVersionsFile();
                    currentData = imported.data;
                    renderDocumentsList();
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

// Utilidades
function generateId() {
    return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getOrganismLabel(organism) {
    const labels = {
        'grouvex': 'Grouvex Studios',
        'records': 'Grouvex Records',
        'designs': 'Grouvex Designs',
        'games': 'Grouvex Games'
    };
    return labels[organism] || organism;
}

function getTypeLabel(type) {
    const labels = {
        'bo': 'B.O.',
        'miembros': 'Miembros',
        'no': 'N.O.',
        'tos': 'ToS&PP'
    };
    return labels[type] || type;
}

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

function closeDocumentModal() {
    document.getElementById('documentModal').classList.remove('active');
}

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
