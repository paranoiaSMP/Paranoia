use std::sync::LazyLock;
use regex::Regex;

static MULTI_LEET: LazyLock<Vec<(&'static str, &'static str)>> = LazyLock::new(|| {
    vec![
        (r"\/\/", "w"),
        (r"/\", "a"),
        (r"|3", "b"),
        (r"|<", "k"),
        (r"|_", "l"),
        (r"|\|", "n"),
    ]
});

static WORD_SEPARATORS_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"([a-z0-9])[\.\-_*\/\\|\+~,:;\x22\(\)\[\]\{\}#%^&=?]+([a-z0-9])"#)
        .expect("Valid regex for word separator")
});

static DISCORD_MENTION_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<@[!&]?[0-9]+>").expect("Valid regex for mentions")
});

static DISCORD_CHANNEL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<#[0-9]+>").expect("Valid regex for channels")
});

static URL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"https?://\S+").expect("Valid regex for urls")
});

fn normalize_math_alphanumeric(c: char) -> Option<char> {
    let u = c as u32;
    if (0x1D400..=0x1D6A3).contains(&u) {
        let offset = u - 0x1D400;
        let style_pos = offset % 52;
        let letter_idx = if style_pos < 26 {
            style_pos
        } else {
            style_pos - 26
        };
        return char::from_u32('a' as u32 + letter_idx);
    }
    if (0x1D7CE..=0x1D7FF).contains(&u) {
        let digit_idx = (u - 0x1D7CE) % 10;
        return char::from_u32('0' as u32 + digit_idx);
    }
    None
}

pub fn normalize_unicode_char(c: char) -> Option<char> {
    match c {
        '\u{200B}' | '\u{200C}' | '\u{200D}' | '\u{FEFF}' | '\u{00AD}' | '\u{2060}'
        | '\u{200E}' | '\u{200F}' | '\u{034F}' | '\u{202A}'..='\u{202E}' | '\u{2066}'..='\u{2069}' => None,

        // Circled Latin small letters (U+24D0..=U+24E9)
        '\u{24D0}'..='\u{24E9}' => {
            let offset = (c as u32) - 0x24D0;
            char::from_u32('a' as u32 + offset)
        }

        // Circled Latin capital letters (U+24B6..=U+24CF)
        '\u{24B6}'..='\u{24CF}' => {
            let offset = (c as u32) - 0x24B6;
            char::from_u32('a' as u32 + offset)
        }

        // Mathematical Alphanumeric Symbols (U+1D400..=U+1D7FF)
        '\u{1D400}'..='\u{1D7FF}' => normalize_math_alphanumeric(c),

        // Combining diacritical marks
        '\u{0300}'..='\u{036F}' => None,

        // Cyrillic lookalikes
        'а' | 'А' => Some('a'),
        'б' | 'Б' => Some('b'),
        'в' | 'В' => Some('v'),
        'г' | 'Г' => Some('g'),
        'ԁ' | 'Ԁ' => Some('d'),
        'е' | 'Е' | 'ё' | 'Ё' | 'є' | 'Є' => Some('e'),
        'ж' | 'Ж' => Some('z'),
        'з' | 'З' => Some('z'),
        'і' | 'І' | 'ї' | 'Ї' => Some('i'),
        'ј' | 'Ј' => Some('j'),
        'к' | 'К' => Some('k'),
        'м' | 'М' => Some('m'),
        'н' | 'Н' => Some('n'),
        'о' | 'О' => Some('o'),
        'п' | 'П' => Some('n'),
        'р' | 'Р' => Some('p'),
        'с' | 'С' => Some('c'),
        'т' | 'Т' => Some('t'),
        'у' | 'У' => Some('y'),
        'х' | 'Х' => Some('x'),
        'ѡ' | 'Ѡ' | 'ԝ' | 'Ԝ' => Some('w'),
        'ԛ' | 'Ԛ' => Some('q'),
        'ѕ' | 'Ѕ' => Some('s'),

        // Greek lookalikes
        'α' | 'Α' => Some('a'),
        'β' | 'Β' => Some('b'),
        'γ' | 'Γ' => Some('y'),
        'δ' | 'Δ' => Some('d'),
        'ε' | 'Ε' => Some('e'),
        'η' | 'Η' => Some('n'),
        'θ' | 'Θ' => Some('o'),
        'ι' | 'Ι' => Some('i'),
        'κ' | 'Κ' => Some('k'),
        'λ' | 'Λ' => Some('l'),
        'μ' | 'Μ' => Some('m'),
        'ν' | 'Ν' => Some('v'),
        'ξ' | 'Ξ' => Some('x'),
        'ο' | 'Ο' => Some('o'),
        'π' | 'Π' => Some('n'),
        'ρ' | 'Ρ' => Some('p'),
        'σ' | 'Σ' | 'ς' => Some('s'),
        'τ' | 'Τ' => Some('t'),
        'υ' | 'Υ' => Some('u'),
        'χ' | 'Χ' => Some('x'),
        'ψ' | 'Ψ' => Some('y'),
        'ω' | 'Ω' => Some('w'),

        // Fullwidth ASCII range
        '\u{FF01}'..='\u{FF5E}' => {
            let ascii_code = (c as u32) - 0xFEE0;
            char::from_u32(ascii_code).map(|ch| ch.to_ascii_lowercase())
        }

        // Latin with diacritics
        'à' | 'á' | 'â' | 'ã' | 'ä' | 'å' | 'ā' | 'ă' | 'ą' | 'À' | 'Á' | 'Â' | 'Ã' | 'Ä' | 'Å' => Some('a'),
        'æ' | 'Æ' => Some('e'),
        'ç' | 'ć' | 'č' | 'ĉ' | 'ċ' | 'Ç' | 'Ć' | 'Č' => Some('c'),
        'è' | 'é' | 'ê' | 'ë' | 'ē' | 'ĕ' | 'ė' | 'ę' | 'ě' | 'È' | 'É' | 'Ê' | 'Ë' => Some('e'),
        'ì' | 'í' | 'î' | 'ï' | 'ī' | 'ĭ' | 'į' | 'ı' | 'Ì' | 'Í' | 'Î' | 'Ï' => Some('i'),
        'ñ' | 'ń' | 'ņ' | 'ň' | 'Ñ' | 'Ń' => Some('n'),
        'ò' | 'ó' | 'ô' | 'õ' | 'ö' | 'ø' | 'ō' | 'ŏ' | 'ő' | 'Ò' | 'Ó' | 'Ô' | 'Õ' | 'Ö' | 'Ø' => Some('o'),
        'œ' | 'Œ' => Some('e'),
        'ù' | 'ú' | 'û' | 'ü' | 'ū' | 'ŭ' | 'ů' | 'ű' | 'ų' | 'Ù' | 'Ú' | 'Û' | 'Ü' => Some('u'),
        'ý' | 'ÿ' | 'ŷ' | 'Ý' | 'Ÿ' => Some('y'),
        'ź' | 'ż' | 'ž' | 'Ź' | 'Ż' | 'Ž' => Some('z'),
        'ś' | 'š' | 'ŝ' | 'ş' | 'ș' | 'Ś' | 'Š' | 'Ş' => Some('s'),
        'đ' | 'ď' | 'Đ' | 'Ď' => Some('d'),
        'ł' | 'Ł' => Some('l'),
        'ť' | 'ţ' | 'ț' | 'Ť' => Some('t'),
        'ř' | 'ŕ' | 'ŗ' | 'Ř' => Some('r'),

        other => Some(other.to_ascii_lowercase()),
    }
}

