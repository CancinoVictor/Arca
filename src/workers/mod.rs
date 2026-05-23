pub mod pipeline;
pub mod purge;

use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{mpsc, Semaphore};

use crate::repositories::media::MediaRepository;

const WORKER_CONCURRENCY: usize = 4;

#[derive(Debug)]
pub enum Job {
    Process {
        media_id: String,
        user_id: String,
        original_path: PathBuf,
        mime_type: String,
    },
}

pub fn spawn(mut rx: mpsc::Receiver<Job>, repo: Arc<dyn MediaRepository>, storage_root: PathBuf) {
    let semaphore = Arc::new(Semaphore::new(WORKER_CONCURRENCY));
    tokio::spawn(async move {
        while let Some(job) = rx.recv().await {
            let permit = match semaphore.clone().acquire_owned().await {
                Ok(p) => p,
                Err(_) => break,
            };
            let repo = repo.clone();
            let storage_root = storage_root.clone();
            tokio::spawn(async move {
                let _permit = permit;
                match job {
                    Job::Process {
                        media_id,
                        user_id,
                        original_path,
                        mime_type,
                    } => {
                        if let Err(e) = pipeline::process(
                            &repo,
                            &storage_root,
                            &media_id,
                            &user_id,
                            &original_path,
                            &mime_type,
                        )
                        .await
                        {
                            tracing::warn!(media_id, error = ?e, "background processing failed");
                        }
                    }
                }
            });
        }
    });
}
