let currentChild = null;
let pendingBadges = [];
let networkConfig = { mode: 'auto', serverUrl: '', serverPort: 33445 };
let settings = {
    village: '', date: '', printMode: 'batch', batchSize: 3,
    groups: [
        { minAge: 6, maxAge: 8, name: 'I', color: '#FF6B6B', textColor: '#FFFFFF' },
        { minAge: 9, maxAge: 11, name: 'II', color: '#4ECDC4', textColor: '#FFFFFF' },
        { minAge: 12, maxAge: 14, name: 'III', color: '#FFD93D', textColor: '#000000' },
        { minAge: 15, maxAge: 18, name: 'IV', color: '#95E1D3', textColor: '#000000' }
    ]
};

function closeApp() {
    if (confirm('Закрити програму?')) {
        window.api.closeApp();
    }
}

async function loadNetworkConfig() {
    networkConfig = await window.api.getNetworkConfig();
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadSettings();
    await loadNetworkConfig();
    loadQuickHistory();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('homeDate').value = today;
    
    // Слухати події додавання дітей з сервера
    if (window.api.onChildAdded) {
        window.api.onChildAdded((data) => {
            if (settings.village === data.village && settings.date === data.date) {
                updateTable();
            }
        });
    }
});

// Попередження при закритті тільки якщо є дані
window.addEventListener('beforeunload', function(e) {
    if (settings.village && settings.date) {
        const confirmed = confirm('Ви впевнені, що хочете закрити програму? Рекомендуємо зробити бекап даних перед закриттям.');
        if (!confirmed) {
            e.preventDefault();
            e.returnValue = '';
        }
    }
});

