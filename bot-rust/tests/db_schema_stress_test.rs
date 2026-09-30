use std::fs;
use std::path::Path;

#[test]
fn test_migration_file_exists_and_readable() {
    let path = Path::new("migrations/0001_initial_schema.sql");
    assert!(path.exists(), "migrations/0001_initial_schema.sql must exist");
    let content = fs::read_to_string(path).expect("Must read initial schema migration file");
    assert!(!content.trim().is_empty(), "Schema file must not be empty");
}

#[test]
fn test_exact_schema_constraints_on_sanctions_table() {
    let content = fs::read_to_string("migrations/0001_initial_schema.sql").unwrap();
    let lower = content.to_lowercase();

    assert!(lower.contains("create table if not exists sanctions"));
    assert!(lower.contains("id varchar(6) primary key"));
    assert!(lower.contains("guild_id bigint not null"));
    assert!(lower.contains("user_id bigint not null"));
    assert!(lower.contains("mod_id bigint not null"));
    assert!(lower.contains("sanction_type varchar(20) not null"));
    assert!(lower.contains("duration text"));
    assert!(lower.contains("reason text"));
    assert!(lower.contains("created_at timestamptz default now()"));
    assert!(lower.contains("appealed boolean default false"));
}

#[test]
fn test_exact_schema_constraints_and_foreign_key_on_appeals_table() {
    let content = fs::read_to_string("migrations/0001_initial_schema.sql").unwrap();
    let lower = content.to_lowercase();

    assert!(lower.contains("create table if not exists appeals"));
    assert!(lower.contains("id text primary key"));
    assert!(lower.contains("sanction_id varchar(6) references sanctions(id)"));
    assert!(lower.contains("pseudo_mc text"));
    assert!(lower.contains("arguments text not null"));
    assert!(lower.contains("status varchar(20) default 'pending'"));
    assert!(lower.contains("created_at timestamptz default now()"));

    let lines: Vec<&str> = lower.lines().map(|l| l.trim()).collect();
    let sanction_id_line = lines
        .iter()
        .find(|l| l.starts_with("sanction_id"))
        .expect("sanction_id column must exist in appeals table");
    assert!(
        !sanction_id_line.contains("not null"),
        "sanction_id in appeals must be nullable to permit legacy appeals"
    );
}

#[test]
fn test_exact_schema_constraints_on_tiktok_targets_table() {
    let content = fs::read_to_string("migrations/0001_initial_schema.sql").unwrap();
    let lower = content.to_lowercase();

    assert!(lower.contains("create table if not exists tiktok_targets"));
    assert!(lower.contains("username text primary key"));
    assert!(lower.contains("channel_id bigint not null"));
    assert!(lower.contains("role_id bigint"));
    assert!(lower.contains("last_video_id text"));
    assert!(lower.contains("is_live boolean default false"));
}

#[test]
fn test_migration_idempotency_clauses() {
    let content = fs::read_to_string("migrations/0001_initial_schema.sql").unwrap();
    let statements: Vec<&str> = content
        .split(';')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();

    assert_eq!(statements.len(), 7);

    for stmt in &statements {
        let lower = stmt.to_lowercase();
        if lower.starts_with("create table") {
            assert!(
                lower.starts_with("create table if not exists"),
                "All CREATE TABLE statements must use IF NOT EXISTS for idempotency: {}",
                stmt
            );
        } else if lower.starts_with("create index") {
            assert!(
                lower.starts_with("create index if not exists"),
                "All CREATE INDEX statements must use IF NOT EXISTS for idempotency: {}",
                stmt
            );
        } else {
            panic!("Unexpected statement in migration: {}", stmt);
        }
    }
}

#[test]
fn test_db_queries_conflict_targets_match_primary_keys() {
    let db_src = fs::read_to_string("src/db.rs").expect("Must read src/db.rs");

    assert!(
        db_src.contains("INSERT INTO sanctions") && db_src.contains("ON CONFLICT (id) DO NOTHING"),
        "sanctions query must use ON CONFLICT (id) DO NOTHING"
    );
    assert!(
        db_src.contains("INSERT INTO appeals") && db_src.contains("ON CONFLICT (id) DO NOTHING"),
        "appeals query must use ON CONFLICT (id) DO NOTHING"
    );
    assert!(
        db_src.contains("INSERT INTO tiktok_targets") && db_src.contains("ON CONFLICT (username) DO NOTHING"),
        "tiktok_targets query must use ON CONFLICT (username) DO NOTHING"
    );
}

#[test]
fn test_foreign_key_guard_logic_in_appeals_migration() {
    let db_src = fs::read_to_string("src/db.rs").expect("Must read src/db.rs");

    assert!(
        db_src.contains("SELECT EXISTS(SELECT 1 FROM sanctions WHERE id = $1)"),
        "migrate_appeals_json must verify sanction foreign key existence prior to insertion"
    );
}
