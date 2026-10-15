pub mod badwords;
pub mod command;
pub mod dox;
pub mod escalation;
pub mod flood;
pub mod leetspeak;
pub mod links;
pub mod media;
pub mod mentions;
pub mod toxicity;

#[allow(unused_imports)]
pub use flood::{AntiFloodTracker, FloodAction, MessageRecord};
#[allow(unused_imports)]
pub use leetspeak::unmask_leetspeak;
#[allow(unused_imports)]
pub use links::{evaluate_link, extract_urls, LinkVerdict, DEFAULT_ALLOWED_DOMAINS};
#[allow(unused_imports)]
pub use media::{
    scan_ocr_text, HttpVisionOcrEngine, MockVisionOcrEngine, ScamVerdict, VisionOcrEngine,
};
#[allow(unused_imports)]
pub use mentions::{check_mentions, evaluate_message_mentions, MentionVerdict};
#[allow(unused_imports)]
pub use toxicity::{
    classify_toxicity, classify_toxicity_with_context, TargetKind, ToxicityCategory,
    ToxicityVerdict,
};
#[allow(unused_imports)]
pub use dox::{detect_dox, DoxKind};
#[allow(unused_imports)]
pub use badwords::find_badword;