function handleFullNameEnter(event) {
    if (event.key === 'Enter') { event.preventDefault(); document.getElementById('age').focus(); }
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

function goToHome() {
    showPage('homePage'); loadQuickHistory(); document.getElementById('homeVillage').focus();
}

async function loadCamp(village, date) {
    if (!village || !date) return;
    settings.village = village;
    settings.date = date;
    await window.api.saveSettings(settings);
    showPage('registrationPage');
    updateDisplayInfo();
    await updateTable();
}

function goToHistory() {
    showPage('historyPage');
    renderFullHistory();
}

function goToSettings() {
    showPage('settingsPage');
    renderGroupsConfig();
    loadPrintSettings();
}

function goToNetworkSettings() {
    showPage('networkPage');
    loadNetworkPage();
}

async function loadNetworkPage() {
    const config = await window.api.getNetworkConfig();
    networkConfig = config;
    
    // Встановити вибраний режим
    document.querySelector(`input[name="networkMode"][value="${config.mode}"]`).checked = true;
    changeNetworkMode();
    
    // Завантажити IP
    const ip = await window.api.getLocalIp();
    if (document.getElementById('serverIp')) {
        document.getElementById('serverIp').value = ip;
    }
    
    // Встановити збережені налаштування
    if (config.serverPort) document.getElementById('serverPort').value = config.serverPort;
    if (config.serverUrl) {
        const parts = config.serverUrl.split(':');
        if (parts.length === 2) {
            document.getElementById('clientServerIp').value = parts[0].replace('http://', '');
            document.getElementById('clientServerPort').value = parts[1];
        }
    }
    
    // Якщо режим авто - автоматично сканувати при відкритті
    if (config.mode === 'auto') {
        setTimeout(() => scanAndConnect(), 500);
    }
}

function loadPrintSettings() {
    document.getElementById('printMode').value = settings.printMode || 'batch';
    document.getElementById('batchSize').value = settings.batchSize || 3;
    toggleBatchSize();
}

function toggleBatchSize() {
    document.getElementById('batchSizeGroup').style.display =
        document.getElementById('printMode').value === 'batch' ? 'block' : 'none';
}

// ===================== МЕРЕЖЕВІ ФУНКЦІЇ =====================

function changeNetworkMode() {
    const mode = document.querySelector('input[name="networkMode"]:checked').value;
    document.getElementById('autoSettings').style.display = mode === 'auto' ? 'block' : 'none';
    document.getElementById('serverSettings').style.display = mode === 'server' ? 'block' : 'none';
    document.getElementById('clientSettings').style.display = mode === 'client' ? 'block' : 'none';
    
    // Автоматично встановити порт 33445 для сервера
    if (mode === 'server') {
        document.getElementById('serverPort').value = 33445;
    }
    
    // Автоматично встановити порт 33445 для клієнта
    if (mode === 'client') {
        if (!document.getElementById('clientServerPort').value || document.getElementById('clientServerPort').value === '3000') {
            document.getElementById('clientServerPort').value = 33445;
        }
    }
}

async function scanAndConnect() {
    const statusDiv = document.getElementById('autoStatus');
    statusDiv.style.background = '#d1ecf1';
    statusDiv.style.color = '#0c5460';
    statusDiv.innerHTML = '⏳ Сканування мережі...';
    
    const result = await window.api.scanNetwork(33445);
    
    if (result.success && result.servers.length > 0) {
        const serverIp = result.servers[0];
        statusDiv.style.background = '#d4edda';
        statusDiv.style.color = '#155724';
        statusDiv.innerHTML = `✅ Знайдено сервер: <strong>${serverIp}:33445</strong><br>Працюю як клієнт.`;
        
        // Автоматично налаштувати як клієнт
        networkConfig.mode = 'client';
        networkConfig.serverUrl = `http://${serverIp}:33445`;
        await window.api.saveNetworkConfig(networkConfig);
    } else {
        statusDiv.style.background = '#fff3cd';
        statusDiv.style.color = '#856404';
        statusDiv.innerHTML = '⚠️ Сервер не знайдено. Працюю автономно.<br>Ви можете стати сервером натиснувши "Стати сервером".';
        
        networkConfig.mode = 'standalone';
        networkConfig.serverUrl = '';
        await window.api.saveNetworkConfig(networkConfig);
    }
}

async function becomeServer() {
    const result = await window.api.startServer(33445);
    const statusDiv = document.getElementById('autoStatus');
    
    if (result.success) {
        const ip = await window.api.getLocalIp();
        statusDiv.style.background = '#d4edda';
        statusDiv.style.color = '#155724';
        statusDiv.innerHTML = `✅ Ви стали сервером!<br>IP адреса: <strong>${ip}:33445</strong><br>Інші ноутбуки можуть підключатися автоматично.`;
        
        networkConfig.mode = 'server';
        networkConfig.serverPort = 33445;
        await window.api.saveNetworkConfig(networkConfig);
    } else {
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.innerHTML = `❌ Помилка: ${result.error}`;
    }
}

async function startServerMode() {
    const port = parseInt(document.getElementById('serverPort').value) || 3000;
    const result = await window.api.startServer(port);
    const statusDiv = document.getElementById('serverStatus');
    
    if (result.success) {
        const ip = await window.api.getLocalIp();
        statusDiv.style.background = '#d4edda';
        statusDiv.style.color = '#155724';
        statusDiv.innerHTML = `✅ Сервер запущено!<br>Клієнти можуть підключатися до: <strong>${ip}:${port}</strong>`;
        
        networkConfig.mode = 'server';
        networkConfig.serverPort = port;
        await window.api.saveNetworkConfig(networkConfig);
    } else {
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.innerHTML = `❌ Помилка запуску: ${result.error}`;
    }
}

async function stopServerMode() {
    await window.api.stopServer();
    const statusDiv = document.getElementById('serverStatus');
    statusDiv.style.background = '#fff3cd';
    statusDiv.style.color = '#856404';
    statusDiv.innerHTML = '⚠️ Сервер зупинено';
}

async function testServerConnection() {
    const ip = document.getElementById('clientServerIp').value.trim();
    const port = document.getElementById('clientServerPort').value;
    const statusDiv = document.getElementById('clientStatus');
    
    if (!ip) {
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.innerHTML = '❌ Введіть IP адресу сервера';
        return;
    }
    
    statusDiv.style.background = '#d1ecf1';
    statusDiv.style.color = '#0c5460';
    statusDiv.innerHTML = '⏳ Перевірка з\'єднання...';
    
    try {
        const response = await fetch(`http://${ip}:${port}/api/status`);
        const data = await response.json();
        
        if (data.status === 'ok') {
            statusDiv.style.background = '#d4edda';
            statusDiv.style.color = '#155724';
            statusDiv.innerHTML = `✅ З'єднання встановлено! Сервер працює.`;
        } else {
            throw new Error('Invalid response');
        }
    } catch (e) {
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.innerHTML = `❌ Не вдалося підключитися до сервера.<br>Переконайтеся що:<br>1. Сервер запущено<br>2. IP адреса правильна<br>3. Ноутбуки в одній мережі`;
    }
}

async function saveClientMode() {
    const ip = document.getElementById('clientServerIp').value.trim();
    const port = document.getElementById('clientServerPort').value;
    
    if (!ip) {
        alert('Введіть IP адресу сервера');
        return;
    }
    
    networkConfig.mode = 'client';
    networkConfig.serverUrl = `http://${ip}:${port}`;
    await window.api.saveNetworkConfig(networkConfig);
    
    const statusDiv = document.getElementById('clientStatus');
    statusDiv.style.background = '#d4edda';
    statusDiv.style.color = '#155724';
    statusDiv.innerHTML = '✅ Налаштування збережено! Дані будуть синхронізуватися з сервером.';
}

// ===================== НАЛАШТУВАННЯ =====================

async function loadSettings() {
    const saved = await window.api.getSettings();
    if (saved) settings = Object.assign(settings, saved);
}

let saveTimer = null;
function autoSaveSettings() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveGroupSettingsSilent, 300);
}

