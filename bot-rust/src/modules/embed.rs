use serde_json::Value;
use twilight_model::channel::message::Embed;
use twilight_model::util::Timestamp;
use twilight_util::builder::embed::{EmbedAuthorBuilder, EmbedBuilder, EmbedFieldBuilder, EmbedFooterBuilder, ImageSource};

pub fn fill(text: &str, vars: &[(&str, String)]) -> String {
    vars.iter().fold(text.to_string(), |acc, (k, v)| acc.replace(&format!("{{{k}}}"), v))
}

fn text(v: &Value, key: &str, vars: &[(&str, String)]) -> Option<String> {
    v.get(key).and_then(Value::as_str).map(|s| fill(s, vars)).filter(|s| !s.trim().is_empty())
}

fn image(url: Option<String>) -> Option<ImageSource> {
    url.filter(|u| u.starts_with("https://")).and_then(|u| ImageSource::url(u).ok())
}

pub fn render(v: &Value, vars: &[(&str, String)]) -> (Option<String>, Option<Embed>) {
    let content = text(v, "content", vars);
    let mut b = EmbedBuilder::new();
    let mut empty = true;

    if let Some(t) = text(v, "title", vars) {
        b = b.title(t);
        empty = false;
    }
    if let Some(u) = text(v, "url", vars).filter(|u| u.starts_with("https://")) {
        b = b.url(u);
    }
    if let Some(d) = text(v, "description", vars) {
        b = b.description(d);
        empty = false;
    }
    let color = v
        .get("color")
        .and_then(Value::as_str)
        .and_then(|c| u32::from_str_radix(c.trim_start_matches('#'), 16).ok())
        .unwrap_or(0x7c3aed);
    b = b.color(color);

    if let Some(author) = v.get("author") {
        if let Some(name) = text(author, "name", vars) {
            let mut a = EmbedAuthorBuilder::new(name);
            if let Some(icon) = image(text(author, "icon", vars)) {
                a = a.icon_url(icon);
            }
            b = b.author(a);
            empty = false;
        }
    }
    if let Some(src) = image(text(v, "thumbnail", vars)) {
        b = b.thumbnail(src);
        empty = false;
    }
    if let Some(src) = image(text(v, "image", vars)) {
        b = b.image(src);
        empty = false;
    }
    if let Some(fields) = v.get("fields").and_then(Value::as_array) {
        for f in fields.iter().take(25) {
            if let (Some(name), Some(value)) = (text(f, "name", vars), text(f, "value", vars)) {
                let mut field = EmbedFieldBuilder::new(name, value);
                if f.get("inline").and_then(Value::as_bool).unwrap_or(false) {
                    field = field.inline();
                }
                b = b.field(field);
                empty = false;
            }
        }
    }
    if let Some(footer) = v.get("footer") {
        if let Some(t) = text(footer, "text", vars) {
            let mut f = EmbedFooterBuilder::new(t);
            if let Some(icon) = image(text(footer, "icon", vars)) {
                f = f.icon_url(icon);
            }
            b = b.footer(f);
        }
    }
    if v.get("timestamp").and_then(Value::as_bool).unwrap_or(false) {
        if let Ok(ts) = Timestamp::from_secs(chrono::Utc::now().timestamp()) {
            b = b.timestamp(ts);
        }
    }

    let embed = if empty { None } else { b.validate().ok().map(EmbedBuilder::build) };
    (content, embed)
}
