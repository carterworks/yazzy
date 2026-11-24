// Bun loads .env before tests, so a developer DB_PATH would otherwise receive
// test fixtures.
process.env["DB_PATH"] = ":memory:";
