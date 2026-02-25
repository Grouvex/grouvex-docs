// ============================================
// CONFIGURACIÓN DE GITHUB - Usando DDOO_TOKEN
// ============================================
const GITHUB = {
    owner: 'Grouvex',                    // ← TU USUARIO
    repo: 'grouvex.github.io',            // ← TU REPOSITORIO
    branch: 'main',                       // Rama principal
    token: null
};

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

// ============================================
// FUNCIÓN PARA OBTENER EL TOKEN DEL SECRET
// ============================================
async function getGitHubToken() {
    // Si ya tenemos token, lo devolvemos
    if (GITHUB.token) return GITHUB.token;
    
    try {
        // Intentar obtener el token mediante fetch a un endpoint que lea el secret
        // En GitHub Pages, necesitamos usar un proxy o API
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(
            `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/main/config/token.json?${Date.now()}`
        )}`);
        
        if (response.ok) {
            const data = await response.json();
            GITHUB.token = data.token;
            return GITHUB.token;
        }
    } catch (e) {
        console.log('No se pudo obtener token vía proxy');
    }
    
    // Si no funciona, mostrar instrucciones
    throw new Error(`
        ⚠️ CONFIGURACIÓN DEL TOKEN ⚠️
        
        Para que funcione el guardado automático:
        
        1. Crea una carpeta "config" en tu repositorio
        2. Dentro, crea un archivo "token.json" con:
           {
             "token": "github_pat_TU_TOKEN_AQUI"
           }
        
        O usa la opción manual por ahora.
    `);
}

// ============================================
// GUARDADO AUTOMÁTICO DIRECTO A GITHUB
// ============================================

// Función principal para guardar en GitHub
async function saveToGitHub(filePath, content, commitMessage) {
    try {
        showEditorMessage('info', `📤 Subiendo ${filePath} a GitHub...`);
        
        // Intentar obtener token (si falla, continuamos con modo manual)
        let token = null;
        try {
            token = await getGitHubToken();
        } catch (e) {
            console.log('Modo manual activado');
            return false;
        }
        
        // 1. Obtener el archivo actual para conocer su SHA
        const getUrl = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${filePath}?ref=${GITHUB.branch}`;
        
        let sha = null;
        try {
            const getResponse = await fetch(getUrl, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (getResponse.status === 200) {
                const fileData = await getResponse.json();
                sha = fileData.sha;
            }
        } catch (error) {
            console.log(`Archivo ${filePath} no encontrado, se creará`);
        }
        
        // 2. Preparar el commit
        const commitData = {
            message: commitMessage,
            content: btoa(unescape(encodeURIComponent(content))),
            branch: GITHUB.branch
        };
        
        if (sha) {
            commitData.sha = sha;
        }
        
        // 3. Hacer el commit
        const putUrl = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${filePath}`;
        const putResponse = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(commitData)
        });
        
        if (!putResponse.ok) {
            const error = await putResponse.json();
            throw new Error(error.message);
        }
        
        return true;
        
    } catch (error) {
        console.error('Error en saveToGitHub:', error);
        return false;
    }
}

// ============================================
// GUARDADO PRINCIPAL
// ============================================

async function saveJSON() {
    try {
        const jsonText = document.getElementById('jsonEditor').value;
        const changes = prompt('📝 Describe los cambios realizados:', 'Actualización de documentos');
        
        if (!changes) {
            showEditorMessage('error', 'Debes describir los cambios');
            return;
        }
        
        // Validar JSON
        const parsed = JSON.parse(jsonText);
        
        if (!parsed.documents || !Array.isArray(parsed.documents)) {
            showEditorMessage('error', 'El JSON debe contener un array "documents"');
            return;
        }
        
        // Guardar versión en el historial
        await saveVersion(parsed, changes);
        
        const timestamp = new Date().toLocaleString('es-ES', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
        
        const commitMessage = `📝 ${changes} [${timestamp}] - ${currentUser?.email || 'Admin'}`;
        
        // INTENTAR SUBIR A GITHUB AUTOMÁTICAMENTE
        const dataSuccess = await saveToGitHub('data.json', jsonText, commitMessage);
        const versionsSuccess = await saveToGitHub('versions.json', JSON.stringify(versions, null, 2), 
            `📚 Historial: ${changes} [${timestamp}]`);
        
        if (dataSuccess && versionsSuccess) {
            currentData = parsed;
            showEditorMessage('success', 
                '✅✅ CAMBIOS GUARDADOS EN GITHUB AUTOMÁTICAMENTE ✅✅\n\n' +
                '• data.json actualizado\n' +
                '• versions.json actualizado\n' +
                '• La web se actualizará en segundos'
            );
            renderDocumentsList();
        } else {
            // MODO MANUAL (fallback)
            await manualSave(jsonText, changes);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showEditorMessage('error', 'Error: ' + error.message);
    }
}

// ============================================
// MODO MANUAL (FALLBACK)
// ============================================

async function manualSave(jsonText, changes) {
    // Guardar versión
    await saveVersion(JSON.parse(jsonText), changes);
    
    // Crear archivos para descarga
    const dataBlob = new Blob([jsonText], { type: 'application/json' });
    const versionsBlob = new Blob([JSON.stringify(versions, null, 2)], { type: 'application/json' });
    
    const dataUrl = URL.createObjectURL(dataBlob);
    const versionsUrl = URL.createObjectURL(versionsBlob);
    
    // Descargar archivos
    const dataLink = document.createElement('a');
    dataLink.href = dataUrl;
    dataLink.download = 'data.json';
    dataLink.click();
    
    setTimeout(() => {
        const versionsLink = document.createElement('a');
        versionsLink.href = versionsUrl;
        versionsLink.download = 'versions.json';
        versionsLink.click();
        
        URL.revokeObjectURL(dataUrl);
        URL.revokeObjectURL(versionsUrl);
    }, 100);
    
    const instructions = `
        ⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️
        
        📥 ARCHIVOS DESCARGADOS
        
        Para PUBLICARLOS:
        
        1. Ve a: https://github.com/${GITHUB.owner}/${GITHUB.repo}/upload/main
        2. Arrastra los 2 archivos que se descargaron:
           • data.json
           • versions.json
        3. En "Commit changes" escribe:
           "${changes}"
        4. Haz clic en "Commit changes"
        
        ⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️
    `;
    
    alert(instructions);
    showEditorMessage('success', '✅ Archivos descargados. Súbelos a GitHub manualmente.');
}

// ============================================
// GUARDAR VERSIÓN
// ============================================

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
    
    renderVersionHistory();
}

// ============================================
// CARGA DE DATOS
// ============================================

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

// ============================================
// INTERFAZ VISUAL
// ============================================

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
    
    const grouped = {};
    filteredDocs.forEach(doc => {
        if (!grouped[doc.organism]) grouped[doc.organism] = [];
        grouped[doc.organism].push(doc);
    });
    
    let html = '';
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

function filterDocumentsByOrganism() {
    renderDocumentsList();
}

// ============================================
// FORMULARIOS DE DOCUMENTOS
// ============================================

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
            currentData.documents.push(docData);
        } else {
            const index = currentData.documents.findIndex(d => d.id === currentEditingDoc.id);
            if (index !== -1) {
                currentData.documents[index] = docData;
            }
        }
        
        await saveVersion(currentData, changes);
        document.getElementById('jsonEditor').value = JSON.stringify(currentData, null, 2);
        
        // Intentar guardar automáticamente
        const timestamp = new Date().toLocaleString('es-ES', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
        
        const commitMessage = `📝 ${changes} [${timestamp}] - ${currentUser?.email || 'Admin'}`;
        
        const dataSuccess = await saveToGitHub('data.json', JSON.stringify(currentData, null, 2), commitMessage);
        const versionsSuccess = await saveToGitHub('versions.json', JSON.stringify(versions, null, 2), 
            `📚 Historial: ${changes} [${timestamp}]`);
        
        if (dataSuccess && versionsSuccess) {
            showEditorMessage('success', '✅ Documento guardado en GitHub');
        } else {
            // Fallback a manual
            const dataBlob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
            const dataUrl = URL.createObjectURL(dataBlob);
            const dataLink = document.createElement('a');
            dataLink.href = dataUrl;
            dataLink.download = 'data.json';
            dataLink.click();
            URL.revokeObjectURL(dataUrl);
            
            showEditorMessage('success', '✅ Documento guardado localmente. Súbelo a GitHub.');
        }
        
        closeDocumentModal();
        renderDocumentsList();
        
    } catch (error) {
        console.error('Error:', error);
        showEditorMessage('error', 'Error al guardar');
    }
}

// ============================================
// ELIMINAR DOCUMENTO
// ============================================

async function deleteDocument(docId) {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;
    
    try {
        const changes = prompt('Describe el motivo de la eliminación:', 'Documento eliminado');
        if (!changes) return;
        
        currentData.documents = currentData.documents.filter(d => d.id !== docId);
        
        await saveVersion(currentData, changes);
        document.getElementById('jsonEditor').value = JSON.stringify(currentData, null, 2);
        
        const timestamp = new Date().toLocaleString('es-ES', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
        
        const commitMessage = `🗑️ ${changes} [${timestamp}] - ${currentUser?.email || 'Admin'}`;
        
        const dataSuccess = await saveToGitHub('data.json', JSON.stringify(currentData, null, 2), commitMessage);
        const versionsSuccess = await saveToGitHub('versions.json', JSON.stringify(versions, null, 2), 
            `📚 Historial: ${changes} [${timestamp}]`);
        
        if (dataSuccess && versionsSuccess) {
            showEditorMessage('success', '✅ Documento eliminado de GitHub');
        } else {
            showEditorMessage('success', '✅ Documento eliminado localmente');
        }
        
        renderDocumentsList();
        
    } catch (error) {
        console.error('Error:', error);
        showEditorMessage('error', 'Error al eliminar');
    }
}

// ============================================
// VERSIONES
// ============================================

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

function restoreVersion(versionId) {
    if (!confirm('¿Restaurar esta versión? Se perderán los cambios no guardados.')) return;
    
    const version = versions.versions.find(v => v.id === versionId);
    if (!version) return;
    
    currentData = version.data;
    document.getElementById('jsonEditor').value = JSON.stringify(currentData, null, 2);
    renderDocumentsList();
    
    closeDocumentModal();
    showEditorMessage('success', 'Versión cargada. Haz clic en Guardar Cambios para publicarla.');
}

// ============================================
// FUNCIONES DEL EDITOR JSON
// ============================================

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
                    currentData = imported.data;
                    renderDocumentsList();
                    showEditorMessage('success', 'Backup importado. Haz clic en Guardar para publicar.');
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

// ============================================
// AUTENTICACIÓN
// ============================================

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

// ============================================
// UTILIDADES
// ============================================

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
