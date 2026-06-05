// Tauri API wrapper - замінює Electron IPC
const { invoke } = window.__TAURI__.core;

window.api = {
    getSettings: () => invoke('get_settings'),
    saveSettings: (settings) => invoke('save_settings', { settings }),
    getCampData: (village, date) => invoke('get_camp_data', { village, date }),
    saveChild: (village, date, child) => invoke('save_child', { village, date, child }),
    deleteChild: (childId) => invoke('delete_child', { childId }),
    getAllCamps: () => invoke('get_all_camps'),
    deleteCamp: (village, date) => invoke('delete_camp', { village, date }),
    
    // Мережеві методи
    getNetworkConfig: () => invoke('get_network_config'),
    saveNetworkConfig: (config) => invoke('save_network_config', { config }),
    getLocalIp: () => invoke('get_local_ip'),
    
    // Backup/Export - використаємо Tauri dialog
    backupData: async () => {
        const { save } = window.__TAURI__.dialog;
        const { writeTextFile } = window.__TAURI__.fs;
        
        const filePath = await save({
            defaultPath: `backup_camp_${new Date().toISOString().split('T')[0]}.json`,
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        
        if (!filePath) return false;
        
        const allData = {};
        const settings = await invoke('get_settings');
        const backup = { version: 1, created: new Date().toISOString(), data: allData, settings };
        
        await writeTextFile(filePath, JSON.stringify(backup, null, 2));
        return true;
    },
    
    restoreData: async () => {
        const { open } = window.__TAURI__.dialog;
        const { readTextFile } = window.__TAURI__.fs;
        
        const filePath = await open({
            filters: [{ name: 'JSON', extensions: ['json'] }],
            multiple: false
        });
        
        if (!filePath) return 0;
        
        const content = await readTextFile(filePath);
        const backup = JSON.parse(content);

        return 0;
    },
    
    exportExcel: async (data) => {
        // Excel експорт поки що відключений - потрібен окремий Rust модуль
        alert('Excel експорт в розробці для Tauri версії');
        return false;
    },
    
    closeApp: async () => {
        const { exit } = window.__TAURI__.process;
        await exit(0);
    },
    
    // Заглушки для compatibility
    startServer: async (port) => ({ success: false, error: 'HTTP сервер в розробці' }),
    stopServer: async () => ({ success: true }),
    scanNetwork: async (port) => ({ success: true, servers: [] }),
    onChildAdded: (callback) => {} // WebSocket буде пізніше
};
