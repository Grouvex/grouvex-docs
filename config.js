// Variables globales
let currentUser = null;
let documents = [];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    setupAuthListener();
    setupEventListeners();
});

// Configurar listener de autenticación
function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user && isAuthorized(user.email)) {
            currentUser = user;
            showAdminPanel();
            await loadDocuments();
        } else {
            if (user) {
                // Usuario no autorizado
                await auth.signOut();
                showAuthMessage('error', 'No tienes permisos para acceder');
            }
            showAuthSection();
        }
    });
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('adminSearch')?.addEventListener('input', (e) => {
        filterAdminDocuments(e.target.value);
    });
}

// Mostrar sección de autenticación
function showAuthSection() {
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
}

// Mostrar panel de administración
function showAdminPanel() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    
    // Actualizar info del usuario
    document.getElementById('userName').textContent = currentUser.displayName || 'Usuario';
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').src = currentUser.photoURL || 'https://via.placeholder.com/56x56?text=User';
}

// Cargar documentos
async function loadDocuments() {
    try {
        const snapshot = await db.collection('documents')
            .orderBy('createdAt', 'desc')
            .get();
        
        documents = [];
        snapshot.forEach(doc => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderAdminDocuments();
        
    } catch (error) {
        console.error('Error loading documents:', error);
        showAuthMessage('error', 'Error al cargar documentos');
    }
}

// Renderizar lista de documentos en admin
function renderAdminDocuments(filter = '') {
    const list = document.getElementById('adminDocumentsList');
    
    let filtered = documents;
    if (filter) {
        const term = filter.toLowerCase();
        filtered = documents.filter(doc => 
            doc.title?.toLowerCase().includes(term) ||
            doc.reference?.toLowerCase().includes(term)
        );
    }
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="loading"><p>No hay documentos</p></div>';
        return;
    }
    
    list.innerHTML = filtered.map(doc => `
        <div class="admin-doc-item">
            <div class="admin-doc-info">
                <h4>${escapeHtml(doc.title)}</h4>
                <p>${escapeHtml(doc.reference || 'Sin referencia')}</p>
                <div class="admin-doc-meta">
                    <span>v${doc.version || 1}</span>
                    <span>${getTypeLabel(doc.type)}</span>
                    <span>${formatDate(doc.createdAt)}</span>
                </div>
            </div>
            <div class="admin-doc-actions">
                <button class="edit-btn" onclick="editDocument('${doc.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="history-btn" onclick="showDocumentHistory('${doc.id}')" title="Historial">
                    <i class="fas fa-history"></i>
                </button>
                <button class="delete-btn" onclick="deleteDocument('${doc.id}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Filtrar documentos en admin
function filterAdminDocuments(term) {
    renderAdminDocuments(term);
}

// Crear nuevo documento
async function createDocument() {
    try {
        const title = document.getElementById('newTitle').value;
        const type = document.getElementById('newType').value;
        const category = document.getElementById('newCategory').value;
        const reference = document.getElementById('newReference').value;
        const description = document.getElementById('newDescription').value;
        const content = document.getElementById('newContent').value;
        const tags = document.getElementById('newTags').value.split(',').map(t => t.trim()).filter(t => t);
        
        if (!title || !type || !content) {
            alert('Por favor completa los campos obligatorios');
            return;
        }
        
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const documentData = {
            title,
            type,
            category,
            reference,
            description,
            content,
            tags,
            status: 'active',
            version: 1,
            createdBy: currentUser.email,
            createdAt: timestamp,
            updatedAt: timestamp,
            date: timestamp
        };
        
        // Crear documento principal
        const docRef = await db.collection('documents').add(documentData);
        
        // Crear primera versión en el historial
        await db.collection('documents')
            .doc(docRef.id)
            .collection('versions')
            .add({
                ...documentData,
                version: 1,
                changes: 'Versión inicial',
                createdAt: timestamp,
                createdBy: currentUser.email
            });
        
        // Limpiar formulario
        clearNewDocumentForm();
        
        // Recargar documentos
        await loadDocuments();
        
        showAuthMessage('success', 'Documento creado correctamente');
        
    } catch (error) {
        console.error('Error creating document:', error);
        showAuthMessage('error', 'Error al crear documento');
    }
}

// Editar documento
async function editDocument(docId) {
    try {
        const doc = documents.find(d => d.id === docId);
        if (!doc) return;
        
        const modalBody = document.getElementById('editModalBody');
        
        modalBody.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Título</label>
                    <input type="text" id="editTitle" value="${escapeHtml(doc.title || '')}">
                </div>
                
                <div class="form-group">
                    <label>Tipo</label>
                    <select id="editType">
                        <option value="boletin" ${doc.type === 'boletin' ? 'selected' : ''}>Boletín Oficial</option>
                        <option value="disposicion" ${doc.type === 'disposicion' ? 'selected' : ''}>Disposición</option>
                        <option value="edicto" ${doc.type === 'edicto' ? 'selected' : ''}>Edicto</option>
                        <option value="noticia" ${doc.type === 'noticia' ? 'selected' : ''}>Noticia</option>
                        <option value="anexo" ${doc.type === 'anexo' ? 'selected' : ''}>Anexo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Categoría</label>
                    <select id="editCategory">
                        <option value="general" ${doc.category === 'general' ? 'selected' : ''}>General</option>
                        <option value="records" ${doc.category === 'records' ? 'selected' : ''}>Grouvex Records</option>
                        <option value="designs" ${doc.category === 'designs' ? 'selected' : ''}>Grouvex Designs</option>
                        <option value="comunidad" ${doc.category === 'comunidad' ? 'selected' : ''}>Comunidad</option>
                        <option value="gco" ${doc.category === 'gco' ? 'selected' : ''}>Gestión GCO</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Referencia</label>
                    <input type="text" id="editReference" value="${escapeHtml(doc.reference || '')}">
                </div>
                
                <div class="form-group full-width">
                    <label>Descripción</label>
                    <textarea id="editDescription" rows="3">${escapeHtml(doc.description || '')}</textarea>
                </div>
                
                <div class="form-group full-width">
                    <label>Contenido</label>
                    <textarea id="editContent" rows="10">${escapeHtml(doc.content || '')}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Tags (separados por coma)</label>
                    <input type="text" id="editTags" value="${doc.tags ? doc.tags.join(', ') : ''}">
                </div>
                
                <div class="form-group full-width">
                    <label>Descripción de cambios</label>
                    <textarea id="editChanges" rows="2" placeholder="Describe los cambios realizados..."></textarea>
                </div>
                
                <div class="form-group">
                    <button onclick="saveDocument('${docId}', ${doc.version})" class="btn-primary">
                        <i class="fas fa-save"></i>
                        Guardar Cambios
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('editModal').classList.add('active');
        
    } catch (error) {
        console.error('Error editing document:', error);
        alert('Error al cargar el documento');
    }
}

// Guardar cambios del documento (crea nueva versión)
async function saveDocument(docId, currentVersion) {
    try {
        const title = document.getElementById('editTitle').value;
        const type = document.getElementById('editType').value;
        const category = document.getElementById('editCategory').value;
        const reference = document.getElementById('editReference').value;
        const description = document.getElementById('editDescription').value;
        const content = document.getElementById('editContent').value;
        const tags = document.getElementById('editTags').value.split(',').map(t => t.trim()).filter(t => t);
        const changes = document.getElementById('editChanges').value;
        
        if (!changes) {
            alert('Por favor describe los cambios realizados');
            return;
        }
        
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const newVersion = (currentVersion || 0) + 1;
        
        // Obtener documento actual
        const docRef = db.collection('documents').doc(docId);
        const docSnap = await docRef.get();
        const oldData = docSnap.data();
        
        // Guardar versión anterior en historial
        await docRef.collection('versions').add({
            ...oldData,
            version: currentVersion,
            changes: changes,
            archivedAt: timestamp,
            archivedBy: currentUser.email
        });
        
        // Actualizar documento principal
        await docRef.update({
            title,
            type,
            category,
            reference,
            description,
            content,
            tags,
            version: newVersion,
            updatedAt: timestamp,
            updatedBy: currentUser.email
        });
        
        closeEditModal();
        await loadDocuments();
        
        showAuthMessage('success', 'Documento actualizado correctamente (nueva versión creada)');
        
    } catch (error) {
        console.error('Error saving document:', error);
        showAuthMessage('error', 'Error al guardar documento');
    }
}

// Mostrar historial del documento
async function showDocumentHistory(docId) {
    try {
        const versionsSnapshot = await db.collection('documents')
            .doc(docId)
            .collection('versions')
            .orderBy('version', 'desc')
            .get();
        
        const doc = documents.find(d => d.id === docId);
        
        let html = '<div class="versions-list">';
        
        // Versión actual
        html += `
            <div class="version-item current">
                <div class="version-header">
                    <span class="version-badge current">Actual v${doc.version}</span>
                    <span class="version-date"><i class="fas fa-clock"></i> ${formatDateTime(doc.updatedAt || doc.createdAt)}</span>
                </div>
                <div class="version-changes">
                    <strong>Cambios:</strong> Versión actual
                </div>
                <div class="version-restore">
                    <button class="btn-secondary" onclick="viewVersion('${docId}', ${doc.version})">
                        <i class="fas fa-eye"></i>
                        Ver versión
                    </button>
                </div>
            </div>
        `;
        
        // Versiones anteriores
        versionsSnapshot.forEach(versionDoc => {
            const version = versionDoc.data();
            html += `
                <div class="version-item">
                    <div class="version-header">
                        <span class="version-badge">v${version.version}</span>
                        <span class="version-date"><i class="fas fa-clock"></i> ${formatDateTime(version.archivedAt || version.createdAt)}</span>
                        <span class="version-author"><i class="fas fa-user"></i> ${escapeHtml(version.archivedBy || version.createdBy || 'Sistema')}</span>
                    </div>
                    <div class="version-changes">
                        <strong>Cambios:</strong> ${escapeHtml(version.changes || 'Sin descripción')}
                    </div>
                    <div class="version-restore">
                        <button class="btn-secondary" onclick="viewVersion('${docId}', ${version.version})">
                            <i class="fas fa-eye"></i>
                            Ver versión
                        </button>
                        <button class="btn-primary" onclick="restoreVersion('${docId}', ${version.version})">
                            <i class="fas fa-history"></i>
                            Restaurar
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        document.getElementById('historyModalBody').innerHTML = html;
        document.getElementById('historyModal').classList.add('active');
        
    } catch (error) {
        console.error('Error showing history:', error);
        alert('Error al cargar el historial');
    }
}

