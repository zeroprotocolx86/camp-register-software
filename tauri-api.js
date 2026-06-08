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
    
    // Backup/Export - викликаємо Rust команди
    backupData: () => invoke('backup_data'),
    restoreData: () => invoke('restore_data'),
    exportExcel: (data) => invoke('export_excel', { data }),
    
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