async function saveGroupSettingsSilent() {
    settings.printMode = document.getElementById('printMode').value;
    settings.batchSize = parseInt(document.getElementById('batchSize').value) || 3;
    const els = document.querySelectorAll('.group-config');
    settings.groups = [];
    els.forEach((el, i) => {
        const min = parseInt(el.querySelector(`#minAge${i}`).value);
        const max = parseInt(el.querySelector(`#maxAge${i}`).value);
        const name = el.querySelector(`#groupName${i}`).value;
        const color = el.querySelector(`#groupColor${i}`).value;
        const textColor = el.querySelector(`#groupTextColor${i}`).value;
        if (min && max && name) settings.groups.push({ minAge: min, maxAge: max, name, color, textColor });
    });
    settings.groups.sort((a, b) => a.minAge - b.minAge);
    await window.api.saveSettings(settings);
}

async function saveGroupSettings() {
    await saveGroupSettingsSilent();
    alert('Налаштування збережено!');
    goToHome();
}

// ===================== РЕНДЕР ГРУП =====================

function renderGroupsConfig() {
    const container = document.getElementById('groupsConfig');
    container.innerHTML = '';
    settings.groups.forEach((g, i) => {
        container.innerHTML += `
            <div class="group-config">
                <div class="group-config-header">
                    <h4>Група ${i+1}</h4>
                    <button class="btn btn-danger btn-small" onclick="removeGroup(${i})">Видалити</button>
                </div>
                <div class="group-fields">
                    <div class="form-group"><label>Мін. вік:</label><input type="number" id="minAge${i}" value="${g.minAge}" min="1" max="18" onchange="autoSaveSettings()"></div>
                    <div class="form-group"><label>Макс. вік:</label><input type="number" id="maxAge${i}" value="${g.maxAge}" min="1" max="18" onchange="autoSaveSettings()"></div>
                    <div class="form-group"><label>Назва:</label><input type="text" id="groupName${i}" value="${g.name}" onchange="autoSaveSettings()"></div>
                    <div class="form-group"><label>Колір фону:</label><input type="color" id="groupColor${i}" value="${g.color}" onchange="updateColorPreview(${i});autoSaveSettings();"></div>
                    <div class="form-group"><label>Колір тексту:</label><input type="color" id="groupTextColor${i}" value="${g.textColor}" onchange="updateColorPreview(${i});autoSaveSettings();"></div>
                </div>
                <div class="color-preview-container">
                    <label>Вигляд:</label>
                    <div id="colorPreview${i}" class="color-preview" style="background:${g.color};color:${g.textColor};">Аа</div>
                </div>
            </div>`;
    });
}

function updateColorPreview(i) {
    const p = document.getElementById(`colorPreview${i}`);
    p.style.backgroundColor = document.getElementById(`groupColor${i}`).value;
    p.style.color = document.getElementById(`groupTextColor${i}`).value;
}

function addGroup() {
    settings.groups.push({ minAge: 6, maxAge: 10, name: 'Нова група', color: '#667eea', textColor: '#FFFFFF' });
    renderGroupsConfig();
    autoSaveSettings();
}

function removeGroup(i) {
    if (confirm('Видалити цю групу?')) { settings.groups.splice(i, 1); renderGroupsConfig(); autoSaveSettings(); }
}

// ===================== ІСТОРІЯ =====================