fn apply_initial_single_leet(c: char) -> char {
    match c {
        '4' | '@' | '^' => 'a',
        '8' => 'b',
        '3' | '€' => 'e',
        '0' => 'o',
        '1' | '!' => 'i',
        '7' => 't',
        '5' | '$' => 's',
        '9' => 'g',
        '2' => 'z',
        other => other,
    }
}

fn apply_remaining_leet(c: char) -> char {
    match c {
        '+' => 't',
        '|' => 'i',
        other => other,
    }
}

fn collapse_repetitions(word: &str) -> String {
    let mut result = String::with_capacity(word.len());
    let mut chars = word.chars().peekable();

    while let Some(current) = chars.next() {
        let mut count = 1;
        while let Some(&next) = chars.peek() {
            if next == current {
                count += 1;
                chars.next();
            } else {
                break;
            }
        }

        if count >= 3 {
            result.push(current);
        } else {
            for _ in 0..count {
                result.push(current);
            }
        }
    }

    result
}

fn collapse_spaced_single_letters(text: &str) -> String {
    let tokens: Vec<&str> = text.split_whitespace().collect();
    if tokens.is_empty() {
        return text.to_string();
    }

    let mut result = Vec::new();
    let mut i = 0;

    let is_single_char = |t: &str| -> bool {
        t.chars().count() == 1 && t.chars().all(|c| c.is_alphanumeric())
    };

    let is_punct = |t: &str| -> bool {
        !t.is_empty() && !t.contains("__discord") && t.chars().all(|c| c.is_ascii_punctuation())
    };

    while i < tokens.len() {
        if is_single_char(tokens[i]) {
            let mut j = i;
            let mut run_tokens = vec![tokens[i]];
            let mut letters_in_run = 1;

            while j + 2 < tokens.len() && is_punct(tokens[j + 1]) && is_single_char(tokens[j + 2]) {
                run_tokens.push(tokens[j + 1]);
                run_tokens.push(tokens[j + 2]);
                j += 2;
                letters_in_run += 1;
            }

            if letters_in_run >= 2 {
                result.push(run_tokens.concat());
                i = j + 1;
                continue;
            }
        }

        result.push(tokens[i].to_string());
        i += 1;
    }

    result.join(" ")
}

