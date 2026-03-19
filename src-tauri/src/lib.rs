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

    async function loadHtml2Canvas(doc) {
        const win = doc.defaultView || window;
        if (win.html2canvas) return;
        const s = doc.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        (doc.head || doc.documentElement).appendChild(s);
        await new Promise((resolve, reject) => {
            s.onload = resolve;
            s.onerror = reject;
        });
    }

    await loadHtml2Canvas(document);

    // Single overlay on the top-level page
    const overlay = document.createElement('div');
    overlay.id = '__loupe_overlay';
    overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #6366f1;background:rgba(99,102,241,0.08);z-index:2147483647;transition:all 0.05s ease;display:none;';
    document.body.appendChild(overlay);

    let activeTarget = null;
    let activeWin = null;

    function showOverlay(rect) {
        overlay.style.display = 'block';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
    }

    function flashOverlay(color, bg) {
        overlay.style.border = '2px solid ' + color;
        overlay.style.background = bg;
        setTimeout(() => {
            overlay.style.border = '2px solid #6366f1';
            overlay.style.background = 'rgba(99,102,241,0.08)';
        }, 600);
    }

    async function captureElement(el, win) {
        flashOverlay('#22c55e', 'rgba(34,197,94,0.12)');
        try {
            const h2c = win.html2canvas || window.html2canvas;
            const canvas = await h2c(el, {
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
    }

    // Parent document: only handles non-iframe elements
    document.addEventListener('mousemove', function(e) {
        if (e.target.tagName === 'IFRAME') {
            // Let the iframe handle its own hover
            overlay.style.display = 'none';
            activeTarget = null;
            return;
        }
        if (e.target === overlay || e.target === document.body || e.target === document.documentElement) {
            overlay.style.display = 'none';
            activeTarget = null;
            return;
        }
        activeTarget = e.target;
        activeWin = window;
        showOverlay(e.target.getBoundingClientRect());
    }, true);

    document.addEventListener('click', async function(e) {
        if (!activeTarget || e.target.tagName === 'IFRAME') return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        await captureElement(activeTarget, activeWin);
    }, true);

    // Inject picker into a same-origin iframe
    function setupIframe(iframe) {
        if (iframe.__loupeReady) return;
        let iframeDoc;
        try {
            iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc || !iframeDoc.body) return;
        } catch(e) {
            return; // cross-origin
        }
        iframe.__loupeReady = true;

        const iframeWin = iframe.contentWindow;

        // Load html2canvas inside the iframe
        loadHtml2Canvas(iframeDoc).then(() => {
            iframeDoc.addEventListener('mousemove', function(e) {
                if (e.target === iframeDoc.body || e.target === iframeDoc.documentElement) {
                    overlay.style.display = 'none';
                    activeTarget = null;
                    return;
                }
                activeTarget = e.target;
                activeWin = iframeWin;

                // Translate iframe-local rect to top-level coordinates
                const elRect = e.target.getBoundingClientRect();
                const iframeRect = iframe.getBoundingClientRect();
                showOverlay({
                    top: elRect.top + iframeRect.top,
                    left: elRect.left + iframeRect.left,
                    width: elRect.width,
                    height: elRect.height,
                });
            }, true);

            iframeDoc.addEventListener('click', async function(e) {
                if (!activeTarget) return;
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                await captureElement(activeTarget, activeWin);
            }, true);
        }).catch(() => {});
    }

    function scanIframes() {
        document.querySelectorAll('iframe').forEach(iframe => {
            setupIframe(iframe);
            // Also retry when iframe navigates or loads new content
            if (!iframe.__loupeLoadListener) {
                iframe.__loupeLoadListener = true;
                iframe.addEventListener('load', () => {
                    iframe.__loupeReady = false;
                    setupIframe(iframe);
                });
            }
        });
    }

    scanIframes();

    const observer = new MutationObserver(scanIframes);
    observer.observe(document.body, { childList: true, subtree: true });

    // Storybook lazy-loads its iframe; poll until we find and inject into it
    const poll = setInterval(() => {
        scanIframes();
        const injected = document.querySelector('iframe[__loupeReady]') ||
            [...document.querySelectorAll('iframe')].some(f => f.__loupeReady);
        if (injected) clearInterval(poll);
    }, 1000);
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
