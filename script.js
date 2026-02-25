// Variables globales
let documents = [];
let filteredDocuments = [];
let currentFilters = {
    search: '',
    type: '',
    year: '',
    organism: 'all'
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadDocumentVersions(); // FALTA: Los paréntesis para ejecutar la función
    setupEventListeners();
    // setupRealtimeUpdates(); // ERROR: Esto requiere Firestore, pero solo usas Auth
});

// Cargar datos iniciales DESDE JSON (no desde Firestore)
async function loadData() {
    try {
        showLoading();
        
        // CORRECCIÓN: Cargar desde data.json, no desde Firestore
        const response = await fetch('data.json?' + Date.now());
        const data = await response.json();
        
        documents = data.documents || [];
        filteredDocuments = [...documents];
        
        updateUI();
        setupOrganismButtons();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Error al cargar los datos');
    }
}

// Cargar versiones desde versions.json
async function loadDocumentVersions() {
    try {
        const response = await fetch('versions.json?' + Date.now());
        const versionsData = await response.json();
        console.log('Versions loaded:', versionsData);
        
        // Guardar en window para acceso global
        window.versionsData = versionsData;
        
    } catch (error) {
        console.log('No versions file found');
        window.versionsData = { versions: [] };
    }
}

// Configurar event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentFilters.search = e.target.value.toLowerCase();
            applyFilters();
        });
    }

    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            currentFilters.type = e.target.value;
            applyFilters();
        });
    }

    const yearFilter = document.getElementById('yearFilter');
    if (yearFilter) {
        yearFilter.addEventListener('change', (e) => {
            currentFilters.year = e.target.value;
            applyFilters();
        });
    }

    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentFilters.category = e.target.value;
            applyFilters();
        });
    }
}

// Configurar botones de organismo
function setupOrganismButtons() {
    const buttons = document.querySelectorAll('.organism-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.organism = btn.dataset.organism;
            applyFilters();
        });
    });
}

// Aplicar filtros
function applyFilters() {
    filteredDocuments = documents.filter(doc => {
        // Filtro de organismo
        if (currentFilters.organism !== 'all' && doc.organism !== currentFilters.organism) {
            return false;
        }
        
        // Filtro de búsqueda
        if (currentFilters.search) {
            const searchTerm = currentFilters.search.toLowerCase();
            const matchesSearch = 
                (doc.title || '').toLowerCase().includes(searchTerm) ||
                (doc.description || '').toLowerCase().includes(searchTerm) ||
                (doc.reference || '').toLowerCase().includes(searchTerm) ||
                (doc.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
            
            if (!matchesSearch) return false;
        }
        
        // Filtro de tipo
        if (currentFilters.type && doc.type !== currentFilters.type) {
            return false;
        }
        
        // Filtro de año
        if (currentFilters.year) {
            const docYear = new Date(doc.date * 1000).getFullYear().toString();
            if (docYear !== currentFilters.year) return false;
        }
        
        // Filtro de categoría
        if (currentFilters.category && doc.category !== currentFilters.category) {
            return false;
        }
        
        return true;
    });
    
    updateDocumentsGrid();
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
        boletines: documents.filter(d => d.type === 'boletin' || d.type === 'bo').length,
        disposiciones: documents.filter(d => d.type === 'disposicion').length,
        anexos: documents.filter(d => d.type === 'anexo').length
    };
    
    const statsHtml = `
        <div class="stat-card">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label"><i class="fas fa-file-alt"></i> Total DDOO</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.grouvex}</div>
            <div class="stat-label"><i class="fas fa-building"></i> Grouvex</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.records}</div>
            <div class="stat-label"><i class="fas fa-music"></i> Records</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.designs + stats.games}</div>
            <div class="stat-label"><i class="fas fa-paint-brush"></i> Designs/Games</div>
        </div>
    `;
    
    const statsElement = document.getElementById('stats');
    if (statsElement) statsElement.innerHTML = statsHtml;
}

// Actualizar filtro de años
function updateYearFilter() {
    const years = [...new Set(documents.map(d => {
        return new Date(d.date * 1000).getFullYear();
    }))];
    years.sort((a, b) => b - a);
    
    const select = document.getElementById('yearFilter');
    if (!select) return;
    
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Todos los años</option>' +
        years.map(year => `<option value="${year}">${year}</option>`).join('');
}

// Actualizar grid de documentos
function updateDocumentsGrid() {
    const grid = document.getElementById('documentsGrid');
    if (!grid) return;
    
    if (!filteredDocuments.length) {
        grid.innerHTML = `
            <div class="loading">
                <i class="fas fa-search"></i>
                <p>No se encontraron documentos</p>
            </div>
        `;
        return;
    }
    
    // Ordenar por fecha (más reciente primero)
    filteredDocuments.sort((a, b) => b.date - a.date);
    
    grid.innerHTML = filteredDocuments.map(doc => `
        <div class="doc-card" onclick="showDocument('${doc.id}')">
            <div>
                <span class="doc-organism ${doc.organism}">${getOrganismLabel(doc.organism)}</span>
                <span class="doc-type ${doc.type}">${getTypeLabel(doc.type)}</span>
            </div>
            <h3 class="doc-title">${escapeHtml(doc.title)}</h3>
            <div class="doc-reference">${escapeHtml(doc.reference || 'Sin referencia')}</div>
            <p class="doc-description">${escapeHtml(doc.description || 'Sin descripción')}</p>
            <div class="doc-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(doc.date)}</span>
                <span class="doc-version">v${doc.version || 1}</span>
            </div>
        </div>
    `).join('');
}

