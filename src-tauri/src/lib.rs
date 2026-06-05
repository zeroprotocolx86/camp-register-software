use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Child {
    id: Option<f64>,
    #[serde(rename = "lastName")]
    last_name: String,
    #[serde(rename = "firstName")]
    first_name: String,
    age: u32,
    group: String,
    #[serde(rename = "groupColor")]
    group_color: String,
    #[serde(rename = "groupTextColor")]
    group_text_color: String,
    #[serde(rename = "badgeName")]
    badge_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct CampData {
    children: Vec<Child>,
    village: String,
    date: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct NetworkConfig {
    mode: String,
    #[serde(rename = "serverUrl")]
    server_url: String,
    #[serde(rename = "serverPort")]
    server_port: u16,
}

fn get_data_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle.path().app_data_dir().unwrap().join("camp_register_data")
}

fn ensure_data_dir(data_dir: &PathBuf) {
    if !data_dir.exists() {
        fs::create_dir_all(data_dir).ok();
    }
}

fn get_data_key(village: &str, date: &str) -> String {
    format!("campData_{}_{}", urlencoding::encode(village), date)
}

// ==================== TAURI COMMANDS ====================

#[tauri::command]
fn get_settings(app_handle: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    let data_dir = get_data_dir(&app_handle);
    let settings_path = data_dir.join("camp_settings.json");
    
    if settings_path.exists() {
        let content = fs::read_to_string(settings_path).map_err(|e| e.to_string())?;
        let settings: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(Some(settings))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn save_settings(app_handle: tauri::AppHandle, settings: serde_json::Value) -> Result<bool, String> {
    let data_dir = get_data_dir(&app_handle);
    ensure_data_dir(&data_dir);
    let settings_path = data_dir.join("camp_settings.json");
    
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(settings_path, json).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn get_camp_data(app_handle: tauri::AppHandle, village: String, date: String) -> Result<CampData, String> {
    let data_dir = get_data_dir(&app_handle);
    let data_path = data_dir.join("camp_data.json");
    
    if data_path.exists() {
        let content = fs::read_to_string(data_path).map_err(|e| e.to_string())?;
        let all_data: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        let key = get_data_key(&village, &date);
        
        if let Some(camp) = all_data.get(&key) {
            let camp_data: CampData = serde_json::from_value(camp.clone()).map_err(|e| e.to_string())?;
            Ok(camp_data)
        } else {
            Ok(CampData {
                children: vec![],
                village,
                date,
            })
        }
    } else {
        Ok(CampData {
            children: vec![],
            village,
            date,
        })
    }
}

#[tauri::command]
fn save_child(app_handle: tauri::AppHandle, village: String, date: String, child: Child) -> Result<f64, String> {
    let data_dir = get_data_dir(&app_handle);
    ensure_data_dir(&data_dir);
    let data_path = data_dir.join("camp_data.json");
    
    let mut all_data: serde_json::Value = if data_path.exists() {
        let content = fs::read_to_string(&data_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    
    let key = get_data_key(&village, &date);
    let id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as f64;
    
    let mut child_with_id = child;
    child_with_id.id = Some(id);
    
    if let Some(camp) = all_data.get_mut(&key) {
        if let Some(children) = camp.get_mut("children") {
            if let Some(arr) = children.as_array_mut() {
                arr.push(serde_json::to_value(&child_with_id).unwrap());
            }
        }
    } else {
        all_data[&key] = serde_json::json!({
            "children": vec![serde_json::to_value(&child_with_id).unwrap()],
            "village": village,
            "date": date
        });
    }
    
    let json = serde_json::to_string_pretty(&all_data).map_err(|e| e.to_string())?;
    fs::write(data_path, json).map_err(|e| e.to_string())?;
    
    Ok(id)
}

#[tauri::command]
fn delete_child(app_handle: tauri::AppHandle, child_id: f64) -> Result<bool, String> {
    let data_dir = get_data_dir(&app_handle);
    let data_path = data_dir.join("camp_data.json");
    
    if !data_path.exists() {
        return Ok(true);
    }
    
    let content = fs::read_to_string(&data_path).map_err(|e| e.to_string())?;
    let mut all_data: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    if let Some(obj) = all_data.as_object_mut() {
        for (_, camp) in obj.iter_mut() {
            if let Some(children) = camp.get_mut("children") {
                if let Some(arr) = children.as_array_mut() {
                    arr.retain(|c| {
                        c.get("id").and_then(|id| id.as_f64()) != Some(child_id)
                    });
                }
            }
        }
    }
    
    let json = serde_json::to_string_pretty(&all_data).map_err(|e| e.to_string())?;
    fs::write(data_path, json).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
fn get_all_camps(app_handle: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let data_dir = get_data_dir(&app_handle);
    let data_path = data_dir.join("camp_data.json");
    
    if !data_path.exists() {
        return Ok(vec![]);
    }
    
    let content = fs::read_to_string(data_path).map_err(|e| e.to_string())?;
    let all_data: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    let mut camps = vec![];
    
    if let Some(obj) = all_data.as_object() {
        for (_, camp) in obj.iter() {
            if let (Some(village), Some(date)) = (camp.get("village"), camp.get("date")) {
                let children_count = camp.get("children")
                    .and_then(|c| c.as_array())
                    .map(|a| a.len())
                    .unwrap_or(0);
                
                camps.push(serde_json::json!({
                    "village": village,
                    "date": date,
                    "children": children_count
                }));
            }
        }
    }
    
    camps.sort_by(|a, b| {
        let date_a = a.get("date").and_then(|d| d.as_str()).unwrap_or("");
        let date_b = b.get("date").and_then(|d| d.as_str()).unwrap_or("");
        date_b.cmp(date_a)
    });
    
    Ok(camps)
}

#[tauri::command]
fn delete_camp(app_handle: tauri::AppHandle, village: String, date: String) -> Result<bool, String> {
    let data_dir = get_data_dir(&app_handle);
    let data_path = data_dir.join("camp_data.json");
    
    if !data_path.exists() {
        return Ok(true);
    }
    
    let content = fs::read_to_string(&data_path).map_err(|e| e.to_string())?;
    let mut all_data: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    let key = get_data_key(&village, &date);
    
    if let Some(obj) = all_data.as_object_mut() {
        obj.remove(&key);
    }
    
    let json = serde_json::to_string_pretty(&all_data).map_err(|e| e.to_string())?;
    fs::write(data_path, json).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
fn get_network_config(app_handle: tauri::AppHandle) -> Result<NetworkConfig, String> {
    let data_dir = get_data_dir(&app_handle);
    let config_path = data_dir.join("network_config.json");
    
    if config_path.exists() {
        let content = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
        let config: NetworkConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(config)
    } else {
        Ok(NetworkConfig {
            mode: "auto".to_string(),
            server_url: "".to_string(),
            server_port: 33445,
        })
    }
}

#[tauri::command]
fn save_network_config(app_handle: tauri::AppHandle, config: NetworkConfig) -> Result<bool, String> {
    let data_dir = get_data_dir(&app_handle);
    ensure_data_dir(&data_dir);
    let config_path = data_dir.join("network_config.json");
    
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, json).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn get_local_ip() -> Result<String, String> {
    use local_ip_address::local_ip;
    
    match local_ip() {
        Ok(ip) => Ok(ip.to_string()),
        Err(_) => Ok("127.0.0.1".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            get_camp_data,
            save_child,
            delete_child,
            get_all_camps,
            delete_camp,
            get_network_config,
            save_network_config,
            get_local_ip
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
