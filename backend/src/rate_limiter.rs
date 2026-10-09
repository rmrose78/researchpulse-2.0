use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{Duration, Instant};

#[derive(Clone, Debug)]
pub struct TokenBucketRateLimiter {
    state: Arc<Mutex<RateLimiterState>>,
    capacity: f64,
    refill_rate: f64,
}

#[derive(Debug)]
struct RateLimiterState {
    tokens: f64,
    last_refill: Instant,
}

impl TokenBucketRateLimiter {
    pub fn new(capacity: f64, refill_rate: f64) -> Self {
        Self {
            state: Arc::new(Mutex::new(RateLimiterState {
                tokens: capacity,
                last_refill: Instant::now(),
            })),
            capacity,
            refill_rate,
        }
    }

    pub async fn acquire(&self) {
        loop {
            let mut state = self.state.lock().await;
            let now = Instant::now();
            let elapsed = now.duration_since(state.last_refill).as_secs_f64();
            state.tokens = (state.tokens + elapsed * self.refill_rate).min(self.capacity);
            state.last_refill = now;

            if state.tokens >= 1.0 {
                state.tokens -= 1.0;
                return;
            }

            let needed = 1.0 - state.tokens;
            let wait_secs = needed / self.refill_rate;
            drop(state);
            tokio::time::sleep(Duration::from_secs_f64(wait_secs)).await;
        }
    }
}
