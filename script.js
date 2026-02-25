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

// ============================================
// FUNCIONES DE RENDERIZADO HTML SEMÁNTICO
// ============================================

/**
 * Convierte texto plano con estructura de documento legal a HTML semántico
 */
function renderDocumentContent(content) {
    if (!content) return '<p class="empty-content">Sin contenido</p>';
    
    // Dividir el contenido en líneas
    const lines = content.split('\n');
    let html = '';
    let inSumario = false;
    let inLista = false;
    let listaItems = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (line === '') {
            // Línea vacía - cerrar listas si es necesario
            if (inLista) {
                html += renderListaItems(listaItems);
                listaItems = [];
                inLista = false;
            }
            html += '<br>';
            continue;
        }
        
        // Detectar SUMARIO
        if (line === 'SUMARIO') {
            if (inLista) {
                html += renderListaItems(listaItems);
                listaItems = [];
                inLista = false;
            }
            html += '<div class="sumario-header">📋 SUMARIO</div>';
            inSumario = true;
            continue;
        }
        
        // Detectar TÍTULOS (TÍTULO I, TÍTULO II, etc.)
        if (line.match(/^T[ÍI]TULO\s+[IVXLC]+\.?\s*(.*)/i)) {
            if (inLista) {
                html += renderListaItems(listaItems);
                listaItems = [];
                inLista = false;
            }
            const tituloNum = line.match(/^T[ÍI]TULO\s+([IVXLC]+)/i);
            const tituloTexto = line.replace(/^T[ÍI]TULO\s+[IVXLC]+\.?\s*/, '');
            html += `<h1 class="documento-titulo-principal">`;
            html += `<span class="titulo-numero">TÍTULO ${tituloNum ? tituloNum[1] : ''}</span>`;
            if (tituloTexto) {
                html += `<span class="titulo-texto">${escapeHtml(tituloTexto)}</span>`;
            }
            html += `</h1>`;
            inSumario = false;
            continue;
        }
        
        // Detectar CAPÍTULOS
        if (line.match(/^Cap[íi]tulo\s+[IVXLC]+\.?\s*(.*)/i)) {
            if (inLista) {
                html += renderListaItems(listaItems);
                listaItems = [];
                inLista = false;
            }
            const capNum = line.match(/^Cap[íi]tulo\s+([IVXLC]+)/i);
            const capTexto = line.replace(/^Cap[íi]tulo\s+[IVXLC]+\.?\s*/, '');
            html += `<h2 class="documento-capitulo">`;
            html += `<span class="capitulo-numero">Capítulo ${capNum ? capNum[1] : ''}</span>`;
            if (capTexto) {
                html += `<span class="capitulo-texto">${escapeHtml(capTexto)}</span>`;
            }
            html += `</h2>`;
            inSumario = false;
            continue;
        }
        
        // Detectar SECCIONES
        if (line.match(/^Secci[óo]n\s+[IVXLC]+\.?\s*(.*)/i)) {
            if (inLista) {
                html += renderListaItems(listaItems);
                listaItems = [];
                inLista = false;
            }
            const secNum = line.match(/^Secci[óo]n\s+([IVXLC]+)/i);
            const secTexto = line.replace(/^Secci[óo]n\s+[IVXLC]+\.?\s*/, '');
            html += `<h3 class="documento-seccion">`;
            html += `<span class="seccion-numero">Sección ${secNum ? secNum[1] : ''}</span>`;
            if (secTexto) {
                html += `<span class="seccion-texto">${escapeHtml(secTexto)}</span>`;
            }
            html += `</h3>`;
            inSumario = false;
            continue;
        }
        
        // Detectar ARTÍCULOS
        if (line.match(/^Art[íi]culo\s+\d+\.?\s*(.*)/i)) {
            if (inLista) {
                html += renderListaItems(listaItems);
                listaItems = [];
                inLista = false;
            }
            const artNum = line.match(/^Art[íi]culo\s+(\d+)/i);
            const artTexto = line.replace(/^Art[íi]culo\s+\d+\.?\s*/, '');
            html += `<div class="documento-articulo">`;
            html += `<span class="articulo-numero">Artículo ${artNum ? artNum[1] : ''}</span>`;
            if (artTexto) {
                html += `<span class="articulo-texto">${escapeHtml(artTexto)}</span>`;
            }
            html += `</div>`;
            inSumario = false;
            continue;
        }
        
        // Detectar DISPOSICIONES
        if (line.match(/^DISPOSICI[ÓO]N\s+BOGS\/\d{4}\/\d{3}/i)) {
            if (inLista) {
                html += renderListaItems(listaItems);
                listaItems = [];
                inLista = false;
            }
            html += `<div class="documento-disposicion"><i class="fas fa-gavel"></i> ${escapeHtml(line)}</div>`;
            inSumario = false;
            continue;
        }
        
        // Detectar EDICTOS
        if (line.match(/^Edicto\s+BOGS\/\d{4}\/\d{3}/i)) {
            if (inLista) {
                html += renderListaItems(listaItems);
                listaItems = [];
                inLista = false;
            }
            html += `<div class="documento-edicto"><i class="fas fa-scroll"></i> ${escapeHtml(line)}</div>`;
            inSumario = false;
            continue;
        }
        
        // Detectar elementos del sumario (puntos con números romanos o números)
        if (inSumario) {
            if (line.match(/^[IVXLC]+\.\s+/) || line.match(/^\d+\.\s+/)) {
                html += `<div class="sumario-item"><i class="fas fa-chevron-right"></i> ${escapeHtml(line)}</div>`;
            } else {
                html += `<div class="sumario-item-simple">${escapeHtml(line)}</div>`;
            }
            continue;
        }
        
        // Detectar listas numeradas (I., II., III. o 1., 2., 3.)
        if (line.match(/^[IVXLC]+\.\s+/) || line.match(/^\d+\.\s+/)) {
            listaItems.push(line);
            inLista = true;
            continue;
        }
        
        // Detectar puntos con letras (A., B., C.)
        if (line.match(/^[A-Z]\.\s+/)) {
            if (!inLista) {
                listaItems = [];
                inLista = true;
            }
            listaItems.push(line);
            continue;
        }
        
        // Si estábamos en una lista y la línea no es un item de lista, cerramos la lista
        if (inLista) {
            html += renderListaItems(listaItems);
            listaItems = [];
            inLista = false;
        }
        
        // Línea normal (párrafo)
        html += `<p class="documento-parrafo">${escapeHtml(line)}</p>`;
    }
    
    // Cerrar lista si quedó abierta
    if (inLista) {
        html += renderListaItems(listaItems);
    }
    
    return html;
}

