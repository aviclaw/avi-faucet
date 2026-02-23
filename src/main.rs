use axum::{
    routing::{get, post},
    Router, Json,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct FaucetConfig {
    pub rpc_url: String,
    pub airdrop_amount: u64,
    pub rate_limit_secs: u64,
}

pub struct AppState {
    config: FaucetConfig,
    client: Client,
    last_claim: Arc<Mutex<HashMap<String, Instant>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AirdropRequest {
    pub address: String,
    pub network: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AirdropResponse {
    pub success: bool,
    pub tx_signature: Option<String>,
    pub message: String,
    pub lamports: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RpcRequest {
    jsonrpc: String,
    id: u32,
    method: String,
    params: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RpcResponse {
    #[serde(rename = "jsonrpc")]
    pub jsonrpc: String,
    pub id: u32,
    pub result: Option<String>,
    pub error: Option<RpcError>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RpcError {
    code: i32,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkStatus {
    pub network: String,
    pub slot: u64,
    pub version: String,
}

fn get_rpc_url(network: &str) -> String {
    match network {
        "devnet" => "https://api.devnet.solana.com".to_string(),
        "testnet" => "https://api.testnet.solana.com".to_string(),
        _ => "https://api.devnet.solana.com".to_string(),
    }
}

async fn request_airdrop(
    Json(payload): Json<AirdropRequest>,
    state: axum::extract::State<Arc<AppState>>,
) -> Json<AirdropResponse> {
    let address = payload.address.trim();
    let network = payload.network.as_deref().unwrap_or("devnet");

    // Validate address (basic base58 check)
    if address.len() < 32 || address.len() > 44 {
        return Json(AirdropResponse {
            success: false,
            tx_signature: None,
            message: "Invalid Solana address".to_string(),
            lamports: 0,
        });
    }

    // Check rate limit
    let mut last_claim = state.last_claim.lock().await;
    if let Some(last) = last_claim.get(address) {
        let elapsed = last.elapsed();
        if elapsed < Duration::from_secs(state.config.rate_limit_secs) {
            let remaining = state.config.rate_limit_secs - elapsed.as_secs();
            return Json(AirdropResponse {
                success: false,
                tx_signature: None,
                message: format!("Rate limited. Try again in {} seconds", remaining),
                lamports: 0,
            });
        }
    }

    let rpc_url = get_rpc_url(network);

    // Build RPC request
    let request = RpcRequest {
        jsonrpc: "2.0".to_string(),
        id: 1,
        method: "requestAirdrop".to_string(),
        params: serde_json::json!([address, state.config.airdrop_amount]),
    };

    match state.client.post(&rpc_url)
        .json(&request)
        .send()
        .await
    {
        Ok(response) => {
            match response.json::<RpcResponse>().await {
                Ok(result) => {
                    if let Some(error) = result.error {
                        Json(AirdropResponse {
                            success: false,
                            tx_signature: None,
                            message: format!("RPC Error: {}", error.message),
                            lamports: 0,
                        })
                    } else if let Some(signature) = result.result {
                        last_claim.insert(address.to_string(), Instant::now());
                        let sol = state.config.airdrop_amount as f64 / 1e9;
                        Json(AirdropResponse {
                            success: true,
                            tx_signature: Some(signature),
                            message: format!("Airdropped {} SOL to {}", sol, address),
                            lamports: state.config.airdrop_amount,
                        })
                    } else {
                        Json(AirdropResponse {
                            success: false,
                            tx_signature: None,
                            message: "No result from RPC".to_string(),
                            lamports: 0,
                        })
                    }
                }
                Err(e) => Json(AirdropResponse {
                    success: false,
                    tx_signature: None,
                    message: format!("Parse error: {}", e),
                    lamports: 0,
                }),
            }
        }
        Err(e) => Json(AirdropResponse {
            success: false,
            tx_signature: None,
            message: format!("Request failed: {}", e),
            lamports: 0,
        }),
    }
}

async fn get_status(
    state: axum::extract::State<Arc<AppState>>,
) -> Json<NetworkStatus> {
    let rpc_url = get_rpc_url("devnet");
    
    let request = RpcRequest {
        jsonrpc: "2.0".to_string(),
        id: 1,
        method: "getSlot".to_string(),
        params: serde_json::json!([]),
    };

    let slot: u64 = state.client.post(&rpc_url)
        .json(&request)
        .send()
        .await
        .ok()
        .and_then(|r| r.json::<RpcResponse>().ok())
        .and_then(|r| r.result)
        .and_then(|v| v.as_u64())
        .unwrap_or(0);

    let request = RpcRequest {
        jsonrpc: "2.0".to_string(),
        id: 2,
        method: "getVersion".to_string(),
        params: serde_json::json!([]),
    };

    let version: String = state.client.post(&rpc_url)
        .json(&request)
        .send()
        .await
        .ok()
        .and_then(|r| r.json::<RpcResponse>().ok())
        .and_then(|r| r.result)
        .and_then(|v| v.get("solanaCore").cloned())
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| "unknown".to_string());

    Json(NetworkStatus {
        network: "devnet".to_string(),
        slot,
        version,
    })
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    dotenv::dotenv().ok();

    let rpc_url = std::env::var("SOLANA_RPC_URL")
        .unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());
    
    let airdrop_amount: u64 = std::env::var("AIRDROP_AMOUNT")
        .unwrap_or_else(|_| "5000000000".to_string()) // 5 SOL default
        .parse()
        .unwrap_or(5_000_000_000);

    let rate_limit_secs: u64 = std::env::var("RATE_LIMIT_SECS")
        .unwrap_or_else(|_| "3600".to_string())
        .parse()
        .unwrap_or(3600);

    let config = FaucetConfig {
        rpc_url,
        airdrop_amount,
        rate_limit_secs,
    };

    let state = Arc::new(AppState {
        config,
        client: Client::new(),
        last_claim: Arc::new(Mutex::new(HashMap::new())),
    });

    let app = Router::new()
        .route("/airdrop", post(request_airdrop))
        .route("/status", get(get_status))
        .with_state(state);

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse()
        .unwrap_or(3000);

    println!("🦞 Avi Faucet running on http://0.0.0.0:{}", port);
    println!("   Airdrop: {} SOL", airdrop_amount as f64 / 1e9);
    println!("   Rate limit: {} seconds", rate_limit_secs);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
