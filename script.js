// Variables globales
let documents = [];
let filteredDocuments = [];
let currentFilters = {
    search: '',
    type: '',
    year: '',
    category: ''
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    setupRealtimeUpdates();
});

// Cargar datos iniciales
async function loadData() {
    try {
        showLoading();
        
        // Obtener documentos activos (última versión de cada uno)
        const snapshot = await db.collection('documents')
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .get();
        
        documents = [];
        snapshot.forEach(doc => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        filteredDocuments = [...documents];
        updateUI();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Error al cargar los datos');
    }
}

// Configurar actualizaciones en tiempo real
function setupRealtimeUpdates() {
    db.collection('documents')
        .where('status', '==', 'active')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
                    // Recargar datos cuando hay cambios
                    loadData();
                }
            });
        });
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        currentFilters.search = e.target.value.toLowerCase();
        applyFilters();
    });

    document.getElementById('typeFilter').addEventListener('change', (e) => {
        currentFilters.type = e.target.value;
        applyFilters();
    });

    document.getElementById('yearFilter').addEventListener('change', (e) => {
        currentFilters.year = e.target.value;
        applyFilters();
    });

    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        currentFilters.category = e.target.value;
        applyFilters();
    });
}

// Aplicar filtros
function applyFilters() {
    filteredDocuments = documents.filter(doc => {
        // Filtro de búsqueda
        if (currentFilters.search) {
            const searchTerm = currentFilters.search.toLowerCase();
            const matchesSearch = 
                doc.title?.toLowerCase().includes(searchTerm) ||
                doc.description?.toLowerCase().includes(searchTerm) ||
                doc.reference?.toLowerCase().includes(searchTerm) ||
                doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
            
            if (!matchesSearch) return false;
        }
        
        // Filtro de tipo
        if (currentFilters.type && doc.type !== currentFilters.type) {
            return false;
        }
        
        // Filtro de año
        if (currentFilters.year) {
            const docYear = new Date(doc.date).getFullYear().toString();
            if (docYear !== currentFilters.year) return false;
        }
        
        // Filtro de categoría
        if (currentFilters.category && doc.category !== currentFilters.category) {
            return false;
        }
        
        return true;
    });
    
    updateDocumentsGrid();
    updateActiveFilters();
}

// Actualizar UI completa
function updateUI() {
    updateStats();
    updateYearFilter();
    updateDocumentsGrid();
    updateFooter();
}

// Actualizar estadísticas
function updateStats() {
    const stats = {
        total: documents.length,
        boletines: documents.filter(d => d.type === 'boletin').length,
        disposiciones: documents.filter(d => d.type === 'disposicion').length,
        anexos: documents.filter(d => d.type === 'anexo').length
    };
    
    const statsHtml = `
        <div class="stat-card">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label"><i class="fas fa-file-alt"></i> Total Documentos</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.boletines}</div>
            <div class="stat-label"><i class="fas fa-newspaper"></i> Boletines</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.disposiciones}</div>
            <div class="stat-label"><i class="fas fa-gavel"></i> Disposiciones</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.anexos}</div>
            <div class="stat-label"><i class="fas fa-paperclip"></i> Anexos</div>
        </div>
    `;
    
    document.getElementById('stats').innerHTML = statsHtml;
}

// Actualizar filtro de años
function updateYearFilter() {
    const years = [...new Set(documents.map(d => new Date(d.date).getFullYear()))];
    years.sort((a, b) => b - a);
    
    const select = document.getElementById('yearFilter');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Todos los años</option>' +
        years.map(year => `<option value="${year}" ${year.toString() === currentValue ? 'selected' : ''}>${year}</option>`).join('');
}