fn strip_interstitial_punctuation(token: &str) -> String {
    let mut current = token.to_string();
    loop {
        let next = WORD_SEPARATORS_RE.replace_all(&current, "$1$2").to_string();
        if next == current {
            break;
        }
        current = next;
    }
    current
}

fn merge_isolated_single_letters(tokens: &[String]) -> Vec<String> {
    let mut result = Vec::new();
    let mut i = 0;

    while i < tokens.len() {
        let token = &tokens[i];
        if token.chars().count() == 1 && token.chars().all(|c| c.is_ascii_alphabetic()) {
            let mut run = vec![token.clone()];
            let mut j = i + 1;
            while j < tokens.len() {
                let next_token = &tokens[j];
                if next_token.chars().count() == 1 && next_token.chars().all(|c| c.is_ascii_alphabetic()) {
                    run.push(next_token.clone());
                    j += 1;
                } else {
                    break;
                }
            }

            if run.len() >= 3 {
                result.push(run.concat());
                i = j;
                continue;
            } else if run.len() == 2 {
                let merged = run.concat();
                if merged == "tg" || merged == "gg" || merged == "ez" || merged == "wp" {
                    result.push(merged);
                    i = j;
                    continue;
                }
            }
        }

        result.push(tokens[i].clone());
        i += 1;
    }

    result
}

