mod common;

use std::env;

#[path = "../src/config.rs"]
mod config;

use config::Config;

#[test]
fn test_config_load_with_existing_env() {
    let _guard = common::ENV_MUTEX.lock().unwrap_or_else(|e| e.into_inner());

    let result = Config::load();
    assert!(result.is_ok(), "Config::load() should succeed with environment: {:?}", result.err());

    let cfg = result.unwrap();
    assert!(!cfg.discord_token.is_empty(), "DISCORD_TOKEN must not be empty");
    assert!(!cfg.database_url.is_empty(), "DATABASE_URL must not be empty");
    assert!(cfg.role_staff_id > 0, "role_staff_id must be populated");
    assert!(cfg.role_videaste_id > 0, "role_videaste_id must be populated");
    assert!(cfg.ticket_category_id > 0, "ticket_category_id must be populated");
    assert!(cfg.ticket_log_channel_id > 0, "ticket_log_channel_id must be populated");
    assert!(!cfg.nextauth_url.is_empty(), "nextauth_url must be populated");
    assert!(!cfg.web_api_url.is_empty(), "web_api_url must be populated");
    assert!(!cfg.web_api_fallback_url.is_empty(), "web_api_fallback_url must be populated");
}

#[test]
fn test_config_empty_discord_token_fails() {
    let _guard = common::ENV_MUTEX.lock().unwrap_or_else(|e| e.into_inner());

    let prev = env::var("DISCORD_TOKEN").ok();
    unsafe {
        env::set_var("DISCORD_TOKEN", "");
    }

    let result = Config::load();
    assert!(result.is_err(), "Empty DISCORD_TOKEN must cause Config::load() to fail");
    let err_msg = format!("{:#}", result.err().unwrap());
    assert!(err_msg.contains("DISCORD_TOKEN"), "Error must mention DISCORD_TOKEN: {}", err_msg);

    unsafe {
        if let Some(v) = prev {
            env::set_var("DISCORD_TOKEN", v);
        } else {
            env::remove_var("DISCORD_TOKEN");
        }
    }
}

#[test]
fn test_config_empty_database_url_fails() {
    let _guard = common::ENV_MUTEX.lock().unwrap_or_else(|e| e.into_inner());

    let prev = env::var("DATABASE_URL").ok();
    unsafe {
        env::set_var("DATABASE_URL", "");
    }

    let result = Config::load();
    assert!(result.is_err(), "Empty DATABASE_URL must cause Config::load() to fail");
    let err_msg = format!("{:#}", result.err().unwrap());
    assert!(err_msg.contains("DATABASE_URL"), "Error must mention DATABASE_URL: {}", err_msg);

    unsafe {
        if let Some(v) = prev {
            env::set_var("DATABASE_URL", v);
        } else {
            env::remove_var("DATABASE_URL");
        }
    }
}

#[test]
fn test_config_missing_vars_specification() {
    assert_eq!(config::clean_var(""), None);
    assert_eq!(config::clean_var("   "), None);
    assert_eq!(config::clean_var("\"\""), None);
    assert_eq!(config::clean_var("tok_123"), Some("tok_123".to_string()));
    assert_eq!(
        config::clean_var("postgresql://localhost/db"),
        Some("postgresql://localhost/db".to_string())
    );
}

#[test]
fn test_database_url_schema_cleaning() {
    let raw_url = "postgresql://paranoia:pwd@localhost:8543/paranoia_db?schema=public";
    assert_eq!(
        config::clean_db_url(raw_url),
        "postgresql://paranoia:pwd@localhost:8543/paranoia_db"
    );

    let ampersand_url = "postgresql://paranoia:pwd@localhost:8543/paranoia_db?sslmode=disable&schema=public";
    assert_eq!(
        config::clean_db_url(ampersand_url),
        "postgresql://paranoia:pwd@localhost:8543/paranoia_db?sslmode=disable"
    );

    let follow_url = "postgresql://paranoia:pwd@localhost:8543/paranoia_db?schema=public&sslmode=prefer";
    assert_eq!(
        config::clean_db_url(follow_url),
        "postgresql://paranoia:pwd@localhost:8543/paranoia_db?sslmode=prefer"
    );

    let clean_url = "postgresql://paranoia:pwd@localhost:8543/paranoia_db";
    assert_eq!(config::clean_db_url(clean_url), clean_url);

    // Adversarial complex URL cases
    assert_eq!(
        config::clean_db_url("postgres://user:pass@host:5432/db?schema=public"),
        "postgres://user:pass@host:5432/db"
    );
    assert_eq!(
        config::clean_db_url("postgres://user:pass@host:5432/db?schema=public&sslmode=prefer"),
        "postgres://user:pass@host:5432/db?sslmode=prefer"
    );
    assert_eq!(
        config::clean_db_url("postgres://user:pass@host:5432/db?sslmode=prefer&schema=public"),
        "postgres://user:pass@host:5432/db?sslmode=prefer"
    );
    assert_eq!(
        config::clean_db_url("postgres://user:pass@host:5432/db?schema=public&sslmode=prefer&connect_timeout=10"),
        "postgres://user:pass@host:5432/db?sslmode=prefer&connect_timeout=10"
    );
}