async function renderFullHistory() {
    const container = document.getElementById('fullHistory');
    container.innerHTML = '';
    const camps = await window.api.getAllCamps();
    if (camps.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:40px;">Немає попередніх реєстрацій</p>';
        return;
    }
    camps.forEach(item => {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.onclick = () => loadCamp(item.village, item.date);
        el.innerHTML = `<strong>${item.village}</strong> — ${item.date} <span class="badge-count">${item.children}</span>`;
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger btn-small';
        delBtn.textContent = 'Видалити';
        delBtn.style.float = 'right';
        delBtn.onclick = function(e) { e.stopPropagation(); deleteCamp(item.village, item.date); };
        el.appendChild(delBtn);
        container.appendChild(el);
    });
}

async function loadQuickHistory() {
    const container = document.getElementById('quickHistory');
    container.innerHTML = '';
    const camps = await window.api.getAllCamps();
    if (camps.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Немає попередніх реєстрацій</p>';
        return;
    }
    camps.slice(0, 5).forEach(item => {
        const el = document.createElement('div');
        el.className = 'quick-history-item';
        el.onclick = () => loadCamp(item.village, item.date);
        el.innerHTML = `<strong>${item.village}</strong> — ${item.date} <span class="badge-count">${item.children}</span>`;
        container.appendChild(el);
    });
}

// ===================== РЕЄСТРАЦІЯ =====================

function determineGroup(age) {
    for (let g of settings.groups) { if (age >= g.minAge && age <= g.maxAge) return g; }
    return null;
}

function startRegistration() {
    const village = document.getElementById('homeVillage').value.trim();
    const date = document.getElementById('homeDate').value;
    if (!village || !date) { alert('Будь ласка, заповніть місце та дату!'); return; }
    loadCamp(village, date);
}

function registerChild(event) {
    event.preventDefault();
    if (!settings.village || !settings.date) { alert('Спочатку заповніть місце та дату!'); return; }
    const fullName = document.getElementById('fullName').value.trim();
    const age = parseInt(document.getElementById('age').value);
    const parts = fullName.split(' ');
    let lastName = '', firstName = '';
    if (parts.length === 1) firstName = parts[0];
    else if (parts.length === 2) { lastName = parts[0]; firstName = parts[1]; }
    else { lastName = parts[0]; firstName = parts.slice(1).join(' '); }
    const group = determineGroup(age);
    if (!group) { alert('Не знайдено групу для цього віку. Перевірте налаштування.'); return; }
    currentChild = { id: Date.now(), lastName, firstName, age, group: group.name, groupColor: group.color, groupTextColor: group.textColor, badgeName: firstName };
    showBadgeModal();
}

function showBadgeModal() {
    document.getElementById('badgeName').value = currentChild.firstName;
    document.getElementById('badgeModal').classList.add('active');
    document.getElementById('badgeName').focus();
}

function skipBadgeName() { currentChild.badgeName = currentChild.firstName; finishRegistration(); }
function confirmBadgeName() { const n = document.getElementById('badgeName').value.trim(); currentChild.badgeName = n || currentChild.firstName; finishRegistration(); }

async function finishRegistration() {
    document.getElementById('badgeModal').classList.remove('active');
    await saveChild(currentChild);
    pendingBadges.push({ name: currentChild.badgeName, color: currentChild.groupColor, textColor: currentChild.groupTextColor });
    if (settings.printMode === 'individual') printBadges([pendingBadges.pop()]);
    else { const bs = settings.batchSize || 3; if (pendingBadges.length >= bs) printBadges(pendingBadges.splice(0, bs)); }
    await updateTable();
    document.getElementById('registrationForm').reset();
    document.getElementById('fullName').focus();
    currentChild = null;
}

async function saveChild(child) {
    // Зберігаємо локально
    await window.api.saveChild(settings.village, settings.date, {
        lastName: child.lastName, firstName: child.firstName, age: child.age,
        group: child.group, groupColor: child.groupColor, groupTextColor: child.groupTextColor,
        badgeName: child.badgeName
    });
    
    // Якщо клієнтський режим - відправляємо на сервер
    if (networkConfig.mode === 'client' && networkConfig.serverUrl) {
        try {
            const response = await fetch(`${networkConfig.serverUrl}/api/child`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    village: settings.village,
                    date: settings.date,
                    child: {
                        lastName: child.lastName,
                        firstName: child.firstName,
                        age: child.age,
                        group: child.group,
                        groupColor: child.groupColor,
                        groupTextColor: child.groupTextColor,
                        badgeName: child.badgeName
                    }
                })
            });
            
            if (!response.ok) {
                console.error('Не вдалося синхронізувати з сервером');
            }
        } catch (e) {
            console.error('Помилка синхронізації:', e);
        }
    }
}

