package ent

import "testing"

func TestUsesPostgresLock(t *testing.T) {
	if !usesPostgresLock("postgres") {
		t.Fatal("expected postgres provider to use advisory lock")
	}
	if !usesPostgresLock(" PostgreSQL ") {
		t.Fatal("expected postgresql provider to use advisory lock")
	}
	if usesPostgresLock("sqlite") {
		t.Fatal("expected non-postgres provider to bypass advisory lock")
	}
}