pub fn unmask_leetspeak(input: &str) -> String {
    let mut placeholders: Vec<(String, String)> = Vec::new();

    let idx_to_alpha = |mut n: usize| -> String {
        let mut s = String::new();
        loop {
            let rem = (n % 26) as u8;
            s.push((b'a' + rem) as char);
            n /= 26;
            if n == 0 {
                break;
            }
        }
        s
    };

    let mut url_idx = 0;
    let preprocessed = URL_RE
        .replace_all(input, |caps: &regex::Captures| {
            let key = format!("__discordurl{}__", idx_to_alpha(url_idx));
            placeholders.push((key.clone(), caps[0].to_string()));
            url_idx += 1;
            key
        })
        .to_string();

    let mut mention_idx = 0;
    let preprocessed = DISCORD_MENTION_RE
        .replace_all(&preprocessed, |caps: &regex::Captures| {
            let key = format!("__discordmention{}__", idx_to_alpha(mention_idx));
            placeholders.push((key.clone(), caps[0].to_string()));
            mention_idx += 1;
            key
        })
        .to_string();

    let mut channel_idx = 0;
    let preprocessed = DISCORD_CHANNEL_RE
        .replace_all(&preprocessed, |caps: &regex::Captures| {
            let key = format!("__discordchannel{}__", idx_to_alpha(channel_idx));
            placeholders.push((key.clone(), caps[0].to_string()));
            channel_idx += 1;
            key
        })
        .to_string();

    let mut pass1 = String::with_capacity(preprocessed.len());
    for c in preprocessed.chars() {
        if let Some(normalized) = normalize_unicode_char(c) {
            pass1.push(normalized);
        }
    }

    let mut pass2 = pass1;
    for (pat, repl) in MULTI_LEET.iter() {
        pass2 = pass2.replace(pat, repl);
    }

    let pass3: String = pass2.chars().map(apply_initial_single_leet).collect();
    let pass4 = collapse_spaced_single_letters(&pass3);

    let raw_tokens: Vec<&str> = pass4.split_whitespace().collect();
    let mut pass5_tokens: Vec<String> = Vec::with_capacity(raw_tokens.len());

    for token in raw_tokens {
        if token.contains("__discord") {
            pass5_tokens.push(token.to_string());
            continue;
        }

        let stripped_token = strip_interstitial_punctuation(token);
        let trimmed_token = stripped_token
            .trim_matches(|c: char| c.is_ascii_punctuation() && c != '<' && c != '>' && c != '_')
            .to_string();

        let final_token = if trimmed_token.is_empty() {
            stripped_token
        } else {
            trimmed_token
        };

        let converted: String = final_token.chars().map(apply_remaining_leet).collect();
        let collapsed = collapse_repetitions(&converted);
        pass5_tokens.push(collapsed);
    }

    let pass6_tokens = merge_isolated_single_letters(&pass5_tokens);
    let mut final_text = pass6_tokens.join(" ");

    for (placeholder, original) in placeholders {
        final_text = final_text.replace(&placeholder.to_ascii_lowercase(), &original);
    }

    final_text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unmask_leetspeak_substitutions() {
        assert_eq!(unmask_leetspeak("c0nn4rd"), "connard");
        assert_eq!(unmask_leetspeak("s4l0p3"), "salope");
        assert_eq!(unmask_leetspeak("7g"), "tg");
        assert_eq!(unmask_leetspeak("b!tch"), "bitch");
        assert_eq!(unmask_leetspeak("$4l0p3"), "salope");
    }

    #[test]
    fn test_unmask_homoglyphs_cyrillic_and_greek() {
        // Cyrillic 'с' (U+0441)
        assert_eq!(unmask_leetspeak("\u{0441}onnard"), "connard");
        // Cyrillic 'а', 'о', 'е'
        assert_eq!(unmask_leetspeak("s\u{0430}l\u{043e}p\u{0435}"), "salope");
    }

    #[test]
    fn test_unmask_interstitial_punctuation() {
        assert_eq!(unmask_leetspeak("f.d.p"), "fdp");
        assert_eq!(unmask_leetspeak("c-o-n-n-a-r-d"), "connard");
        assert_eq!(unmask_leetspeak("f*d*p"), "fdp");
        assert_eq!(unmask_leetspeak("f_d_p"), "fdp");
        assert_eq!(unmask_leetspeak("t-g"), "tg");
    }

    #[test]
    fn test_unmask_separated_single_letters() {
        assert_eq!(unmask_leetspeak("f d p"), "fdp");
        assert_eq!(unmask_leetspeak("s a l o p e"), "salope");
        assert_eq!(unmask_leetspeak("t g"), "tg");
    }

    #[test]
    fn test_unmask_repetition_collapsing() {
        assert_eq!(unmask_leetspeak("coooonnnnard"), "conard");
        assert_eq!(unmask_leetspeak("fuuuuck"), "fuck");
        assert_eq!(unmask_leetspeak("puuuute"), "pute");
        assert_eq!(unmask_leetspeak("puttttte"), "pute");
        assert_eq!(unmask_leetspeak("baaatttard"), "batard");
        assert_eq!(unmask_leetspeak("salllllope"), "salope");
        assert_eq!(unmask_leetspeak("fffffddddpppp"), "fdp");
        assert_eq!(unmask_leetspeak("tttggg"), "tg");
        assert_eq!(unmask_leetspeak("connarrrrd"), "connard");
    }

    #[test]
    fn test_unmask_zero_width_spaces() {
        assert_eq!(unmask_leetspeak("c\u{200B}o\u{200C}n\u{200D}n\u{FEFF}a\u{00AD}r\u{2060}d"), "connard");
    }

    #[test]
    fn test_unmask_preserves_mentions_and_urls() {
        assert_eq!(unmask_leetspeak("<@123456789> c0nnard"), "<@123456789> connard");
        assert_eq!(unmask_leetspeak("<@123456789>, c0nnard"), "<@123456789>, connard");
        assert_eq!(unmask_leetspeak("<@&123456789012345678>"), "<@&123456789012345678>");
        assert_eq!(
            unmask_leetspeak("https://example.com https://example.com/test"),
            "https://example.com https://example.com/test"
        );
        assert_eq!(unmask_leetspeak("regarde https://paranoia-mc.fr/forum c00l"), "regarde https://paranoia-mc.fr/forum cool");
    }

    #[test]
    fn test_unmask_interstitial_remediation() {
        assert_eq!(unmask_leetspeak("f+d+p"), "fdp");
        assert_eq!(unmask_leetspeak("f|d|p"), "fdp");
        assert_eq!(unmask_leetspeak("f . d . p"), "fdp");
        assert_eq!(unmask_leetspeak("t - g"), "tg");
        assert_eq!(unmask_leetspeak("c,o,n,n,a,r,d"), "connard");
        assert_eq!(unmask_leetspeak("c:o:n:n:a:r:d"), "connard");
        assert_eq!(unmask_leetspeak("c(o)n(n)a(r)d"), "connard");
    }

    #[test]
    fn test_unmask_unicode_math_and_bidi() {
        assert_eq!(unmask_leetspeak("t'es un 𝐜𝐨𝐧𝐧𝐚𝐫𝐝"), "t'es un connard");
        assert_eq!(unmask_leetspeak("t'es un 𝚌𝚘𝚗𝚗𝐚𝐫𝚍"), "t'es un connard");
        assert_eq!(unmask_leetspeak("t'es un ⓒⓞⓝⓝⓐⓡⓓ"), "t'es un connard");
        assert_eq!(unmask_leetspeak("t'es un coннard"), "t'es un connard");
        assert_eq!(unmask_leetspeak("t'es un c\u{202E}onnard"), "t'es un connard");
    }
}
