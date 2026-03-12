// ============================================
// CONFIGURACIÓN DE GITHUB - Usando DDOO_TOKEN
// ============================================
const GITHUB = {
    owner: 'Grouvex',
    repo: 'grouvex-docs',
    branch: 'main',
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
// AUTENTICACIÓN CON FIREBASE (CORREGIDA)
// ============================================

// Lista de correos autorizados
const authorizedEmails = [
    'tarlightetherall@gmail.com',
    'tarlight.etherall@grouvex.com',
    'grouvex.phoenix@grouvex.com',
    'grouvex@gmail.com',
    'grouvex.studio@gmail.com',
    'grouvex.studios@grouvex.com',
    'gco.gstudios@gmail.com'
];

function isAuthorized(email) {
    return authorizedEmails.includes(email);
}

// Configurar listener de autenticación
function setupAuthListener() {
    // Verificar que Firebase Auth esté disponible
    if (!firebase || !firebase.auth) {
        console.error('Firebase Auth no está inicializado');
        showAuthMessage('error', 'Error de configuración de Firebase');
        return;
    }
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user && isAuthorized(user.email)) {
            currentUser = user;
            showAdminPanel();
            await loadCurrentData();
            showEditorMessage('success', `👋 Bienvenido, ${user.displayName || user.email}`);
        } else {
            if (user) {
                // Usuario no autorizado - cerrar sesión
                await firebase.auth().signOut();
                showAuthMessage('error', '⛔ No tienes permisos para acceder. Usa una cuenta @grouvex.com o autorizada.');
            }
            showAuthSection();
        }
    });
}

// FUNCIÓN PRINCIPAL DE LOGIN CON GOOGLE (CORREGIDA)
function signInWithGoogle() {
    console.log('Iniciando sesión con Google...');
    
    try {
        // Verificar que Firebase esté disponible
        if (!firebase || !firebase.auth) {
            console.error('Firebase no está inicializado');
            showAuthMessage('error', 'Error: Firebase no está configurado correctamente');
            return;
        }
        
        // Configurar proveedor de Google
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Configuraciones adicionales
        provider.setCustomParameters({
            prompt: 'select_account' // Siempre pide seleccionar cuenta
        });
        
        // Agregar scopes necesarios
        provider.addScope('profile');
        provider.addScope('email');
        
        // Mostrar indicador de carga
        const authMessage = document.getElementById('authMessage');
        authMessage.textContent = '⏳ Abriendo ventana de Google...';
        authMessage.className = 'auth-message info';
        
        // Iniciar sesión con popup
        firebase.auth().signInWithPopup(provider)
            .then((result) => {
                // Éxito en la autenticación
                const user = result.user;
                const credential = result.credential;
                
                console.log('✅ Login exitoso:', user.email);
                
                // Verificar autorización
                if (!isAuthorized(user.email)) {
                    // Usuario no autorizado
                    firebase.auth().signOut();
                    showAuthMessage('error', '⛔ Acceso denegado. Correo no autorizado.');
                    return;
                }
                
                // Login exitoso y autorizado
                showAuthMessage('success', `✅ Bienvenido, ${user.displayName || user.email}`);
                
            })
            .catch((error) => {
                console.error('❌ Error en autenticación:', error);
                
                // Manejo específico de errores
                let errorMessage = 'Error al iniciar sesión';
                
                switch (error.code) {
                    case 'auth/popup-closed-by-user':
                        errorMessage = 'La ventana se cerró antes de completar el proceso';
                        break;
                    case 'auth/popup-blocked':
                        errorMessage = 'El navegador bloqueó la ventana emergente';
                        break;
                    case 'auth/cancelled-popup-request':
                        errorMessage = 'Solo una ventana de autenticación puede estar abierta';
                        break;
                    case 'auth/unauthorized-domain':
                        errorMessage = 'Dominio no autorizado en Firebase Console';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Error de conexión. Verifica tu internet';
                        break;
                    default:
                        errorMessage = error.message || 'Error desconocido';
                }
                
                showAuthMessage('error', `❌ ${errorMessage}`);
            });
            
    } catch (error) {
        console.error('Error crítico:', error);
        showAuthMessage('error', 'Error al iniciar el proceso de autenticación');
    }
}

// Función alternativa con redirect (para móviles)
function signInWithGoogleRedirect() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        firebase.auth().signInWithRedirect(provider);
    } catch (error) {
        console.error('Error en redirect:', error);
        showAuthMessage('error', 'Error al redirigir a Google');
    }
}

