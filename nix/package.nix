{
  lib,
  stdenv,
  fetchPnpmDeps,
  pnpmConfigHook,
  pnpm_10,
  nodejs-slim_latest,
  src,
}:

let
  pnpm' = pnpm_10.override { nodejs-slim = nodejs-slim_latest; };
in
stdenv.mkDerivation (finalAttrs: {
  pname = "birdclaw";
  version = "0.8.5";

  inherit src;

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    pnpm = pnpm';
    fetcherVersion = 3;
    hash = "sha256-wjjRs8LgOMgXN+dd+CpZP/LwSorgySLFs2eIJ5e9T+w=";
  };

  nativeBuildInputs = [
    nodejs-slim_latest
    pnpmConfigHook
    pnpm'
  ];

  buildInputs = [
    nodejs-slim_latest
  ];

  buildPhase = ''
    runHook preBuild
    pnpm build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out/lib/birdclaw
    cp -r dist node_modules bin package.json $out/lib/birdclaw
    chmod +x $out/lib/birdclaw/bin/birdclaw.mjs
    mkdir -p $out/bin
    ln -s $out/lib/birdclaw/bin/birdclaw.mjs $out/bin/birdclaw
    runHook postInstall
  '';

  meta = with lib; {
    description = "Local Twitter memory in SQLite for archives, DMs, likes, bookmarks, and moderation";
    homepage = "https://github.com/steipete/birdclaw";
    license = licenses.mit;
    mainProgram = "birdclaw";
  };
})
