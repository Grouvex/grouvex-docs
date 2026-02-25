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
        // Detectar si el documento tiene estructura semántica
        const hasStructure = doc.structure && Array.isArray(doc.structure) && doc.structure.length > 0;
        
        return `
        <div class="doc-card" onclick="showDocument('${doc.id}')">
            <div class="doc-badges">
                <span class="doc-organism ${doc.organism}">${getOrganismLabel(doc.organism)}</span>
                <span class="doc-type ${doc.type}">${getTypeLabel(doc.type)}</span>
                ${hasStructure ? '<span class="doc-feature"><i class="fas fa-code"></i> Estructurado</span>' : ''}
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
// RENDERIZADO BASADO EN ESTRUCTURA SEMÁNTICA DEL JSON
// ============================================

/**
 * Renderiza el contenido del documento basado en su estructura semántica
 * @param {Object} doc - El documento completo
 * @returns {string} HTML renderizado
 */
function renderStructuredDocument(doc) {
    if (!doc.structure || !Array.isArray(doc.structure) || doc.structure.length === 0) {
        // Si no hay estructura, usar el contenido tradicional
        return renderLegacyContent(doc.content || '');
    }
    
    let html = '';
    
    // Procesar cada elemento de la estructura
    doc.structure.forEach((element, index) => {
        switch (element.type) {
            case 'h1':
            case 'titulo':
            case 'title':
                html += renderTitulo(element);
                break;
                
            case 'h2':
            case 'capitulo':
            case 'chapter':
                html += renderCapitulo(element);
                break;
                
            case 'h3':
            case 'seccion':
            case 'section':
                html += renderSeccion(element);
                break;
                
            case 'h4':
            case 'articulo':
            case 'article':
                html += renderArticulo(element);
                break;
                
            case 'disposicion':
            case 'disposition':
                html += renderDisposicion(element);
                break;
                
            case 'edicto':
            case 'edict':
                html += renderEdicto(element);
                break;
                
            case 'sumario':
            case 'summary':
                html += renderSumario(element);
                break;
                
            case 'lista':
            case 'list':
                html += renderLista(element);
                break;
                
            case 'p':
            case 'parrafo':
            case 'paragraph':
                html += renderParrafo(element);
                break;
                
            case 'metadata':
            case 'metadatos':
                // No renderizar aquí, se maneja aparte
                break;
                
            default:
                // Tipo desconocido, tratar como párrafo
                html += renderParrafo(element);
        }
    });
    
    return html;
}

/**
 * Renderiza un título (h1)
 */
function renderTitulo(element) {
    const contenido = element.content || element.text || '';
    const numero = element.numero || '';
    const clase = element.class || '';
    
    return `
        <h1 class="documento-titulo-principal ${clase}">
            ${numero ? `<span class="titulo-numero">${escapeHtml(numero)}</span>` : ''}
            <span class="titulo-texto">${escapeHtml(contenido)}</span>
        </h1>
    `;
}

/**
 * Renderiza un capítulo (h2)
 */
function renderCapitulo(element) {
    const contenido = element.content || element.text || '';
    const numero = element.numero || '';
    const clase = element.class || '';
    
    return `
        <h2 class="documento-capitulo ${clase}">
            ${numero ? `<span class="capitulo-numero">Capítulo ${escapeHtml(numero)}</span>` : ''}
            ${contenido ? `<span class="capitulo-texto">${escapeHtml(contenido)}</span>` : ''}
        </h2>
    `;
}

/**
 * Renderiza una sección (h3)
 */
function renderSeccion(element) {
    const contenido = element.content || element.text || '';
    const numero = element.numero || '';
    const clase = element.class || '';
    
    return `
        <h3 class="documento-seccion ${clase}">
            ${numero ? `<span class="seccion-numero">Sección ${escapeHtml(numero)}</span>` : ''}
            ${contenido ? `<span class="seccion-texto">${escapeHtml(contenido)}</span>` : ''}
        </h3>
    `;
}

/**
 * Renderiza un artículo (h4)
 */
function renderArticulo(element) {
    const contenido = element.content || element.text || '';
    const numero = element.numero || '';
    const clase = element.class || '';
    
    return `
        <div class="documento-articulo ${clase}">
            ${numero ? `<span class="articulo-numero">Artículo ${escapeHtml(numero)}</span>` : ''}
            ${contenido ? `<span class="articulo-texto">${escapeHtml(contenido)}</span>` : ''}
        </div>
    `;
}

/**
 * Renderiza una disposición
 */
function renderDisposicion(element) {
    const contenido = element.content || element.text || '';
    const referencia = element.referencia || element.reference || '';
    const clase = element.class || '';
    const icono = element.icon || 'fa-gavel';
    
    return `
        <div class="documento-disposicion ${clase}">
            <i class="fas ${icono}"></i>
            ${referencia ? `<span class="disposicion-referencia">${escapeHtml(referencia)}</span>` : ''}
            <span class="disposicion-texto">${escapeHtml(contenido)}</span>
        </div>
    `;
}

/**
 * Renderiza un edicto
 */
function renderEdicto(element) {
    const contenido = element.content || element.text || '';
    const referencia = element.referencia || element.reference || '';
    const clase = element.class || '';
    const icono = element.icon || 'fa-scroll';
    
    return `
        <div class="documento-edicto ${clase}">
            <i class="fas ${icono}"></i>
            ${referencia ? `<span class="edicto-referencia">${escapeHtml(referencia)}</span>` : ''}
            <span class="edicto-texto">${escapeHtml(contenido)}</span>
        </div>
    `;
}

/**
 * Renderiza un sumario con enlaces
 */
function renderSumario(element) {
    const items = element.items || element.contenido || [];
    const titulo = element.titulo || 'SUMARIO';
    const clase = element.class || '';
    
    let itemsHtml = '';
    
    if (Array.isArray(items)) {
        items.forEach((item, index) => {
            const itemTexto = item.texto || item.content || item;
            const itemId = item.id || `sumario-item-${index}`;
            const itemRef = item.referencia || item.reference || '';
            
            itemsHtml += `
                <a href="#${itemId}" class="sumario-enlace" onclick="event.preventDefault(); navigateToSection('${itemId}')">
                    <i class="fas fa-chevron-right"></i>
                    ${itemRef ? `<span class="item-referencia">${escapeHtml(itemRef)}</span>` : ''}
                    <span class="item-texto">${escapeHtml(itemTexto)}</span>
                </a>
            `;
        });
    }
    
    return `
        <div class="sumario-container ${clase}">
            <div class="sumario-header">📋 ${escapeHtml(titulo)}</div>
            <div class="sumario-lista">
                ${itemsHtml || '<div class="sumario-item-simple">Sin elementos</div>'}
            </div>
        </div>
    `;
}

/**
 * Renderiza una lista
 */
function renderLista(element) {
    const items = element.items || element.contenido || [];
    const tipo = element.tipo || element.type || 'simple';
    const clase = element.class || '';
    
    let listaHtml = '';
    let listaClass = '';
    
    switch (tipo) {
        case 'romana':
        case 'romano':
        case 'roman':
            listaClass = 'lista-romana';
            break;
        case 'numerada':
        case 'numerico':
        case 'numeric':
            listaClass = 'lista-numerada';
            break;
        case 'alfabetica':
        case 'alfabetico':
        case 'alpha':
            listaClass = 'lista-alfabetica';
            break;
        default:
            listaClass = 'lista-simple';
    }
    
    if (Array.isArray(items)) {
        items.forEach((item, index) => {
            const itemTexto = item.texto || item.content || item;
            const itemNumero = item.numero || (tipo === 'romana' ? toRoman(index + 1) : (tipo === 'numerada' ? (index + 1) : (tipo === 'alfabetica' ? String.fromCharCode(65 + index) : '')));
            
            listaHtml += `
                <div class="lista-item ${listaClass}-item">
                    ${itemNumero ? `<span class="item-numero">${escapeHtml(itemNumero)}.</span>` : '<i class="fas fa-circle bullet-point"></i>'}
                    <span class="item-texto">${escapeHtml(itemTexto)}</span>
                </div>
            `;
        });
    }
    
    return `
        <div class="${listaClass} ${clase}">
            ${element.titulo ? `<div class="lista-titulo">${escapeHtml(element.titulo)}</div>` : ''}
            ${listaHtml}
        </div>
    `;
}

/**
 * Renderiza un párrafo
 */
function renderParrafo(element) {
    const contenido = element.content || element.text || '';
    const clase = element.class || '';
    const alineacion = element.alineacion || element.align || 'left';
    
    return `
        <p class="documento-parrafo ${clase}" style="text-align: ${alineacion}">
            ${escapeHtml(contenido)}
        </p>
    `;
}

/**
 * Renderizado legacy para contenido sin estructura (mantenido por compatibilidad)
 */
function renderLegacyContent(content) {
    if (!content) return '<p class="empty-content">Sin contenido</p>';
    
    const lines = content.split('\n');
    let html = '';
    
    lines.forEach(line => {
        line = line.trim();
        if (line === '') {
            html += '<br>';
        } else {
            html += `<p class="documento-parrafo">${escapeHtml(line)}</p>`;
        }
    });
    
    return html;
}

/**
 * Convierte un número a números romanos
 */
function toRoman(num) {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return romanNumerals[num - 1] || num.toString();
}

/**
 * Función principal para mostrar documento con estructura semántica
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
        
        // Renderizar el contenido basado en la estructura
        const contenidoHTML = renderStructuredDocument(doc);
        
        // Renderizar metadatos si existen en la estructura
        let metadataHTML = '';
        if (doc.structure) {
            const metadataElement = doc.structure.find(el => el.type === 'metadata' || el.type === 'metadatos');
            if (metadataElement && metadataElement.items) {
                metadataHTML = renderMetadataGrid(metadataElement.items);
            }
        }
        
        // Si no hay metadatos en la estructura, usar los del documento
        if (!metadataHTML) {
            metadataHTML = `
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
            `;
        }
        
        // Tags
        const tagsHTML = doc.tags && doc.tags.length ? `
            <div class="tags-container">
                <span class="metadata-label"><i class="fas fa-tags"></i> Tags:</span>
                <div class="tags-list">
                    ${doc.tags.map(t => `<span class="badge-tag">${escapeHtml(t)}</span>`).join(' ')}
                </div>
            </div>
        ` : '';
        
        // Construir el HTML completo
        const documentoHTML = `
            <div class="documento-container">
                <!-- Metadatos del documento -->
                <div class="doc-metadata tarjeta-info">
                    ${metadataHTML}
                    ${tagsHTML}
                </div>
                
                <!-- Contenido del documento con estructura semántica -->
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
                <button class="btn-secondary" onclick="scrollToModalTop()">
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