// Actualizar grid de documentos
function updateDocumentsGrid() {
    const grid = document.getElementById('documentsGrid');
    
    if (filteredDocuments.length === 0) {
        grid.innerHTML = `
            <div class="loading">
                <i class="fas fa-search"></i>
                <p>No se encontraron documentos</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredDocuments.map(doc => `
        <div class="doc-card" onclick="showDocument('${doc.id}')">
            <span class="doc-type ${doc.type}">${getTypeLabel(doc.type)}</span>
            <h3 class="doc-title">${escapeHtml(doc.title)}</h3>
            <div class="doc-reference">${escapeHtml(doc.reference || 'Sin referencia')}</div>
            <p class="doc-description">${escapeHtml(doc.description || 'Sin descripción')}</p>
            <div class="doc-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(doc.date)}</span>
                <span><i class="fas fa-tag"></i> ${escapeHtml(doc.category || 'general')}</span>
                <span class="doc-version">v${doc.version || 1}</span>
            </div>
        </div>
    `).join('');
}

// Actualizar filtros activos
function updateActiveFilters() {
    const container = document.getElementById('activeFilters');
    if (!container) return;
    
    const activeFilters = [];
    
    if (currentFilters.search) {
        activeFilters.push(`<span class="filter-tag">Búsqueda: ${currentFilters.search} <i class="fas fa-times" onclick="clearFilter('search')"></i></span>`);
    }
    if (currentFilters.type) {
        activeFilters.push(`<span class="filter-tag">Tipo: ${currentFilters.type} <i class="fas fa-times" onclick="clearFilter('type')"></i></span>`);
    }
    if (currentFilters.year) {
        activeFilters.push(`<span class="filter-tag">Año: ${currentFilters.year} <i class="fas fa-times" onclick="clearFilter('year')"></i></span>`);
    }
    if (currentFilters.category) {
        activeFilters.push(`<span class="filter-tag">Categoría: ${currentFilters.category} <i class="fas fa-times" onclick="clearFilter('category')"></i></span>`);
    }
    
    container.innerHTML = activeFilters.join('');
}

// Actualizar footer
function updateFooter() {
    const lastDoc = documents.sort((a, b) => b.createdAt - a.createdAt)[0];
    if (lastDoc) {
        document.getElementById('lastUpdate').textContent = `Actualizado: ${formatDate(lastDoc.createdAt)}`;
    }
}

// Mostrar documento
async function showDocument(docId) {
    try {
        const doc = documents.find(d => d.id === docId);
        if (!doc) return;
        
        // Obtener historial de versiones
        const versionsSnapshot = await db.collection('documents')
            .doc(docId)
            .collection('versions')
            .orderBy('version', 'desc')
            .get();
        
        const versions = [];
        versionsSnapshot.forEach(v => versions.push(v.data()));
        
        document.getElementById('modalTitle').textContent = doc.title;
        
        let content = `
            <div class="document-viewer">
                <div class="doc-metadata">
                    <p><strong>Referencia:</strong> ${escapeHtml(doc.reference || 'N/A')}</p>
                    <p><strong>Tipo:</strong> ${getTypeLabel(doc.type)}</p>
                    <p><strong>Categoría:</strong> ${escapeHtml(doc.category || 'general')}</p>
                    <p><strong>Fecha:</strong> ${formatDate(doc.date)}</p>
                    <p><strong>Versión:</strong> ${doc.version || 1}</p>
                    <p><strong>Tags:</strong> ${doc.tags ? doc.tags.map(t => `<span class="badge">${t}</span>`).join(' ') : 'Ninguno'}</p>
                </div>
                <div class="doc-content">
                    <h3>Contenido</h3>
                    <pre>${escapeHtml(doc.content || 'Sin contenido')}</pre>
                </div>
            </div>
        `;
        
        document.getElementById('modalBody').innerHTML = content;
        
        if (versions.length > 0) {
            document.getElementById('modalFooter').innerHTML = `
                <button class="btn-secondary" onclick="showVersionHistory('${docId}')">
                    <i class="fas fa-history"></i>
                    Ver historial (${versions.length} versiones)
                </button>
            `;
        } else {
            document.getElementById('modalFooter').innerHTML = '';
        }
        
        document.getElementById('documentModal').classList.add('active');
        
    } catch (error) {
        console.error('Error showing document:', error);
        alert('Error al cargar el documento');
    }
}

// Mostrar historial de versiones
async function showVersionHistory(docId) {
    try {
        const versionsSnapshot = await db.collection('documents')
            .doc(docId)
            .collection('versions')
            .orderBy('version', 'desc')
            .get();
        
        const versions = [];
        versionsSnapshot.forEach(v => versions.push(v.data()));
        
        const currentDoc = documents.find(d => d.id === docId);
        
        let html = '<div class="versions-list">';
        
        // Versión actual
        html += `
            <div class="version-item current">
                <div class="version-header">
                    <span class="version-badge current">Actual v${currentDoc.version}</span>
                    <span class="version-date"><i class="fas fa-clock"></i> ${formatDateTime(currentDoc.updatedAt || currentDoc.createdAt)}</span>
                </div>
                <div class="version-changes">
                    <strong>Cambios:</strong> Versión actual
                </div>
            </div>
        `;
        
        // Versiones anteriores
        versions.forEach((version, index) => {
            html += `
                <div class="version-item">
                    <div class="version-header">
                        <span class="version-badge">v${version.version}</span>
                        <span class="version-date"><i class="fas fa-clock"></i> ${formatDateTime(version.createdAt)}</span>
                        <span class="version-author"><i class="fas fa-user"></i> ${escapeHtml(version.createdBy || 'Sistema')}</span>
                    </div>
                    <div class="version-changes">
                        <strong>Cambios:</strong> ${escapeHtml(version.changes || 'Sin descripción de cambios')}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        document.getElementById('versionModalBody').innerHTML = html;
        document.getElementById('versionModal').classList.add('active');
        
    } catch (error) {
        console.error('Error showing version history:', error);
        alert('Error al cargar el historial');
    }
}

// Limpiar filtro
function clearFilter(filterName) {
    currentFilters[filterName] = '';
    
    if (filterName === 'search') {
        document.getElementById('searchInput').value = '';
    } else {
        document.getElementById(filterName + 'Filter').value = '';
    }
    
    applyFilters();
}

// Cerrar modales
function closeModal() {
    document.getElementById('documentModal').classList.remove('active');
}

function closeVersionModal() {
    document.getElementById('versionModal').classList.remove('active');
}

// Utilidades
function showLoading() {
    document.getElementById('documentsGrid').innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando boletín oficial...</p>
        </div>
    `;
}

function showError(message) {
    document.getElementById('documentsGrid').innerHTML = `
        <div class="loading">
            <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
            <p>${message}</p>
        </div>
    `;
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
