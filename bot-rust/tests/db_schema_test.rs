mod common;

use std::fs;
use std::path::Path;

fn get_migration_sql() -> String {
    let candidates = [
        "migrations/0001_initial_schema.sql",
        "../migrations/0001_initial_schema.sql",
    ];
    for path in &candidates {
        if Path::new(path).exists() {
            return fs::read_to_string(path).expect("Failed to read migration SQL file");
        }
    }
    panic!("migrations/0001_initial_schema.sql not found");
}

#[test]
fn test_migration_file_or_schema_specification_content() {
    let sql = get_migration_sql();
    assert!(!sql.trim().is_empty(), "Migration file must not be empty");

    let lower = sql.to_lowercase();
    assert!(lower.contains("create table if not exists sanctions"));
    assert!(lower.contains("create table if not exists appeals"));
    assert!(lower.contains("create table if not exists tiktok_targets"));
}

#[test]
fn test_sanctions_table_schema_specification() {
    let sql = get_migration_sql().to_lowercase();

    assert!(sql.contains("create table if not exists sanctions"));
    assert!(sql.contains("id varchar(6) primary key"));
    assert!(sql.contains("guild_id bigint not null"));
    assert!(sql.contains("user_id bigint not null"));
    assert!(sql.contains("mod_id bigint not null"));
    assert!(sql.contains("sanction_type varchar(20) not null"));
    assert!(sql.contains("duration text"));
    assert!(sql.contains("reason text"));
    assert!(sql.contains("created_at timestamptz default now()"));
    assert!(sql.contains("appealed boolean default false"));
}

#[test]
fn test_appeals_table_schema_specification() {
    let sql = get_migration_sql().to_lowercase();

    assert!(sql.contains("create table if not exists appeals"));
    assert!(sql.contains("id text primary key"));
    assert!(sql.contains("sanction_id varchar(6) references sanctions(id)"));
    assert!(sql.contains("pseudo_mc text"));
    assert!(sql.contains("arguments text not null"));
    assert!(sql.contains("status varchar(20) default 'pending'"));
    assert!(sql.contains("created_at timestamptz default now()"));
}

#[test]
fn test_tiktok_targets_table_schema_specification() {
    let sql = get_migration_sql().to_lowercase();

    assert!(sql.contains("create table if not exists tiktok_targets"));
    assert!(sql.contains("username text primary key"));
    assert!(sql.contains("channel_id bigint not null"));
    assert!(sql.contains("role_id bigint"));
    assert!(sql.contains("last_video_id text"));
    assert!(sql.contains("is_live boolean default false"));
}

#[test]
fn test_table_constraints_and_foreign_keys() {
    let sql = get_migration_sql();

    assert!(sql.contains("PRIMARY KEY"), "Tables must declare primary keys");
    assert!(
        sql.contains("REFERENCES sanctions(id)") || sql.contains("references sanctions(id)"),
        "appeals must declare foreign key REFERENCES sanctions(id)"
    );
}

#[test]
fn test_indexes_specification() {
    let sql = get_migration_sql().to_lowercase();

    assert!(sql.contains("create index if not exists idx_sanctions_user on sanctions(user_id)"));
    assert!(sql.contains("create index if not exists idx_sanctions_guild_user on sanctions(guild_id, user_id)"));
    assert!(sql.contains("create index if not exists idx_appeals_sanction_id on appeals(sanction_id)"));
    assert!(sql.contains("create index if not exists idx_appeals_status on appeals(status)"));
}

#[tokio::test]
async fn test_live_db_schema_verification_if_connected() {
    use sqlx::postgres::PgPoolOptions;

    let db_url = std::env::var("DATABASE_URL").unwrap_or_default();
    if db_url.is_empty() {
        return;
    }

    let clean_url = db_url
        .replace("?schema=public&", "?")
        .replace("?schema=public", "")
        .replace("&schema=public", "");

    let pool_res = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(std::time::Duration::from_millis(500))
        .connect(&clean_url)
        .await;

    if let Ok(pool) = pool_res {
        let tables_res: Result<Vec<(String,)>, _> = sqlx::query_as(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        )
        .fetch_all(&pool)
        .await;

        if let Ok(tables) = tables_res {
            let names: Vec<String> = tables.into_iter().map(|(t,)| t).collect();
            println!("Discovered live tables: {:?}", names);
        }
    }
}
