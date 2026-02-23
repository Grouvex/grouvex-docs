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
    setupEventListeners();
});

// Cargar datos del JSON
async function loadData() {
    try {
        const response = await fetch('data.json');
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
                (doc.reference || '').toLowerCase().includes(searchTerm);
            
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
        grouvex: documents.filter(d => d.organism === 'grouvex').length,
        records: documents.filter(d => d.organism === 'records').length,
        designs: documents.filter(d => d.organism === 'designs').length,
        games: documents.filter(d => d.organism === 'games').length
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
    
    document.getElementById('stats').innerHTML = statsHtml;
}

// Actualizar filtro de años
function updateYearFilter() {
    const years = [...new Set(documents.map(d => {
        return new Date(d.date * 1000).getFullYear();
    }))];
    years.sort((a, b) => b - a);
    
    const select = document.getElementById('yearFilter');
    select.innerHTML = '<option value="">Todos los años</option>' +
        years.map(year => `<option value="${year}">${year}</option>`).join('');
}

// Actualizar grid de documentos
function updateDocumentsGrid() {
    const grid = document.getElementById('documentsGrid');
    
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
    if (lastDoc) {
        document.getElementById('lastUpdate').textContent = `Actualizado: ${formatDate(lastDoc.date)}`;
    }
}

// Mostrar documento
function showDocument(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    
    document.getElementById('modalTitle').textContent = doc.title;
    
    let content = `
        <div class="document-viewer">
            <div class="doc-metadata">
                <p><strong>Organismo:</strong> ${getOrganismLabel(doc.organism)}</p>
                <p><strong>Tipo:</strong> ${getTypeLabel(doc.type)}</p>
                <p><strong>Referencia:</strong> ${escapeHtml(doc.reference || 'N/A')}</p>
                <p><strong>Fecha:</strong> ${formatDate(doc.date)}</p>
                <p><strong>Versión:</strong> ${doc.version || 1}</p>
            </div>
            <div class="doc-content">
                <h3>Contenido</h3>
                <pre>${escapeHtml(doc.content || 'Sin contenido')}</pre>
            </div>
        </div>
    `;
    
    document.getElementById('modalBody').innerHTML = content;
    
    // Añadir botón de historial si hay versiones
    if (doc.versions && doc.versions.length > 0) {
        document.getElementById('modalFooter').innerHTML = `
            <button class="btn-secondary" onclick="showVersionHistory('${docId}')">
                <i class="fas fa-history"></i>
                Ver historial (${doc.versions.length} versiones)
            </button>
        `;
    } else {
        document.getElementById('modalFooter').innerHTML = '';
    }
    
    document.getElementById('documentModal').classList.add('active');
}

// Mostrar historial de versiones
function showVersionHistory(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc || !doc.versions) return;
    
    const versions = [...doc.versions].sort((a, b) => b.date - a.date);
    
    let html = '<div class="versions-list">';
    
    // Versión actual
    html += `
        <div class="version-item current">
            <div class="version-header">
                <span class="version-badge current">Actual v${doc.version}</span>
                <span class="version-date">${formatDate(doc.date)}</span>
            </div>
            <div class="version-changes">
                <strong>Cambios:</strong> Versión actual
            </div>
        </div>
    `;
    
    // Versiones anteriores
    versions.forEach(version => {
        html += `
            <div class="version-item">
                <div class="version-header">
                    <span class="version-badge">v${version.version}</span>
                    <span class="version-date">${formatDate(version.date)}</span>
                    <span class="version-author">${escapeHtml(version.author || 'Sistema')}</span>
                </div>
                <div class="version-changes">
                    <strong>Cambios:</strong> ${escapeHtml(version.changes || 'Sin descripción')}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    document.getElementById('versionModalBody').innerHTML = html;
    document.getElementById('versionModal').classList.add('active');
}

// Utilidades
function showError(message) {
    document.getElementById('documentsGrid').innerHTML = `
        <div class="loading">
            <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
            <p>${message}</p>
        </div>
    `;
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
        'bo': 'B.O.',
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