// Actualizar footer
function updateFooter() {
    const lastDoc = documents.sort((a, b) => b.date - a.date)[0];
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement && lastDoc) {
        lastUpdateElement.textContent = `Actualizado: ${formatDate(lastDoc.date)}`;
    }
}

// Mostrar documento
async function showDocument(docId) {
    try {
        const doc = documents.find(d => d.id === docId);
        if (!doc) return;
        
        // Buscar versiones en versions.json
        const versions = [];
        if (window.versionsData && window.versionsData.versions) {
            window.versionsData.versions.forEach(v => {
                if (v.data && v.data.id === docId) {
                    versions.push(v);
                }
            });
        }
        
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');
        
        if (modalTitle) modalTitle.textContent = doc.title;
        
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
    
        if (modalBody) modalBody.innerHTML = content;
        
        // Configurar el footer con el botón de historial si hay versiones
        if (modalFooter) {
            if (versions.length > 0) {
                modalFooter.innerHTML = `
                    <button class="btn-secondary" onclick="showVersionHistory('${docId}')">
                        <i class="fas fa-history"></i>
                        Ver historial (${versions.length} versiones)
                    </button>
                `;
            } else {
                modalFooter.innerHTML = '';
            }
        }
        
        const modal = document.getElementById('documentModal');
        if (modal) modal.classList.add('active');
        
    } catch (error) {
        console.error('Error showing document:', error);
        alert('Error al cargar el documento');
    }
}

// Mostrar historial de versiones
function showVersionHistory(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    
    // Obtener versiones de este documento desde versions.json
    const versions = [];
    if (window.versionsData && window.versionsData.versions) {
        window.versionsData.versions.forEach(v => {
            if (v.data && v.data.id === docId) {
                versions.push(v);
            }
        });
    }
    
    let html = '<div class="versions-list">';
    
    // Versión actual
    html += `
        <div class="version-item current">
            <div class="version-header">
                <span class="version-badge current">Actual v${doc.version}</span>
                <span class="version-date"><i class="fas fa-clock"></i> ${formatDateTime(doc.date)}</span>
            </div>
            <div class="version-changes">
                <strong>Cambios:</strong> Versión actual
            </div>
        </div>
    `;
    
    // Versiones anteriores
    versions.forEach((version) => {
        html += `
            <div class="version-item">
                <div class="version-header">
                    <span class="version-badge">v${version.data.version}</span>
                    <span class="version-date"><i class="fas fa-clock"></i> ${formatDateTime(version.date)}</span>
                    <span class="version-author"><i class="fas fa-user"></i> ${escapeHtml(version.author || 'Sistema')}</span>
                </div>
                <div class="version-changes">
                    <strong>Cambios:</strong> ${escapeHtml(version.changes || 'Sin descripción')}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    const modalBody = document.getElementById('versionModalBody');
    if (modalBody) modalBody.innerHTML = html;
    
    const modal = document.getElementById('versionModal');
    if (modal) modal.classList.add('active');
}

// Limpiar filtro
function clearFilter(filterName) {
    currentFilters[filterName] = '';
    
    if (filterName === 'search') {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
    } else {
        const filterElement = document.getElementById(filterName + 'Filter');
        if (filterElement) filterElement.value = '';
    }
    
    applyFilters();
}

// Cerrar modales
function closeModal() {
    const modal = document.getElementById('documentModal');
    if (modal) modal.classList.remove('active');
}

function closeVersionModal() {
    const modal = document.getElementById('versionModal');
    if (modal) modal.classList.remove('active');
}

// Utilidades
function showLoading() {
    const grid = document.getElementById('documentsGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando boletín oficial...</p>
            </div>
        `;
    }
}

function showError(message) {
    const grid = document.getElementById('documentsGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="loading">
                <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

function getOrganismLabel(organism) {
    const labels = {
        'grouvex': 'Grouvex Studios',
        'records': 'Records',
        'designs': 'Designs',
        'games': 'Games'
    };
    return labels[organism] || organism;
}

function getTypeLabel(type) {
    const labels = {
        'boletin': 'Boletín Oficial',
        'bo': 'B.O.',
        'disposicion': 'Disposición',
        'edicto': 'Edicto',
        'noticia': 'Noticia',
        'anexo': 'Anexo',
        'miembros': 'Miembros',
        'no': 'N.O.',
        'tos': 'ToS&PP'
    };
    return labels[type] || type;
}

function formatDate(timestamp) {
    if (!timestamp) return 'Fecha desconocida';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(timestamp) {
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

function closeModal() {
    document.getElementById('documentModal').classList.remove('active');
}

function closeVersionModal() {
    document.getElementById('versionModal').classList.remove('active');
}
