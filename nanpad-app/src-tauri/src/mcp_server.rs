//! Servidor HTTP local para MCP. Escucha en 127.0.0.1:port, recibe POST con { tool, params }
//! y reenvía al frontend; la respuesta se envía por el comando mcp_response.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// Cuerpo del request que envía el agente.
#[derive(Debug, Deserialize)]
pub struct McpRequestBody {
    pub tool: String,
    pub params: Option<HashMap<String, serde_json::Value>>,
}

/// Respuesta que devuelve el frontend.
#[derive(Debug, Serialize, Deserialize)]
pub struct McpResponseBody {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Estado compartido: pendientes por request_id y flag para detener el servidor.
pub struct McpState {
    pub pending: Mutex<HashMap<String, mpsc::Sender<McpResponseBody>>>,
    pub running: AtomicBool,
    pub request_id_counter: Mutex<u64>,
}

impl McpState {
    pub fn new() -> Self {
        Self {
            pending: Mutex::new(HashMap::new()),
            running: AtomicBool::new(false),
            request_id_counter: Mutex::new(0),
        }
    }

    fn next_request_id(&self) -> String {
        let mut c = self.request_id_counter.lock().unwrap();
        *c = c.saturating_add(1);
        format!("mcp-{}", *c)
    }
}

/// Arranca el servidor MCP en un hilo. Solo escucha en 127.0.0.1.
pub fn start_mcp_server(port: u16, state: Arc<McpState>, app: AppHandle) -> Result<(), String> {
    if state.running.swap(true, Ordering::SeqCst) {
        return Err("El servidor MCP ya está en ejecución".into());
    }

    let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
        .map_err(|e| format!("No se pudo bindear al puerto {}: {}", port, e))?;
    listener
        .set_nonblocking(true)
        .map_err(|e| format!("set_nonblocking: {}", e))?;

    let state_clone = Arc::clone(&state);
    thread::spawn(move || {
        run_listener(listener, state_clone, app);
    });

    Ok(())
}

/// Detiene el servidor (el hilo sale en la siguiente comprobación del flag).
pub fn stop_mcp_server(state: &McpState) {
    state.running.store(false, Ordering::SeqCst);
}

fn run_listener(listener: TcpListener, state: Arc<McpState>, app: AppHandle) {
    while state.running.load(Ordering::SeqCst) {
        match listener.accept() {
            Ok((stream, _addr)) => {
                stream
                    .set_read_timeout(Some(Duration::from_secs(5)))
                    .ok();
                stream
                    .set_write_timeout(Some(Duration::from_secs(5)))
                    .ok();
                let state_conn = Arc::clone(&state);
                let app_conn = app.clone();
                thread::spawn(move || handle_connection(stream, state_conn, app_conn));
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(200));
            }
            Err(_) => break,
        }
    }
}

fn handle_connection(
    mut stream: std::net::TcpStream,
    state: Arc<McpState>,
    app: AppHandle,
) {
    let mut buf = [0u8; 8192];
    let n = match stream.read(&mut buf) {
        Ok(0) => return,
        Ok(n) => n,
        Err(_) => return,
    };

    let request = match std::str::from_utf8(&buf[..n]) {
        Ok(s) => s,
        Err(_) => {
            send_http_error(&mut stream, 400, "Invalid UTF-8");
            return;
        }
    };

    let (headers, body_start) = match request.find("\r\n\r\n") {
        Some(i) => (&request[..i], i + 4),
        None => {
            send_http_error(&mut stream, 400, "No headers end");
            return;
        }
    };

    let content_length = headers
        .lines()
        .find(|l| l.to_lowercase().starts_with("content-length:"))
        .and_then(|l| l.split(':').nth(1))
        .and_then(|s| s.trim().parse::<usize>().ok())
        .unwrap_or(0);

    let body = if content_length > 0 && body_start + content_length <= request.len() {
        request[body_start..body_start + content_length].as_bytes()
    } else {
        send_http_error(&mut stream, 400, "Missing or invalid Content-Length");
        return;
    };

    let body_json: McpRequestBody = match serde_json::from_slice(body) {
        Ok(b) => b,
        Err(_) => {
            send_http_error(&mut stream, 400, "Invalid JSON body");
            return;
        }
    };

    // Ping interno: responde al instante sin pasar por el frontend (para "Probar conexión").
    if body_json.tool == "ping" || body_json.tool == "_ping" {
        let _ = send_http_json(
            &mut stream,
            200,
            &McpResponseBody {
                success: true,
                data: Some(serde_json::json!("pong")),
                error: None,
            },
        );
        return;
    }

    let request_id = state.next_request_id();
    let (tx, rx) = mpsc::channel();

    {
        let mut pending = state.pending.lock().unwrap();
        pending.insert(request_id.clone(), tx);
    }

    let payload = serde_json::json!({
        "requestId": request_id,
        "tool": body_json.tool,
        "params": body_json.params.unwrap_or_default()
    });

    if app.emit("mcp_request", payload).is_err() {
        let _ = send_http_json(
            &mut stream,
            500,
            &McpResponseBody {
                success: false,
                data: None,
                error: Some("No se pudo enviar al frontend".into()),
            },
        );
        state.pending.lock().unwrap().remove(&request_id);
        return;
    }

    let response = match rx.recv_timeout(Duration::from_secs(30)) {
        Ok(r) => r,
        Err(_) => McpResponseBody {
            success: false,
            data: None,
            error: Some("Timeout esperando respuesta del frontend".into()),
        },
    };

    state.pending.lock().unwrap().remove(&request_id);

    let status = if response.success { 200 } else { 200 };
    let _ = send_http_json(&mut stream, status, &response);
}

fn send_http_json(
    stream: &mut std::net::TcpStream,
    status: u16,
    body: &McpResponseBody,
) -> std::io::Result<()> {
    let json = serde_json::to_string(body).unwrap_or_else(|_| "{}".into());
    let response = format!(
        "HTTP/1.1 {} OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status,
        json.len(),
        json
    );
    stream.write_all(response.as_bytes())
}

fn send_http_error(stream: &mut std::net::TcpStream, status: u16, message: &str) {
    let _ = send_http_json(
        stream,
        status,
        &McpResponseBody {
            success: false,
            data: None,
            error: Some(message.to_string()),
        },
    );
}