async function loadTodayData() {
    if (!settings.village || !settings.date) return { children: [], village: '', date: '' };
    return await window.api.getCampData(settings.village, settings.date);
}

async function updateTable() {
    const data = await loadTodayData();
    const tbody = document.getElementById('childrenTableBody');
    tbody.innerHTML = '';
    data.children.forEach((c, i) => {
        tbody.innerHTML += `<tr><td>${i+1}</td><td>${c.lastName}</td><td>${c.firstName}</td><td>${c.age}</td><td><span style="background:${c.groupColor};color:${c.groupTextColor};padding:4px 12px;border-radius:5px;font-weight:bold;">${c.group}</span></td><td><button class="btn btn-secondary btn-small" onclick="printSingleBadge(${c.id})">Друк</button> <button class="btn btn-danger btn-small" onclick="deleteChild(${c.id})">Видалити</button></td></tr>`;
    });
    updateStatistics(data);
}

function updateStatistics(data) {
    document.getElementById('totalChildren').textContent = data.children.length;
    const gs = {}; data.children.forEach(c => { gs[c.group] = (gs[c.group] || 0) + 1; });
    const c = document.getElementById('groupStatisticsInline'); c.innerHTML = '';
    for (let [n, cnt] of Object.entries(gs)) {
        const g = settings.groups.find(x => x.name === n);
        const span = document.createElement('span');
        span.style.borderLeft = `4px solid ${g ? g.color : '#667eea'}`;
        span.innerHTML = `<strong>${n}:</strong> ${cnt}`; c.appendChild(span);
    }
}

async function deleteChild(childId) {
    if (!confirm('Видалити дитину?')) return;
    await window.api.deleteChild(childId);
    await updateTable();
}

function printSingleBadge(childId) {
    loadTodayData().then(data => {
        const c = data.children.find(x => x.id === childId);
        if (c) printBadges([{ name: c.firstName, color: c.groupColor, textColor: c.groupTextColor }]);
    });
}

function updateDisplayInfo() {
    document.getElementById('displayVillage').textContent = settings.village || '-';
    document.getElementById('displayDate').textContent = settings.date || '-';
}

// ===================== ВИДАЛЕННЯ ТАБОРУ =====================

function deleteCurrentCamp() {
    if (!settings.village || !settings.date) { alert('Немає активного табору'); return; }
    deleteCamp(settings.village, settings.date);
}

async function deleteCamp(village, date) {
    if (!confirm('УВАГА! Ви дійсно хочете видалити табір ' + village + ' за ' + date + '?')) return;
    if (!confirm('Всі дані про дітей будуть безповоротно втрачені! Ви впевнені?')) return;
    if (!confirm('Останнє попередження! Цю дію неможливо скасувати. Видалити табір?')) return;
    await window.api.deleteCamp(village, date);
    if (village === settings.village && date === settings.date) {
        settings.village = ''; settings.date = '';
        await window.api.saveSettings(settings);
        if (document.getElementById('registrationPage').classList.contains('active')) goToHome();
    }
    renderFullHistory();
    loadQuickHistory();
    alert('Табір видалено!');
}

// ===================== ДРУК =====================