// Ver una versión específica
async function viewVersion(docId, version) {
    try {
        let versionData;
        
        if (version === documents.find(d => d.id === docId).version) {
            // Versión actual
            versionData = documents.find(d => d.id === docId);
        } else {
            // Versión del historial
            const versionsSnapshot = await db.collection('documents')
                .doc(docId)
                .collection('versions')
                .where('version', '==', version)
                .limit(1)
                .get();
            
            if (!versionsSnapshot.empty) {
                versionData = versionsSnapshot.docs[0].data();
            }
        }
        
        if (versionData) {
            document.getElementById('modalTitle').textContent = `${versionData.title} (v${version})`;
            document.getElementById('modalBody').innerHTML = `
                <div class="document-viewer">
                    <div class="doc-metadata">
                        <p><strong>Referencia:</strong> ${escapeHtml(versionData.reference || 'N/A')}</p>
                        <p><strong>Tipo:</strong> ${getTypeLabel(versionData.type)}</p>
                        <p><strong>Fecha:</strong> ${formatDate(versionData.createdAt)}</p>
                    </div>
                    <div class="doc-content">
                        <h3>Contenido</h3>
                        <pre>${escapeHtml(versionData.content || 'Sin contenido')}</pre>
                    </div>
                </div>
            `;
            document.getElementById('documentModal').classList.add('active');
        }
        
    } catch (error) {
        console.error('Error viewing version:', error);
        alert('Error al cargar la versión');
    }
}