/**
 * Renderiza una lista de items con formato adecuado
 */
function renderListaItems(items) {
    if (!items.length) return '';
    
    // Determinar el tipo de lista
    const firstItem = items[0];
    let listaHtml = '';
    
    if (firstItem.match(/^[IVXLC]+\.\s+/)) {
        // Lista con números romanos
        listaHtml = '<div class="lista-romana">';
        items.forEach(item => {
            const match = item.match(/^([IVXLC]+)\.\s+(.*)/);
            if (match) {
                listaHtml += `<div class="lista-item-romano"><span class="item-numero">${match[1]}.</span> <span class="item-texto">${escapeHtml(match[2])}</span></div>`;
            } else {
                listaHtml += `<div class="lista-item-romano">${escapeHtml(item)}</div>`;
            }
        });
        listaHtml += '</div>';
    }
    else if (firstItem.match(/^\d+\.\s+/)) {
        // Lista numerada
        listaHtml = '<div class="lista-numerada">';
        items.forEach(item => {
            const match = item.match(/^(\d+)\.\s+(.*)/);
            if (match) {
                listaHtml += `<div class="lista-item-numerado"><span class="item-numero">${match[1]}.</span> <span class="item-texto">${escapeHtml(match[2])}</span></div>`;
            } else {
                listaHtml += `<div class="lista-item-numerado">${escapeHtml(item)}</div>`;
            }
        });
        listaHtml += '</div>';
    }
    else if (firstItem.match(/^[A-Z]\.\s+/)) {
        // Lista alfabética
        listaHtml = '<div class="lista-alfabetica">';
        items.forEach(item => {
            const match = item.match(/^([A-Z])\.\s+(.*)/);
            if (match) {
                listaHtml += `<div class="lista-item-alfabetico"><span class="item-letra">${match[1]}.</span> <span class="item-texto">${escapeHtml(match[2])}</span></div>`;
            } else {
                listaHtml += `<div class="lista-item-alfabetico">${escapeHtml(item)}</div>`;
            }
        });
        listaHtml += '</div>';
    }
    else {
        // Lista simple
        listaHtml = '<div class="lista-simple">';
        items.forEach(item => {
            listaHtml += `<div class="lista-item-simple"><i class="fas fa-circle bullet-point"></i> ${escapeHtml(item)}</div>`;
        });
        listaHtml += '</div>';
    }
    
    return listaHtml;
}