// Manejar resultado de redirect (llamar al cargar la página)
function handleRedirectResult() {
    firebase.auth().getRedirectResult()
        .then((result) => {
            if (result.user) {
                console.log('Redirect login exitoso:', result.user.email);
                if (!isAuthorized(result.user.email)) {
                    firebase.auth().signOut();
                    showAuthMessage('error', 'Acceso denegado');
                }
            }
        })
        .catch((error) => {
            console.error('Error en redirect result:', error);
        });
}

// Cerrar sesión
function signOut() {
    firebase.auth().signOut()
        .then(() => {
            console.log('Sesión cerrada');
            window.location.reload(); // Recargar para limpiar todo
        })
        .catch((error) => {
            console.error('Error al cerrar sesión:', error);
            showAuthMessage('error', 'Error al cerrar sesión');
        });
}

// Mostrar panel de administración
function showAdminPanel() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.displayName || 'Administrador';
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('userAvatar').src = currentUser.photoURL || 'https://via.placeholder.com/56x56?text=Admin';
    }
}

// Mostrar sección de autenticación
function showAuthSection() {
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
}

// Mostrar mensaje de autenticación
function showAuthMessage(type, message) {
    const messageEl = document.getElementById('authMessage');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = `auth-message ${type}`;
    
    if (type !== 'info') {
        setTimeout(() => {
            messageEl.textContent = '';
            messageEl.className = 'auth-message';
        }, 5000);
    }
}

