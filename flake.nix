{
  description = "yazzy dev shell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});

      # Fly builds from the Dockerfile, so the dev shell takes Bun's version from there.
      bunVersion = builtins.head (
        builtins.match ".*\nARG BUN_VERSION=([^\n]+)\n.*" (builtins.readFile ./Dockerfile)
      );
      bunHashes = builtins.fromJSON (builtins.readFile ./nix/bun-hashes.json);
      bunAssets = {
        "aarch64-darwin" = "bun-darwin-aarch64";
        "aarch64-linux" = "bun-linux-aarch64";
        "x86_64-linux" = "bun-linux-x64-baseline";
      };
    in
    assert nixpkgs.lib.assertMsg (bunHashes.version == bunVersion)
      "The Dockerfile pins Bun ${bunVersion} but nix/bun-hashes.json is for ${bunHashes.version}. Run scripts/update-bun.sh ${bunVersion}.";
    {
      devShells = forAllSystems (
        pkgs:
        let
          inherit (pkgs.stdenvNoCC.hostPlatform) system;
          bun = pkgs.bun.overrideAttrs {
            version = bunVersion;
            src = pkgs.fetchurl {
              url = "https://github.com/oven-sh/bun/releases/download/bun-v${bunVersion}/${bunAssets.${system}}.zip";
              hash = bunHashes.${system};
            };
          };
        in
        {
          default = pkgs.mkShellNoCC {
            packages = [
              bun
              pkgs.flyctl
              pkgs.sqlite-interactive
              pkgs.gh
            ];
          };
        }
      );
    };
}