/**
 * Renderiza una cuadrícula de metadatos
 */
function renderMetadataGrid(items) {
    if (!Array.isArray(items)) return '';
    
    let html = '<div class="metadata-grid">';
    
    items.forEach(item => {
        const label = item.label || item.nombre || '';
        const value = item.value || item.valor || '';
        const icono = item.icon || item.icono || getIconForLabel(label);
        
        html += `
            <div class="metadata-item">
                <span class="metadata-label"><i class="fas ${icono}"></i> ${escapeHtml(label)}:</span>
                <span class="metadata-value">${escapeHtml(value)}</span>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

/**
 * Obtiene un icono basado en la etiqueta del metadato
 */
function getIconForLabel(label) {
    const labelLower = label.toLowerCase();
    if (labelLower.includes('referencia')) return 'fa-hashtag';
    if (labelLower.includes('tipo')) return 'fa-tag';
    if (labelLower.includes('organismo')) return 'fa-building';
    if (labelLower.includes('fecha')) return 'fa-calendar-alt';
    if (labelLower.includes('versión') || labelLower.includes('version')) return 'fa-code-branch';
    if (labelLower.includes('autor')) return 'fa-user';
    if (labelLower.includes('email') || labelLower.includes('correo')) return 'fa-envelope';
    return 'fa-info-circle';
}

// Función para scroll al inicio del modal
function scrollToModalTop() {
    const modalBody = document.getElementById('modalBody');
    if (modalBody) {
        modalBody.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Función para navegar a una sección
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
