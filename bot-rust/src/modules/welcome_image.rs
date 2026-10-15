//! Carte « BIENVENUE » générée à l'arrivée d'un membre (dégradé ou image de fond, avatar rond, textes personnalisables).
use ab_glyph::{FontRef, PxScale};
use image::{imageops, Rgba, RgbaImage};
use imageproc::drawing::{draw_text_mut, text_size};
use std::io::Cursor;

const FONT: &[u8] = include_bytes!("../../assets/DejaVuSans-Bold.ttf");
const W: u32 = 1000;
const H: u32 = 400;
const AVATAR: u32 = 150;

pub struct Style {
    pub title: String,
    pub name: String,
    pub subtitle: String,
    pub color_a: String,
    pub color_b: String,
}

fn hex(s: &str, fallback: [u8; 3]) -> [u8; 3] {
    let s = s.trim().trim_start_matches('#');
    u32::from_str_radix(s, 16).ok().filter(|_| s.len() == 6).map(|v| [(v >> 16) as u8, (v >> 8) as u8, v as u8]).unwrap_or(fallback)
}

fn centered(img: &mut RgbaImage, font: &FontRef, text: &str, y: i32, size: f32, max_width: u32) {
    let (text, size) = fit(font, text, size, max_width);
    let (w, _) = text_size(PxScale::from(size), font, &text);
    draw_text_mut(img, Rgba([255, 255, 255, 255]), (img.width() as i32 - w as i32) / 2, y, PxScale::from(size), font, &text);
}

/// Réduit la taille jusqu'à ce que le texte tienne dans `max_width`.
fn fit(font: &FontRef, text: &str, mut size: f32, max_width: u32) -> (String, f32) {
    while size > 14.0 && text_size(PxScale::from(size), font, text).0 > max_width {
        size -= 2.0;
    }
    (text.to_string(), size)
}

/// Fond : image « cover » assombrie, sinon dégradé diagonal entre deux couleurs.
fn canvas(w: u32, h: u32, background: Option<RgbaImage>, ca: &str, cb: &str) -> RgbaImage {
    let (a, b) = (hex(ca, [30, 64, 175]), hex(cb, [59, 130, 246]));
    match background {
        Some(bg) => {
            let scale = (w as f32 / bg.width() as f32).max(h as f32 / bg.height() as f32);
            let resized = imageops::resize(&bg, (bg.width() as f32 * scale).ceil() as u32, (bg.height() as f32 * scale).ceil() as u32, imageops::FilterType::Triangle);
            let mut cropped = imageops::crop_imm(&resized, (resized.width() - w) / 2, (resized.height() - h) / 2, w, h).to_image();
            for p in cropped.pixels_mut() {
                for c in 0..3 {
                    p[c] = (p[c] as f32 * 0.45) as u8; // assombri pour garder les textes lisibles
                }
            }
            cropped
        }
        None => RgbaImage::from_fn(w, h, |x, y| {
            let t = (x as f32 / w as f32) * 0.6 + (y as f32 / h as f32) * 0.4;
            let c = |i: usize| (a[i] as f32 + (b[i] as f32 - a[i] as f32) * t) as u8;
            Rgba([c(0), c(1), c(2), 255])
        }),
    }
}

/// Avatar rond avec un anneau blanc (disque translucide si l'avatar est absent).
fn paste_avatar(img: &mut RgbaImage, avatar: Option<RgbaImage>, cx: f32, cy: f32, d: u32) {
    let r = d as f32 / 2.0;
    let pic = avatar.map(|a| imageops::resize(&a, d, d, imageops::FilterType::Triangle));
    for y in 0..img.height() {
        for x in 0..img.width() {
            let dist = ((x as f32 - cx).powi(2) + (y as f32 - cy).powi(2)).sqrt();
            if dist <= r {
                let px = match &pic {
                    Some(p) => *p.get_pixel(((x as f32 - (cx - r)) as u32).min(d - 1), ((y as f32 - (cy - r)) as u32).min(d - 1)),
                    None => Rgba([255, 255, 255, 60]),
                };
                img.put_pixel(x, y, px);
            } else if dist <= r + 6.0 {
                img.put_pixel(x, y, Rgba([255, 255, 255, 255]));
            }
        }
    }
}