// ============================================
// FUNCIÓN PARA OBTENER EL TOKEN DEL SECRET
// ============================================
async function getGitHubToken() {
    if (GITHUB.token) return GITHUB.token;
    
    try {
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

async function saveToGitHub(filePath, content, commitMessage) {
    try {
        showEditorMessage('info', `📤 Subiendo ${filePath} a GitHub...`);
        
        let token = null;
        try {
            token = await getGitHubToken();
        } catch (e) {
            console.log('Modo manual activado');
            return false;
        }
        
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
        
        const commitData = {
            message: commitMessage,
            content: btoa(unescape(encodeURIComponent(content))),
            branch: GITHUB.branch
        };
        
        if (sha) {
            commitData.sha = sha;
        }
        
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
        
        const parsed = JSON.parse(jsonText);
        
        if (!parsed.documents || !Array.isArray(parsed.documents)) {
            showEditorMessage('error', 'El JSON debe contener un array "documents"');
            return;
        }
        
        await saveVersion(parsed, changes);
        
        const timestamp = new Date().toLocaleString('es-ES', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
        
        const commitMessage = `📝 ${changes} [${timestamp}] - ${currentUser?.email || 'Admin'}`;
        
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
    await saveVersion(JSON.parse(jsonText), changes);
    
    const dataBlob = new Blob([jsonText], { type: 'application/json' });
    const versionsBlob = new Blob([JSON.stringify(versions, null, 2)], { type: 'application/json' });
    
    const dataUrl = URL.createObjectURL(dataBlob);
    const versionsUrl = URL.createObjectURL(versionsBlob);
    
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
                // Detectar si tiene estructura semántica
                const hasStructure = doc.structure && Array.isArray(doc.structure) && doc.structure.length > 0;
                
                html += `
                    <div class="doc-management-card">
                        <div class="doc-info">
                            <div class="doc-badges-mini">
                                <span class="doc-type-badge ${doc.type}">${getTypeLabel(doc.type)}</span>
                                ${hasStructure ? '<span class="doc-structure-badge"><i class="fas fa-code"></i> Estructurado</span>' : ''}
                            </div>
                            <h5>${escapeHtml(doc.title)}</h5>
                            <p class="doc-ref">${escapeHtml(doc.reference || 'Sin referencia')}</p>
                        </div>
                        <div class="doc-actions">
                            <button class="icon-btn" onclick="editDocument('${doc.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="icon-btn" onclick="viewDocumentStructure('${doc.id}')" title="Ver estructura">
                                <i class="fas fa-sitemap"></i>
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
// VISUALIZAR ESTRUCTURA DEL DOCUMENTO
// ============================================

function viewDocumentStructure(docId) {
    const doc = currentData.documents.find(d => d.id === docId);
    if (!doc) return;
    
    let html = `
        <div class="structure-viewer">
            <h3>Estructura del Documento: ${escapeHtml(doc.title)}</h3>
            <p class="structure-description">Vista previa de la estructura semántica del documento.</p>
    `;
    
    if (doc.structure && Array.isArray(doc.structure) && doc.structure.length > 0) {
        html += '<div class="structure-tree">';
        doc.structure.forEach((element, index) => {
            const icon = getStructureIcon(element.type);
            const preview = getStructurePreview(element);
            html += `
                <div class="structure-item">
                    <div class="structure-item-header">
                        <i class="fas ${icon}"></i>
                        <span class="structure-type">${element.type}</span>
                        ${element.numero ? `<span class="structure-number">${escapeHtml(element.numero)}</span>` : ''}
                    </div>
                    <div class="structure-preview">${preview}</div>
                </div>
            `;
        });
        html += '</div>';
    } else {
        html += '<p class="no-structure">Este documento no tiene estructura semántica definida.</p>';
    }
    
    html += '</div>';
    
    document.getElementById('modalTitle').textContent = 'Estructura del Documento';
    document.getElementById('documentModalBody').innerHTML = html;
    document.getElementById('documentModal').classList.add('active');
}

function getStructureIcon(type) {
    const icons = {
        'metadata': 'fa-table',
        'sumario': 'fa-list',
        'titulo': 'fa-heading',
        'h1': 'fa-heading',
        'capitulo': 'fa-book',
        'h2': 'fa-book',
        'seccion': 'fa-columns',
        'h3': 'fa-columns',
        'articulo': 'fa-gavel',
        'h4': 'fa-gavel',
        'disposicion': 'fa-file-signature',
        'edicto': 'fa-scroll',
        'lista': 'fa-list-ul',
        'parrafo': 'fa-paragraph',
        'p': 'fa-paragraph',
        'subtitulo': 'fa-heading'
    };
    return icons[type] || 'fa-file';
}

function getStructurePreview(element) {
    if (element.content) {
        return escapeHtml(element.content.substring(0, 50)) + (element.content.length > 50 ? '...' : '');
    } else if (element.items && Array.isArray(element.items)) {
        return `${element.items.length} elementos`;
    } else if (element.text) {
        return escapeHtml(element.text.substring(0, 50)) + (element.text.length > 50 ? '...' : '');
    }
    return 'Sin contenido';
}

// ============================================
// FORMULARIOS DE DOCUMENTOS (ACTUALIZADOS)
// ============================================

function showNewDocumentForm() {
    currentEditingDoc = null;
    
    const formHtml = `
        <form id="documentForm" class="document-form" onsubmit="saveDocument(event)">
            <div class="form-tabs">
                <button type="button" class="form-tab-btn active" onclick="switchFormTab('basic')">Básico</button>
                <button type="button" class="form-tab-btn" onclick="switchFormTab('structure')">Estructura</button>
            </div>
            
            <div id="basicTab" class="form-tab-content active">
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
                    
                    <div class="form-group">
                        <label>Tags (separados por coma)</label>
                        <input type="text" id="docTags" placeholder="tag1, tag2, tag3">
                    </div>
                    
                    <div class="form-group">
                        <label>Versión</label>
                        <input type="number" id="docVersion" value="1" min="1">
                    </div>
                </div>
            </div>
            
            <div id="structureTab" class="form-tab-content">
                <div class="structure-editor-info">
                    <p><i class="fas fa-info-circle"></i> Define la estructura semántica del documento usando el editor JSON.</p>
                    <p>Puedes usar el editor JSON en la pestaña "Editor JSON" para una edición más avanzada.</p>
                </div>
                
                <div class="form-group full-width">
                    <label>¿Tiene estructura semántica?</label>
                    <select id="docHasStructure" onchange="toggleStructureEditor()">
                        <option value="no">No (solo contenido de texto)</option>
                        <option value="yes">Sí (estructura semántica)</option>
                    </select>
                </div>
                
                <div id="contentEditor" class="form-group full-width">
                    <label>Contenido *</label>
                    <textarea id="docContent" rows="10" placeholder="Contenido del documento en texto plano..."></textarea>
                </div>
                
                <div id="structureEditor" style="display: none;" class="form-group full-width">
                    <label>Estructura Semántica (JSON) *</label>
                    <textarea id="docStructure" rows="15" class="json-editor-small" placeholder='[
  {
    "type": "titulo",
    "numero": "I",
    "content": "TÍTULO EJEMPLO"
  }
]'></textarea>
                    <p class="help-text">
                        <i class="fas fa-question-circle"></i>
                        Tipos disponibles: metadata, sumario, titulo, capitulo, seccion, articulo, disposicion, edicto, lista, parrafo, subtitulo
                    </p>
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
    const hasStructure = doc.structure && Array.isArray(doc.structure) && doc.structure.length > 0;
    const structureValue = hasStructure ? JSON.stringify(doc.structure, null, 2) : '';
    
    const formHtml = `
        <form id="documentForm" class="document-form" onsubmit="saveDocument(event)">
            <div class="form-tabs">
                <button type="button" class="form-tab-btn active" onclick="switchFormTab('basic')">Básico</button>
                <button type="button" class="form-tab-btn" onclick="switchFormTab('structure')">Estructura</button>
            </div>
            
            <div id="basicTab" class="form-tab-content active">
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
                    
                    <div class="form-group">
                        <label>Tags (separados por coma)</label>
                        <input type="text" id="docTags" value="${escapeHtml(tagsValue)}">
                    </div>
                    
                    <div class="form-group">
                        <label>Versión</label>
                        <input type="number" id="docVersion" value="${doc.version || 1}" min="1">
                    </div>
                </div>
            </div>
            
            <div id="structureTab" class="form-tab-content">
                <div class="structure-editor-info">
                    <p><i class="fas fa-info-circle"></i> Define la estructura semántica del documento.</p>
                </div>
                
                <div class="form-group full-width">
                    <label>¿Tiene estructura semántica?</label>
                    <select id="docHasStructure" onchange="toggleStructureEditor()">
                        <option value="no" ${!hasStructure ? 'selected' : ''}>No (solo contenido de texto)</option>
                        <option value="yes" ${hasStructure ? 'selected' : ''}>Sí (estructura semántica)</option>
                    </select>
                </div>
                
                <div id="contentEditor" class="form-group full-width" ${hasStructure ? 'style="display:none;"' : ''}>
                    <label>Contenido *</label>
                    <textarea id="docContent" rows="10">${escapeHtml(doc.content || '')}</textarea>
                </div>
                
                <div id="structureEditor" class="form-group full-width" ${hasStructure ? '' : 'style="display:none;"'}>
                    <label>Estructura Semántica (JSON) *</label>
                    <textarea id="docStructure" rows="15" class="json-editor-small">${escapeHtml(structureValue)}</textarea>
                    <p class="help-text">
                        <i class="fas fa-question-circle"></i>
                        Tipos disponibles: metadata, sumario, titulo, capitulo, seccion, articulo, disposicion, edicto, lista, parrafo, subtitulo
                    </p>
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

function toggleStructureEditor() {
    const hasStructure = document.getElementById('docHasStructure').value === 'yes';
    document.getElementById('contentEditor').style.display = hasStructure ? 'none' : 'block';
    document.getElementById('structureEditor').style.display = hasStructure ? 'block' : 'none';
}

function switchFormTab(tabName) {
    document.querySelectorAll('.form-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.form-tab-content').forEach(content => content.classList.remove('active'));
    
    if (tabName === 'basic') {
        document.querySelectorAll('.form-tab-btn')[0].classList.add('active');
        document.getElementById('basicTab').classList.add('active');
    } else {
        document.querySelectorAll('.form-tab-btn')[1].classList.add('active');
        document.getElementById('structureTab').classList.add('active');
    }
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
        
        const hasStructure = document.getElementById('docHasStructure').value === 'yes';
        
        const docData = {
            id: currentEditingDoc?.id || generateId(),
            organism: document.getElementById('docOrganism').value,
            type: document.getElementById('docType').value,
            title: document.getElementById('docTitle').value,
            reference: document.getElementById('docReference').value,
            date: parseInt(document.getElementById('docDate').value),
            description: document.getElementById('docDescription').value,
            tags: document.getElementById('docTags').value.split(',').map(t => t.trim()).filter(t => t),
            version: parseInt(document.getElementById('docVersion').value) || 1
        };
        
        if (hasStructure) {
            // Guardar estructura semántica
            try {
                const structureText = document.getElementById('docStructure').value;
                docData.structure = JSON.parse(structureText);
                docData.content = ''; // No usar content cuando hay estructura
            } catch (e) {
                showEditorMessage('error', 'Error: La estructura JSON no es válida');
                return;
            }
        } else {
            // Guardar contenido tradicional
            docData.content = document.getElementById('docContent').value;
            docData.structure = []; // Vaciar estructura si existe
        }
        
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
                ${doc.structure ? '<p><span class="badge"><i class="fas fa-code"></i> Estructurado</span></p>' : ''}
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
    if (!timestamp) return 'Fecha desconocida';
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

// Hacer funciones globales para los onclick
window.switchTab = switchTab;
window.showNewDocumentForm = showNewDocumentForm;
window.editDocument = editDocument;
window.deleteDocument = deleteDocument;
window.viewDocumentVersions = viewDocumentVersions;
window.viewDocumentStructure = viewDocumentStructure;
window.closeDocumentModal = closeDocumentModal;
window.saveDocument = saveDocument;
window.formatJSON = formatJSON;
window.exportAllData = exportAllData;
window.importAllData = importAllData;
window.saveJSON = saveJSON;
window.viewFullHistory = viewFullHistory;
window.previewVersion = previewVersion;
window.restoreVersion = restoreVersion;
window.filterDocumentsByOrganism = filterDocumentsByOrganism;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.switchFormTab = switchFormTab;
window.toggleStructureEditor = toggleStructureEditor;
