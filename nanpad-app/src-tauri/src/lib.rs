// NANPAD - Tauri backend (Rust mínimo: solo integración de plugins)
// La lógica de negocio reside completamente en el frontend TypeScript.

mod mcp_server;

use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;

/// Devuelve la ruta de la carpeta de instalación de NANPAD (donde está mcp-adapter).
#[tauri::command]
fn get_nanpad_install_path() -> Result<String, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let mut dir = exe
        .parent()
        .map(PathBuf::from)
        .ok_or_else(|| "No se pudo obtener el directorio del ejecutable".to_string())?;
    for _ in 0..10 {
        if dir.join("mcp-adapter").is_dir() {
            return Ok(dir.to_string_lossy().to_string());
        }
        dir = match dir.parent() {
            Some(p) => p.to_path_buf(),
            None => break,
        };
    }
    Err("No se encontró la carpeta mcp-adapter".to_string())
}

#[tauri::command]
fn check_file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn start_mcp_server(port: u16, state: tauri::State<Arc<mcp_server::McpState>>, app: tauri::AppHandle) -> Result<(), String> {
    mcp_server::start_mcp_server(port, Arc::clone(&*state), app)
}

#[tauri::command]
fn stop_mcp_server(state: tauri::State<Arc<mcp_server::McpState>>) {
    mcp_server::stop_mcp_server(&**state);
}

/// Prueba si el servidor MCP HTTP responde en el puerto dado (POST list_tasks).
#[tauri::command]
fn test_mcp_connection(port: u16) -> Result<String, String> {
    let body = r#"{"tool":"ping","params":{}}"#;
    let request = format!(
        "POST / HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let mut stream = std::net::TcpStream::connect(format!("127.0.0.1:{}", port))
        .map_err(|e| format!("No se pudo conectar al puerto {}: {}", port, e))?;
    stream
        .write_all(request.as_bytes())
        .map_err(|e| format!("Error al enviar: {}", e))?;
    stream
        .set_read_timeout(Some(std::time::Duration::from_secs(5)))
        .ok();
    let mut buf = [0u8; 1024];
    let n = stream
        .read(&mut buf)
        .map_err(|e| format!("Error al leer respuesta: {}", e))?;
    let response = std::str::from_utf8(&buf[..n]).unwrap_or("");
    if response.starts_with("HTTP/1.1 200") || response.starts_with("HTTP/1.0 200") {
        Ok("El servidor MCP responde correctamente.".to_string())
    } else {
        let first_line = response.lines().next().unwrap_or("");
        Err(format!("Respuesta inesperada: {}", first_line))
    }
}

#[tauri::command]
fn mcp_response(
    request_id: String,
    response: mcp_server::McpResponseBody,
    state: tauri::State<Arc<mcp_server::McpState>>,
) {
    if let Ok(mut pending) = state.pending.lock() {
        if let Some(tx) = pending.remove(&request_id) {
            let _ = tx.send(response);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Arc::new(mcp_server::McpState::new()))
        .invoke_handler(tauri::generate_handler![
            get_nanpad_install_path,
            test_mcp_connection,
            check_file_exists,
            start_mcp_server,
            stop_mcp_server,
            mcp_response,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
