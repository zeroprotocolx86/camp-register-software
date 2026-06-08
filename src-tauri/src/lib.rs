use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri_plugin_dialog::DialogExt;

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

#[tauri::command]
fn export_excel(app_handle: tauri::AppHandle, data: serde_json::Value) -> Result<bool, String> {
    let children = data.get("children").and_then(|c| c.as_array()).ok_or("Немає дітей для експорту")?;
    if children.is_empty() { return Err("Немає дітей для експорту".into()); }

    let village = data.get("village").and_then(|v| v.as_str()).unwrap_or("табір");
    let date = data.get("date").and_then(|v| v.as_str()).unwrap_or("дата");
    let filename = format!("Реєстрація_{}_{}.xlsx", village, date);

    let path = app_handle.dialog().file()
        .add_filter("Excel", &["xlsx"])
        .set_file_name(&filename)
        .blocking_save_file();

    let Some(p) = path else { return Ok(false); };

    use rust_xlsxwriter::*;
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    let header = Format::new().set_bold().set_font_size(14).set_font_color(0x667eea);
    let cell_format = Format::new().set_font_size(12);

    worksheet.write_with_format(0, 0, "Прізвище", &header).unwrap();
    worksheet.write_with_format(0, 1, "Ім'я", &header).unwrap();
    worksheet.write_with_format(0, 2, "Вік", &header).unwrap();
    worksheet.write_with_format(0, 3, "Група", &header).unwrap();

    worksheet.set_column_width(0, 20).unwrap();
    worksheet.set_column_width(1, 20).unwrap();
    worksheet.set_column_width(2, 8).unwrap();
    worksheet.set_column_width(3, 12).unwrap();

    for (i, child) in children.iter().enumerate() {
        let row = (i + 1) as u32;
        let last = child.get("lastName").and_then(|v| v.as_str()).unwrap_or("");
        let first = child.get("firstName").and_then(|v| v.as_str()).unwrap_or("");
        let age = child.get("age").and_then(|v| v.as_u64()).unwrap_or(0);
        let group = child.get("group").and_then(|v| v.as_str()).unwrap_or("");
        worksheet.write_with_format(row, 0, last, &cell_format).unwrap();
        worksheet.write_with_format(row, 1, first, &cell_format).unwrap();
        worksheet.write_with_format(row, 2, age as f64, &cell_format).unwrap();
        worksheet.write_with_format(row, 3, group, &cell_format).unwrap();
    }

    // Підрахунок
    let total = children.len();
    let mut group_counts: std::collections::HashMap<&str, usize> = std::collections::HashMap::new();
    for child in children {
        let g = child.get("group").and_then(|v| v.as_str()).unwrap_or("?");
        *group_counts.entry(g).or_insert(0) += 1;
    }

    let summary_row = (children.len() + 2) as u32;
    let bold = Format::new().set_bold().set_font_size(12).set_font_color(0x667eea);
    let normal = Format::new().set_font_size(12);

    let summary_text = format!("Загальна кількість дітей: {}", total);
    worksheet.merge_range(summary_row, 0, summary_row, 3, &summary_text, &bold).unwrap();

    let mut group_row = summary_row + 1;
    let mut groups: Vec<_> = group_counts.into_iter().collect();
    groups.sort_by(|a, b| a.0.cmp(b.0));
    for (group, count) in &groups {
        let gtxt = format!("Група {}: {} дітей", group, count);
        worksheet.merge_range(group_row, 0, group_row, 3, &gtxt, &normal).unwrap();
        group_row += 1;
    }

    workbook.save(p.as_path().unwrap()).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn backup_data(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let data_dir = app_handle.path().app_data_dir().unwrap().join("camp_register_data");
    let data_path = data_dir.join("camp_data.json");

    if !data_path.exists() { return Err("Немає даних для бекапу".into()); }

    let content = fs::read_to_string(&data_path).map_err(|e| e.to_string())?;

    let path = app_handle.dialog().file()
        .add_filter("JSON", &["json"])
        .set_file_name("camp_backup.json")
        .blocking_save_file();

    match path {
        Some(p) => {
            fs::write(p.as_path().unwrap(), content).map_err(|e| e.to_string())?;
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
fn restore_data(app_handle: tauri::AppHandle) -> Result<i64, String> {
    let path = app_handle.dialog().file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    match path {
        Some(p) => {
            let content = fs::read_to_string(p.as_path().unwrap()).map_err(|e| e.to_string())?;
            let backup_data: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

            let data_dir = app_handle.path().app_data_dir().unwrap().join("camp_register_data");
            if !data_dir.exists() { fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?; }
            let data_path = data_dir.join("camp_data.json");

            let mut current_data: serde_json::Value = if data_path.exists() {
                let cur = fs::read_to_string(&data_path).map_err(|e| e.to_string())?;
                serde_json::from_str(&cur).unwrap_or(serde_json::json!({}))
            } else {
                serde_json::json!({})
            };

            let mut restored_count: i64 = 0;

            if let Some(backup_obj) = backup_data.as_object() {
                for (key, camp) in backup_obj {
                    if let Some(children) = camp.get("children").and_then(|c| c.as_array()) {
                        if !children.is_empty() {
                            restored_count += children.len() as i64;
                            if current_data.get(key).is_none() {
                                current_data[key] = camp.clone();
                            } else {
                                if let Some(existing) = current_data[key].get_mut("children").and_then(|c| c.as_array_mut()) {
                                    for child in children {
                                        existing.push(child.clone());
                                    }
                                }
                            }
                        }
                    }
                }
            }

            let json = serde_json::to_string_pretty(&current_data).map_err(|e| e.to_string())?;
            fs::write(data_path, json).map_err(|e| e.to_string())?;

            Ok(restored_count)
        }
        None => Ok(0),
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
            get_local_ip,
            export_excel,
            backup_data,
            restore_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