// Restaurar una versión anterior
async function restoreVersion(docId, version) {
    if (!confirm('¿Estás seguro de restaurar esta versión? Se creará una nueva versión en el historial.')) {
        return;
    }
    
    try {
        let versionData;
        
        if (version === documents.find(d => d.id === docId).version) {
            alert('Esta es la versión actual');
            return;
        } else {
            const versionsSnapshot = await db.collection('documents')
                .doc(docId)
                .collection('versions')
                .where('version', '==', version)
                .limit(1)
                .get();
            
            if (!versionsSnapshot.empty) {
                versionData = versionsSnapshot.docs[0].data();
            }
        }
        
        if (!versionData) {
            alert('Versión no encontrada');
            return;
        }
        
        const docRef = db.collection('documents').doc(docId);
        const docSnap = await docRef.get();
        const currentData = docSnap.data();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const newVersion = (currentData.version || 0) + 1;
        
        // Guardar versión actual en historial
        await docRef.collection('versions').add({
            ...currentData,
            version: currentData.version,
            changes: `Auto-archivado antes de restaurar versión ${version}`,
            archivedAt: timestamp,
            archivedBy: currentUser.email
        });
        
        // Restaurar versión anterior como nueva versión
        await docRef.update({
            title: versionData.title,
            type: versionData.type,
            category: versionData.category,
            reference: versionData.reference,
            description: versionData.description,
            content: versionData.content,
            tags: versionData.tags || [],
            version: newVersion,
            updatedAt: timestamp,
            updatedBy: currentUser.email,
            restoredFrom: version
        });
        
        closeHistoryModal();
        await loadDocuments();
        
        showAuthMessage('success', `Versión ${version} restaurada como versión ${newVersion}`);
        
    } catch (error) {
        console.error('Error restoring version:', error);
        showAuthMessage('error', 'Error al restaurar versión');
    }
}

