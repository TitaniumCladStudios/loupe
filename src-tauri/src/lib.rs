use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
use base64::Engine;
use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager};
use tower_http::cors::CorsLayer;

// --- HTTP Server (port 7700) ---

#[derive(Clone)]
struct ServerState {
    app: AppHandle,
}

#[derive(Deserialize)]
struct ImagePayload {
    image: String,
}

async fn handle_figma(
    State(state): State<ServerState>,
    Json(payload): Json<ImagePayload>,
) -> StatusCode {
    let _ = state.app.emit("figma-image", &payload.image);
    StatusCode::OK
}

async fn handle_capture(
    State(state): State<ServerState>,
    Json(payload): Json<ImagePayload>,
) -> StatusCode {
    let _ = state.app.emit("web-capture", &payload.image);
    StatusCode::OK
}

fn start_server(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let state = ServerState { app };
        let router = Router::new()
            .route("/figma", post(handle_figma))
            .route("/capture", post(handle_capture))
            .layer(CorsLayer::permissive())
            .with_state(state);

        let listener = tokio::net::TcpListener::bind("127.0.0.1:7700")
            .await
            .expect("Failed to bind port 7700");
        axum::serve(listener, router)
            .await
            .expect("HTTP server error");
    });
}

// --- Picker injection script ---

fn picker_script() -> String {
    r#"
(async function() {
    if (window.__loupePickerActive) return;
    window.__loupePickerActive = true;

    // Load html2canvas
    if (!window.html2canvas) {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(s);
        await new Promise((resolve, reject) => {
            s.onload = resolve;
            s.onerror = reject;
        });
    }

    const overlay = document.createElement('div');
    overlay.id = '__loupe_overlay';
    overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #6366f1;background:rgba(99,102,241,0.08);z-index:2147483647;transition:all 0.05s ease;display:none;';
    document.body.appendChild(overlay);

    let hoveredEl = null;

    document.addEventListener('mousemove', function(e) {
        hoveredEl = e.target;
        if (hoveredEl === overlay || hoveredEl === document.body || hoveredEl === document.documentElement) {
            overlay.style.display = 'none';
            return;
        }
        const rect = hoveredEl.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
    }, true);

    document.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (!hoveredEl || hoveredEl === overlay) return;

        overlay.style.border = '2px solid #22c55e';
        overlay.style.background = 'rgba(34,197,94,0.12)';

        try {
            const canvas = await html2canvas(hoveredEl, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
            });
            const dataUrl = canvas.toDataURL('image/png');

            await fetch('http://localhost:7700/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataUrl })
            });
        } catch(err) {
            console.error('Loupe capture error:', err);
        }

        setTimeout(() => {
            overlay.style.border = '2px solid #6366f1';
            overlay.style.background = 'rgba(99,102,241,0.08)';
        }, 600);
    }, true);
})();
"#
    .to_string()
}

// --- Tauri Commands ---

#[tauri::command]
async fn open_browser(app: AppHandle, url: String) -> Result<(), String> {
    // Close existing browser window if open
    if let Some(existing) = app.get_webview_window("browse") {
        let _ = existing.close();
    }

    let script = picker_script();

    tauri::WebviewWindowBuilder::new(
        &app,
        "browse",
        tauri::WebviewUrl::External(url.parse().map_err(|e| format!("{e}"))?),
    )
    .title("Loupe Browser — click any element to capture")
    .inner_size(1200.0, 800.0)
    .on_page_load(move |webview, payload| {
        if matches!(
            payload.event(),
            tauri::webview::PageLoadEvent::Finished
        ) {
            let _ = webview.eval(&script);
        }
    })
    .build()
    .map_err(|e| format!("{e}"))?;

    Ok(())
}

#[tauri::command]
async fn close_browser(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("browse") {
        w.close().map_err(|e| format!("{e}"))?;
    }
    Ok(())
}

#[tauri::command]
async fn save_image(path: String, data: String) -> Result<(), String> {
    let base64_data = data
        .strip_prefix("data:image/png;base64,")
        .unwrap_or(&data);

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| format!("base64 decode error: {e}"))?;

    std::fs::write(&path, bytes).map_err(|e| format!("file write error: {e}"))?;
    Ok(())
}

// --- App Entry ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_browser,
            close_browser,
            save_image
        ])
        .setup(|app| {
            start_server(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
