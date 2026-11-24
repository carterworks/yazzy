// Bun loads .env before tests, so a developer DB_PATH would otherwise receive
// test fixtures.
process.env["DB_PATH"] = ":memory:";

// Older Bun.serve ignores backpressure on streamed bodies and can exhaust the
// machine's memory; see the streamed-too-large fixture in clipper.test.ts.
const MIN_BUN = ">=1.4.0";
if (!Bun.semver.satisfies(Bun.version, MIN_BUN)) {
	// A preload throw is reported but doesn't stop the run, so exit instead.
	console.error(
		`Tests need Bun ${MIN_BUN}, but this is ${Bun.version}. Run them inside \`nix develop\`.`,
	);
	process.exit(1);
}