function printBadges(badges) {
    // Створюємо модальне вікно з попереднім переглядом
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
    
    const container = document.createElement('div');
    container.style.cssText = 'background:white;padding:30px;border-radius:15px;max-width:90%;max-height:80%;overflow:auto;';
    
    const title = document.createElement('h2');
    title.textContent = 'Попередній перегляд бейджиків';
    title.style.cssText = 'margin-bottom:20px;color:#667eea;text-align:center;';
    
    const previewArea = document.createElement('div');
    previewArea.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:20px;';
    
    badges.forEach(b => {
        const fs = calcFontSize(b.name);
        const badgePreview = document.createElement('div');
        badgePreview.style.cssText = `width:280px;height:120px;background:${b.color};color:${b.textColor};border:2px solid #333;border-radius:5px;display:flex;align-items:center;justify-content:center;font-family:'Segoe Script','Brush Script MT','Lucida Handwriting',cursive;font-size:${fs}px;font-weight:bold;padding:10px;box-sizing:border-box;word-wrap:break-word;text-align:center;overflow:hidden;`;
        badgePreview.textContent = b.name;
        previewArea.appendChild(badgePreview);
    });
    
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;gap:15px;justify-content:center;';
    
    const printBtn = document.createElement('button');
    printBtn.textContent = '🖨️ Друкувати';
    printBtn.className = 'btn btn-primary';
    printBtn.style.cssText = 'padding:12px 30px;font-size:16px;';
    printBtn.onclick = () => {
        document.body.removeChild(modal);
        actualPrint(badges);
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Закрити';
    closeBtn.className = 'btn btn-secondary';
    closeBtn.style.cssText = 'padding:12px 30px;font-size:16px;';
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    btnContainer.appendChild(printBtn);
    btnContainer.appendChild(closeBtn);
    container.appendChild(title);
    container.appendChild(previewArea);
    container.appendChild(btnContainer);
    modal.appendChild(container);
    document.body.appendChild(modal);
}

function actualPrint(badges) {
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = '';
    badges.forEach(b => {
        const fs = calcFontSize(b.name);
        const el = document.createElement('div');
        el.className = 'badge'; el.style.backgroundColor = b.color;
        el.innerHTML = `<div class="badge-content" style="color:${b.textColor};font-size:${fs}px;">${b.name}</div>`;
        printArea.appendChild(el);
    });
    setTimeout(() => {
        const iframe = document.createElement('iframe'); iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`<!DOCTYPE html><html><head><title>Друк</title><style>@page{margin:0;size:70mm 30mm;}*{margin:0;padding:0;}body{margin:0;padding:0;font-family:'Segoe Script','Brush Script MT','Lucida Handwriting',cursive;}.badge{width:70mm;height:30mm;border:2px solid #333;border-radius:5px;display:flex;align-items:center;justify-content:center;padding:5px;box-sizing:border-box;page-break-after:always;page-break-inside:avoid!important;overflow:hidden;}.badge:last-child{page-break-after:auto;}.badge-content{text-align:center;width:100%;font-weight:bold;word-wrap:break-word;overflow-wrap:break-word;letter-spacing:1px;line-height:1.2;max-width:100%;max-height:100%;display:flex;align-items:center;justify-content:center;}</style></head><body>${printArea.innerHTML}</body></html>`);
        doc.close();
        setTimeout(() => {
            try { 
                iframe.contentWindow.print(); 
            } catch (e) { 
                console.error('Помилка друку:', e); 
                alert('Не вдалося відкрити діалог друку. Переконайтеся, що служба Print Spooler запущена в Windows.\n\nПомилка: ' + e.message); 
            }
            setTimeout(() => { try { document.body.removeChild(iframe); } catch(e) {} }, 1000);
        }, 500);
    }, 200);
}

function calcFontSize(name) {
    // Автоматичне підлаштування розміру тексту під рамку 70x30 мм
    const l = name.length;
    
    // Базові розміри залежно від довжини
    if (l <= 4) return 60;
    if (l <= 6) return 50;
    if (l <= 8) return 42;
    if (l <= 10) return 36;
    if (l <= 12) return 30;
    if (l <= 15) return 26;
    if (l <= 18) return 22;
    if (l <= 22) return 18;
    
    // Для дуже довгих імен
    return 16;
}

// ===================== ЕКСПОРТ EXCEL =====================

async function exportToExcel() {
    const data = await loadTodayData();
    if (!data.children.length) { alert('Немає даних'); return; }
    const result = await window.api.exportExcel(data);
    if (result) alert('Excel збережено!');
}

// ===================== БЕКАП / ВІДНОВЛЕННЯ =====================

async function backupAllData() {
    const result = await window.api.backupData();
    if (result) alert('Бекап збережено!');
}

async function restoreFromBackup() {
    if (!confirm('УВАГА! Відновлення додасть дані з бекапу до поточних. Продовжити?')) return;
    try {
        const count = await window.api.restoreData();
        if (count !== false && count !== 0) {
            alert(`Відновлено ${count} дітей! Сторінка буде перезавантажена.`);
            location.reload();
        } else if (count === 0) {
            alert('Не знайдено даних для відновлення або операцію скасовано.');
        }
    } catch (err) {
        alert('Помилка: ' + err.message);
    }
}

document.addEventListener('keydown', function(e) {
    if (document.getElementById('badgeModal').classList.contains('active') && e.key === 'Enter') confirmBadgeName();
});