// Eliminar documento (soft delete)
async function deleteDocument(docId) {
    if (!confirm('¿Estás seguro de eliminar este documento? Se moverá al historial.')) {
        return;
    }
    
    try {
        const docRef = db.collection('documents').doc(docId);
        const docSnap = await docRef.get();
        const docData = docSnap.data();
        
        // Guardar en historial antes de eliminar
        await docRef.collection('versions').add({
            ...docData,
            version: docData.version,
            changes: 'Documento eliminado',
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            deletedBy: currentUser.email
        });
        
        // Marcar como eliminado
        await docRef.update({
            status: 'deleted',
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            deletedBy: currentUser.email
        });
        
        await loadDocuments();
        
        showAuthMessage('success', 'Documento eliminado correctamente');
        
    } catch (error) {
        console.error('Error deleting document:', error);
        showAuthMessage('error', 'Error al eliminar documento');
    }
}

// Mostrar historial completo
async function showHistory() {
    try {
        const snapshot = await db.collectionGroup('versions')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        let html = '<div class="versions-list">';
        
        snapshot.forEach(doc => {
            const version = doc.data();
            html += `
                <div class="version-item">
                    <div class="version-header">
                        <span class="version-badge">v${version.version}</span>
                        <span class="version-date"><i class="fas fa-clock"></i> ${formatDateTime(version.createdAt || version.archivedAt)}</span>
                        <span class="version-author"><i class="fas fa-user"></i> ${escapeHtml(version.createdBy || version.archivedBy || 'Sistema')}</span>
                    </div>
                    <div class="version-changes">
                        <strong>Cambios:</strong> ${escapeHtml(version.changes || 'Sin descripción')}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        document.getElementById('historyModalBody').innerHTML = html;
        document.getElementById('historyModal').classList.add('active');
        
    } catch (error) {
        console.error('Error showing full history:', error);
        alert('Error al cargar el historial');
    }
}

// Limpiar formulario de nuevo documento
function clearNewDocumentForm() {
    document.getElementById('newTitle').value = '';
    document.getElementById('newType').value = 'boletin';
    document.getElementById('newCategory').value = 'general';
    document.getElementById('newReference').value = '';
    document.getElementById('newDescription').value = '';
    document.getElementById('newContent').value = '';
    document.getElementById('newTags').value = '';
}

// Cerrar modales
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
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

function toggleEmailSignIn() {
    const emailSignIn = document.getElementById('emailSignIn');
    emailSignIn.style.display = emailSignIn.style.display === 'none' ? 'flex' : 'none';
}

function sendSignInLink() {
    const email = document.getElementById('emailInput').value;
    if (!email) {
        showAuthMessage('error', 'Por favor ingresa un email');
        return;
    }
    
    const actionCodeSettings = {
        url: window.location.href,
        handleCodeInApp: true
    };
    
    auth.sendSignInLinkToEmail(email, actionCodeSettings)
        .then(() => {
            window.localStorage.setItem('emailForSignIn', email);
            showAuthMessage('success', 'Enlace de acceso enviado a tu email');
        })
        .catch(error => {
            console.error('Error sending sign-in link:', error);
            showAuthMessage('error', 'Error al enviar el enlace');
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

function getTypeLabel(type) {
    const labels = {
        'boletin': 'Boletín Oficial',
        'disposicion': 'Disposición',
        'edicto': 'Edicto',
        'noticia': 'Noticia',
        'anexo': 'Anexo'
    };
    return labels[type] || type;
}

function formatDate(timestamp) {
    if (!timestamp) return 'Fecha desconocida';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(timestamp) {
    if (!timestamp) return 'Fecha desconocida';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
