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
    loadDocumentVersions();
    setupEventListeners();
});

// Cargar datos iniciales DESDE JSON
async function loadData() {
    try {
        showLoading();
        
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
        if (currentFilters.organism !== 'all' && doc.organism !== currentFilters.organism) {
            return false;
        }
        
        if (currentFilters.search) {
            const searchTerm = currentFilters.search.toLowerCase();
            const matchesSearch = 
                (doc.title || '').toLowerCase().includes(searchTerm) ||
                (doc.description || '').toLowerCase().includes(searchTerm) ||
                (doc.reference || '').toLowerCase().includes(searchTerm) ||
                (doc.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
            
            if (!matchesSearch) return false;
        }
        
        if (currentFilters.type && doc.type !== currentFilters.type) {
            return false;
        }
        
        if (currentFilters.year) {
            const docYear = new Date(doc.date * 1000).getFullYear().toString();
            if (docYear !== currentFilters.year) return false;
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
    
    if (currentValue) select.value = currentValue;
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
    
    filteredDocuments.sort((a, b) => b.date - a.date);
    
    grid.innerHTML = filteredDocuments.map(doc => {
        // Detectar si el documento tiene SUMARIO
        const hasSumario = doc.content && doc.content.includes('SUMARIO');
        
        return `
        <div class="doc-card" onclick="showDocument('${doc.id}')">
            <div class="doc-badges">
                <span class="doc-organism ${doc.organism}">${getOrganismLabel(doc.organism)}</span>
                <span class="doc-type ${doc.type}">${getTypeLabel(doc.type)}</span>
                ${hasSumario ? '<span class="doc-feature"><i class="fas fa-list"></i> Sumario</span>' : ''}
            </div>
            <h3 class="doc-title">${escapeHtml(doc.title)}</h3>
            <div class="doc-reference">${escapeHtml(doc.reference || 'Sin referencia')}</div>
            <p class="doc-description">${escapeHtml(doc.description || 'Sin descripción')}</p>
            <div class="doc-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(doc.date)}</span>
                <span class="doc-version">v${doc.version || 1}</span>
            </div>
        </div>
    `}).join('');
}

// Actualizar footer
function updateFooter() {
    const lastDoc = [...documents].sort((a, b) => b.date - a.date)[0];
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement && lastDoc) {
        lastUpdateElement.textContent = `Actualizado: ${formatDate(lastDoc.date)}`;
    }
}

// Función para parsear el SUMARIO y generar enlaces
function parseSumario(content) {
    if (!content || !content.includes('SUMARIO')) {
        return { tieneSumario: false, secciones: [], contenidoHTML: escapeHtml(content) };
    }
    
    const lines = content.split('\n');
    let secciones = [];
    let currentSeccion = null;
    let isSumario = false;
    let sumarioEndIndex = -1;
    
    // Primero, identificar el bloque del SUMARIO
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === 'SUMARIO') {
            isSumario = true;
            continue;
        }
        
        if (isSumario) {
            // Detectar patrones de secciones (TÍTULO, Capítulo, Artículo, Sección)
            if (line.match(/^(TÍTULO|TITULO|Capítulo|SECCIÓN|SECCION|Artículo)/i)) {
                // Extraer el texto completo de la línea
                const match = line.match(/^([A-ZÁÉÍÓÚÑ\s]+\.?)\s*(.*)/i);
                if (match) {
                    const titulo = match[1].trim();
                    const descripcion = match[2].trim();
                    
                    // Crear un ID para la sección
                    const seccionId = 'seccion-' + i + '-' + Date.now();
                    
                    secciones.push({
                        id: seccionId,
                        titulo: titulo,
                        descripcion: descripcion || titulo,
                        linea: i
                    });
                }
            }
            
            // Si encontramos una línea en blanco después de capturar secciones, termina el sumario
            if (line === '' && secciones.length > 0) {
                sumarioEndIndex = i;
                break;
            }
        }
    }
    
    // Si no se encontraron secciones con el patrón anterior, intentar con un enfoque más simple
    if (secciones.length === 0 && isSumario) {
        const sumarioLines = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('SUMARIO')) {
                for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
                    const line = lines[j].trim();
                    if (line && !line.match(/^\s*$/)) {
                        sumarioLines.push(line);
                    }
                    if (line === '' && sumarioLines.length > 0) break;
                }
                break;
            }
        }
        
        sumarioLines.forEach((line, index) => {
            secciones.push({
                id: 'seccion-simple-' + index,
                titulo: line,
                descripcion: line,
                linea: index
            });
        });
    }
    
    // Procesar el contenido para generar HTML con enlaces
    let contenidoHTML = '';
    let enProcesamientoSumario = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('SUMARIO')) {
            contenidoHTML += '<div class="sumario-header">📋 SUMARIO</div>\n';
            contenidoHTML += '<div class="sumario-lista">\n';
            
            // Añadir enlaces a las secciones
            secciones.forEach(seccion => {
                const tituloCorto = seccion.titulo.length > 50 ? 
                    seccion.titulo.substring(0, 50) + '...' : seccion.titulo;
                
                contenidoHTML += `<a href="#${seccion.id}" class="sumario-enlace" onclick="event.preventDefault(); navigateToSection('${seccion.id}')">
                    <i class="fas fa-chevron-right"></i> ${escapeHtml(tituloCorto)}
                </a>\n`;
            });
            
            contenidoHTML += '</div>\n';
            enProcesamientoSumario = true;
            continue;
        }
        
        // Saltar líneas en blanco después del sumario
        if (enProcesamientoSumario && line.trim() === '' && secciones.length > 0) {
            enProcesamientoSumario = false;
            contenidoHTML += '<div class="sumario-separador"></div>\n';
            continue;
        }
        
        // Procesar el resto del contenido
        if (!enProcesamientoSumario) {
            // Verificar si esta línea es una sección del sumario
            const seccionEncontrada = secciones.find(s => s.linea === i);
            
            if (seccionEncontrada) {
                // Esta línea es un título de sección
                contenidoHTML += `<div id="${seccionEncontrada.id}" class="seccion-titulo">`;
                contenidoHTML += `<i class="fas fa-bookmark"></i> ${escapeHtml(line)}`;
                contenidoHTML += ` <a href="#" onclick="scrollToTop()" class="volver-arriba" title="Volver arriba"><i class="fas fa-arrow-up"></i></a>`;
                contenidoHTML += `</div>\n`;
            } else if (line.match(/^(Artículo|DISPOSICIÓN|Capítulo)/i)) {
                // Resaltar artículos y disposiciones
                contenidoHTML += `<div class="articulo-destacado"><i class="fas fa-gavel"></i> ${escapeHtml(line)}</div>\n`;
            } else if (line.trim() === '') {
                contenidoHTML += '<br>\n';
            } else {
                contenidoHTML += escapeHtml(line) + '\n';
            }
        }
    }
    
    return {
        tieneSumario: secciones.length > 0,
        secciones: secciones,
        contenidoHTML: contenidoHTML
    };
}