#[test]
fn test_config_fallback_defaults_specification() {
    assert_eq!(Config::DEFAULT_ROLE_STAFF_ID, 1516106532792828036);
    assert_eq!(Config::DEFAULT_ROLE_VIDEASTE_ID, 1516106532784177317);
    assert_eq!(Config::DEFAULT_TICKET_CATEGORY_ID, 1516106533962907679);
    assert_eq!(Config::DEFAULT_TICKET_LOG_CHANNEL_ID, 1516106534122426433);
    assert_eq!(Config::DEFAULT_NEXTAUTH_URL, "http://localhost:3000");
    assert_eq!(Config::DEFAULT_WEB_API_URL, "http://web:3000/api/tickets/sync-discord");
    assert_eq!(Config::DEFAULT_WEB_API_FALLBACK_URL, "http://localhost:3000/api/tickets/sync-discord");
}

#[test]
fn test_env_var_sanitization_rules() {
    assert_eq!(config::clean_var("\"1516106532792828036\""), Some("1516106532792828036".to_string()));
    assert_eq!(config::clean_var("'1516106532784177317'"), Some("1516106532784177317".to_string()));
    assert_eq!(config::clean_var("   999888   "), Some("999888".to_string()));
    assert_eq!(config::clean_var("\"\""), None);
    assert_eq!(config::clean_var("   "), None);
}

#[test]
fn test_snowflake_parsing() {
    let _guard = common::ENV_MUTEX.lock().unwrap_or_else(|e| e.into_inner());

    unsafe {
        env::set_var("TEST_SNOWFLAKE_A", "1516106532792828036");
        env::set_var("TEST_SNOWFLAKE_B", "\"1516106532792828036\"");
        env::set_var("TEST_SNOWFLAKE_INVALID", "invalid_num");
        env::remove_var("TEST_SNOWFLAKE_UNSET");
    }

    assert_eq!(config::get_u64_var("TEST_SNOWFLAKE_A", 0).unwrap(), 1516106532792828036);
    assert_eq!(config::get_u64_var("TEST_SNOWFLAKE_B", 0).unwrap(), 1516106532792828036);
    assert_eq!(config::get_u64_var("TEST_SNOWFLAKE_UNSET", 42).unwrap(), 42);
    assert!(config::get_u64_var("TEST_SNOWFLAKE_INVALID", 0).is_err());
}

#[test]
fn test_optional_channels_specification() {
    let _guard = common::ENV_MUTEX.lock().unwrap_or_else(|e| e.into_inner());

    unsafe {
        env::remove_var("TEST_OPT_UNSET");
        env::set_var("TEST_OPT_EMPTY", "");
        env::set_var("TEST_OPT_ZERO", "0");
        env::set_var("TEST_OPT_ZERO_QUOTED", "\"0\"");
        env::set_var("TEST_OPT_VALID", "1516106534122426433");
    }

    assert_eq!(config::get_optional_u64_var("TEST_OPT_UNSET"), None);
    assert_eq!(config::get_optional_u64_var("TEST_OPT_EMPTY"), None);
    assert_eq!(config::get_optional_u64_var("TEST_OPT_ZERO"), None);
    assert_eq!(config::get_optional_u64_var("TEST_OPT_ZERO_QUOTED"), None);
    assert_eq!(config::get_optional_u64_var("TEST_OPT_VALID"), Some(1516106534122426433));
}