fn png(img: &RgbaImage) -> Option<Vec<u8>> {
    let mut out = Cursor::new(Vec::new());
    img.write_to(&mut out, image::ImageFormat::Png).ok()?;
    Some(out.into_inner())
}

/// Image PNG de la carte. `avatar` et `background` sont déjà décodés (le réseau reste hors de cette fonction).
pub fn render_png(avatar: Option<RgbaImage>, background: Option<RgbaImage>, s: &Style) -> Option<Vec<u8>> {
    let font = FontRef::try_from_slice(FONT).ok()?;
    let mut img = canvas(W, H, background, &s.color_a, &s.color_b);
    paste_avatar(&mut img, avatar, W as f32 / 2.0, 30.0 + AVATAR as f32 / 2.0, AVATAR);
    centered(&mut img, &font, &s.title.to_uppercase(), 208, 62.0, W - 80);
    centered(&mut img, &font, &s.name, 282, 40.0, W - 80);
    centered(&mut img, &font, &s.subtitle, 336, 26.0, W - 80);
    png(&img)
}

pub struct RankStyle {
    pub name: String,
    pub level: i64,
    pub rank: Option<i64>,
    pub into: i64,
    pub need: i64,
    pub color_a: String,
    pub color_b: String,
}

/// Carte de rang 1000×300 : avatar, pseudo, niveau, classement et barre de progression.
pub fn render_rank_png(avatar: Option<RgbaImage>, background: Option<RgbaImage>, s: &RankStyle) -> Option<Vec<u8>> {
    let font = FontRef::try_from_slice(FONT).ok()?;
    let (w, h) = (1000u32, 300u32);
    let mut img = canvas(w, h, background, &s.color_a, &s.color_b);
    paste_avatar(&mut img, avatar, 30.0 + 90.0, h as f32 / 2.0 - 20.0, 180);
    let white = Rgba([255, 255, 255, 255]);
    let (name, size) = fit(&font, &s.name, 48.0, 560);
    draw_text_mut(&mut img, white, 250, 50, PxScale::from(size), &font, &name);
    let top = format!("NIVEAU {}{}", s.level, s.rank.map(|r| format!("   ·   #{r}")).unwrap_or_default());
    draw_text_mut(&mut img, white, 250, 120, PxScale::from(34.0), &font, &top);
    let xp = format!("{} / {} XP", s.into, s.need);
    draw_text_mut(&mut img, white, 250, 175, PxScale::from(24.0), &font, &xp);
    // Barre : fond translucide puis remplissage blanc.
    let (bx, by, bw, bh) = (250u32, 225u32, 700u32, 28u32);
    let filled = ((s.into.max(0) as f64 / s.need.max(1) as f64).min(1.0) * bw as f64) as u32;
    for y in by..by + bh {
        for x in bx..bx + bw {
            let on = x - bx < filled;
            let px = img.get_pixel_mut(x, y);
            *px = if on { white } else { Rgba([px[0] / 3, px[1] / 3, px[2] / 3, 255]) };
        }
    }
    png(&img)
}

async fn download(url: &str) -> Option<RgbaImage> {
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(8)).build().ok()?;
    let bytes = client.get(url).send().await.ok()?.error_for_status().ok()?.bytes().await.ok()?;
    image::load_from_memory(&bytes).ok().map(|i| i.to_rgba8())
}

pub async fn generate(avatar_url: &str, background_url: Option<&str>, style: Style) -> Option<Vec<u8>> {
    let avatar = download(avatar_url).await;
    let background = match background_url.filter(|u| u.starts_with("https://")) {
        Some(u) => download(u).await,
        None => None,
    };
    tokio::task::spawn_blocking(move || render_png(avatar, background, &style)).await.ok()?
}