/**
 * Función principal para mostrar documento con formato HTML
 */
function showDocument(docId) {
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
        
        // Renderizar el contenido con formato HTML
        const contenidoHTML = renderDocumentContent(doc.content || '');
        
        // Construir el HTML completo del documento
        const documentoHTML = `
            <div class="documento-container">
                <!-- Metadatos del documento -->
                <div class="doc-metadata tarjeta-info">
                    <div class="metadata-grid">
                        <div class="metadata-item">
                            <span class="metadata-label"><i class="fas fa-hashtag"></i> Referencia:</span>
                            <span class="metadata-value">${escapeHtml(doc.reference || 'N/A')}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="metadata-label"><i class="fas fa-tag"></i> Tipo:</span>
                            <span class="metadata-value">${getTypeLabel(doc.type)}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="metadata-label"><i class="fas fa-building"></i> Organismo:</span>
                            <span class="metadata-value">${getOrganismLabel(doc.organism)}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="metadata-label"><i class="fas fa-calendar-alt"></i> Fecha:</span>
                            <span class="metadata-value">${formatDate(doc.date)}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="metadata-label"><i class="fas fa-code-branch"></i> Versión:</span>
                            <span class="metadata-value">${doc.version || 1}</span>
                        </div>
                    </div>
                    ${doc.tags && doc.tags.length ? `
                        <div class="tags-container">
                            <span class="metadata-label"><i class="fas fa-tags"></i> Tags:</span>
                            <div class="tags-list">
                                ${doc.tags.map(t => `<span class="badge-tag">${escapeHtml(t)}</span>`).join(' ')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Contenido del documento con formato semántico -->
                <div class="documento-contenido">
                    <div class="contenido-header">
                        <i class="fas fa-file-alt"></i> Contenido
                    </div>
                    <div class="contenido-body">
                        ${contenidoHTML}
                    </div>
                </div>
            </div>
        `;
        
        if (modalBody) modalBody.innerHTML = documentoHTML;
        
        // Configurar el footer
        if (modalFooter) {
            let footerButtons = '';
            
            footerButtons += `
                <button class="btn-secondary" onclick="window.scrollToModalTop()">
                    <i class="fas fa-arrow-up"></i>
                    Volver arriba
                </button>
            `;
            
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

// Función para scroll al inicio del modal
function scrollToModalTop() {
    const modalBody = document.getElementById('modalBody');
    if (modalBody) {
        modalBody.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Función para parsear el SUMARIO (mantenida por compatibilidad)
function parseSumario(content) {
    return { tieneSumario: content && content.includes('SUMARIO') };
}

// Función para navegar a una sección (mantenida por compatibilidad)
function navigateToSection(seccionId) {
    const element = document.getElementById(seccionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.classList.add('seccion-resaltada');
        setTimeout(() => {
            element.classList.remove('seccion-resaltada');
        }, 2000);
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
window.scrollToModalTop = scrollToModalTop;