// Función para navegar a una sección
function navigateToSection(seccionId) {
    const element = document.getElementById(seccionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Resaltar temporalmente la sección
        element.classList.add('seccion-resaltada');
        setTimeout(() => {
            element.classList.remove('seccion-resaltada');
        }, 2000);
    }
}

// Función para volver arriba en el modal
function scrollToTop() {
    const modalBody = document.getElementById('modalBody');
    if (modalBody) {
        modalBody.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Mostrar documento
async function showDocument(docId) {
    try {
        const doc = documents.find(d => d.id === docId);
        if (!doc) return;
        
        // Buscar versiones
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
        
        // Parsear el contenido para manejar SUMARIO
        const contenidoParseado = parseSumario(doc.content || '');
        
        // Determinar si mostrar el contenido simple o con sumario
        let contenidoHTML = '';
        
        if (contenidoParseado.tieneSumario) {
            // Vista mejorada con sumario interactivo
            contenidoHTML = `
                <div class="document-viewer">
                    <div class="doc-metadata tarjeta-info">
                        <div class="metadata-grid">
                            <div><strong>Referencia:</strong> ${escapeHtml(doc.reference || 'N/A')}</div>
                            <div><strong>Tipo:</strong> ${getTypeLabel(doc.type)}</div>
                            <div><strong>Organismo:</strong> ${getOrganismLabel(doc.organism)}</div>
                            <div><strong>Fecha:</strong> ${formatDate(doc.date)}</div>
                            <div><strong>Versión:</strong> ${doc.version || 1}</div>
                        </div>
                        ${doc.tags && doc.tags.length ? `
                            <div class="tags-container">
                                <strong>Tags:</strong> ${doc.tags.map(t => `<span class="badge-tag">${t}</span>`).join(' ')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="doc-contenido-mejorado">
                        <div class="contenido-header">
                            <i class="fas fa-file-alt"></i> Contenido
                        </div>
                        <div class="contenido-body">
                            ${contenidoParseado.contenidoHTML}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Vista simple
            contenidoHTML = `
                <div class="document-viewer">
                    <div class="doc-metadata tarjeta-info">
                        <div class="metadata-grid">
                            <div><strong>Referencia:</strong> ${escapeHtml(doc.reference || 'N/A')}</div>
                            <div><strong>Tipo:</strong> ${getTypeLabel(doc.type)}</div>
                            <div><strong>Organismo:</strong> ${getOrganismLabel(doc.organism)}</div>
                            <div><strong>Fecha:</strong> ${formatDate(doc.date)}</div>
                            <div><strong>Versión:</strong> ${doc.version || 1}</div>
                        </div>
                        ${doc.tags && doc.tags.length ? `
                            <div class="tags-container">
                                <strong>Tags:</strong> ${doc.tags.map(t => `<span class="badge-tag">${t}</span>`).join(' ')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="doc-content">
                        <div class="contenido-header">
                            <i class="fas fa-file-alt"></i> Contenido
                        </div>
                        <pre class="contenido-pre">${escapeHtml(doc.content || 'Sin contenido')}</pre>
                    </div>
                </div>
            `;
        }
        
        if (modalBody) modalBody.innerHTML = contenidoHTML;
        
        // Configurar el footer
        if (modalFooter) {
            let footerButtons = '';
            
            if (contenidoParseado.tieneSumario) {
                footerButtons += `
                    <button class="btn-secondary" onclick="scrollToTop()">
                        <i class="fas fa-arrow-up"></i>
                        Volver arriba
                    </button>
                `;
            }
            
            if (versions.length > 0) {
                footerButtons += `
                    <button class="btn-secondary" onclick="showVersionHistory('${docId}')">
                        <i class="fas fa-history"></i>
                        Ver historial (${versions.length})
                    </button>
                `;
            }
            
            modalFooter.innerHTML = footerButtons;
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
    
    const versions = [];
    if (window.versionsData && window.versionsData.versions) {
        window.versionsData.versions.forEach(v => {
            if (v.data && v.data.id === docId) {
                versions.push(v);
            }
        });
    }
    
    let html = '<div class="versions-list">';
    
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

// Hacer funciones globales para los onclick
window.showDocument = showDocument;
window.closeModal = closeModal;
window.closeVersionModal = closeVersionModal;
window.showVersionHistory = showVersionHistory;
window.navigateToSection = navigateToSection;
window.scrollToTop = scrollToTop;