/// Carte de classement : titre puis jusqu'à 10 lignes (nom, valeur). Pas d'avatars : 10 téléchargements seraient trop lents.
pub fn render_board_png(title: &str, rows: &[(String, String)], background: Option<RgbaImage>, ca: &str, cb: &str) -> Option<Vec<u8>> {
    let font = FontRef::try_from_slice(FONT).ok()?;
    let (w, h) = (1000u32, 130 + 52 * rows.len().max(1) as u32);
    let mut img = canvas(w, h, background, ca, cb);
    let white = Rgba([255, 255, 255, 255]);
    draw_text_mut(&mut img, white, 40, 30, PxScale::from(46.0), &font, &title.to_uppercase());
    if rows.is_empty() {
        draw_text_mut(&mut img, white, 40, 120, PxScale::from(28.0), &font, "Personne pour l'instant");
    }
    for (i, (name, value)) in rows.iter().enumerate() {
        let y = 110 + 52 * i as i32;
        for py in (y - 6) as u32..(y + 40) as u32 {
            for px in 30..w - 30 {
                let p = img.get_pixel_mut(px, py);
                *p = Rgba([p[0] / 2, p[1] / 2, p[2] / 2, 255]);
            }
        }
        draw_text_mut(&mut img, white, 50, y, PxScale::from(28.0), &font, &format!("{}", i + 1));
        let (name, size) = fit(&font, name, 28.0, 520);
        draw_text_mut(&mut img, white, 110, y, PxScale::from(size), &font, &name);
        let (value, size) = fit(&font, value, 26.0, 300);
        let vw = text_size(PxScale::from(size), &font, &value).0 as i32;
        draw_text_mut(&mut img, white, w as i32 - 50 - vw, y, PxScale::from(size), &font, &value);
    }
    png(&img)
}

pub async fn generate_board(title: String, rows: Vec<(String, String)>, background_url: Option<&str>, ca: String, cb: String) -> Option<Vec<u8>> {
    let background = match background_url.filter(|u| u.starts_with("https://")) {
        Some(u) => download(u).await,
        None => None,
    };
    tokio::task::spawn_blocking(move || render_board_png(&title, &rows, background, &ca, &cb)).await.ok()?
}

/// Télécharge avatar et fond puis dessine la carte de rang.
pub async fn generate_rank(avatar_url: &str, background_url: Option<&str>, style: RankStyle) -> Option<Vec<u8>> {
    let avatar = download(avatar_url).await;
    let background = match background_url.filter(|u| u.starts_with("https://")) {
        Some(u) => download(u).await,
        None => None,
    };
    tokio::task::spawn_blocking(move || render_rank_png(avatar, background, &style)).await.ok()?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn style() -> Style {
        Style { title: "Bienvenue".into(), name: "Tom".into(), subtitle: "Tu es notre 1 247e membre".into(), color_a: "#1e3a8a".into(), color_b: "zzz".into() }
    }

    #[test]
    fn renders_a_valid_png_with_or_without_avatar() {
        for avatar in [None, Some(RgbaImage::from_pixel(64, 64, Rgba([200, 30, 30, 255])))] {
            let png = render_png(avatar, None, &style()).unwrap();
            let img = image::load_from_memory(&png).unwrap();
            assert_eq!((img.width(), img.height()), (W, H));
        }
    }

    #[test]
    fn renders_a_rank_card_even_with_overflowing_progress() {
        let s = RankStyle { name: "Un pseudo vraiment très très long pour tester".into(), level: 12, rank: Some(3), into: 900, need: 400, color_a: "#111111".into(), color_b: "#3b82f6".into() };
        let img = image::load_from_memory(&render_rank_png(None, None, &s).unwrap()).unwrap();
        assert_eq!((img.width(), img.height()), (1000, 300));
    }

    #[test]
    fn renders_a_board_with_zero_or_ten_rows() {
        let rows: Vec<_> = (1..=10).map(|i| (format!("Joueur {i}"), format!("{i}000 PC"))).collect();
        for r in [&rows[..], &[]] {
            assert!(image::load_from_memory(&render_board_png("Classement", r, None, "#111111", "#3b82f6").unwrap()).is_ok());
        }
    }

    #[test]
    fn bad_hex_falls_back() {
        assert_eq!(hex("#ff0000", [0, 0, 0]), [255, 0, 0]);
        assert_eq!(hex("nope", [1, 2, 3]), [1, 2, 3]);
    }
}
