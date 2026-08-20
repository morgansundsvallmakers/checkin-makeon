import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the build uses explicit standard Vite and TanStack configuration", async () => {
  const config = await read("vite.config.ts");
  const packageJson = JSON.parse(await read("package.json"));
  const lockfile = await read("bun.lock");
  const bunConfig = await read("bunfig.toml");
  const legacyVendor = ["lova", "ble"].join("");

  assert.match(config, /from "@tanstack\/react-start\/plugin\/vite"/);
  assert.match(config, /from "@vitejs\/plugin-react"/);
  assert.match(config, /from "@tailwindcss\/vite"/);
  assert.match(config, /from "nitro\/vite"/);
  assert.match(config, /server: \{ entry: "server" \}/);
  assert.match(config, /importProtection:/);
  assert.equal(
    Object.keys(packageJson.devDependencies).some((name) => name.includes(legacyVendor)),
    false,
  );
  assert.equal(lockfile.includes(legacyVendor), false);
  assert.equal(bunConfig.includes(legacyVendor), false);
});

test("environment templates keep service role credentials server-only", async () => {
  const envExample = await read(".env.example");
  const gitignore = await read(".gitignore");
  const browserClient = await read("src/integrations/supabase/client.ts");
  const serverClient = await read("src/integrations/supabase/client.server.ts");
  const adminFunctions = await read("src/lib/admins.functions.ts");

  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
  assert.match(envExample, /^VITE_SUPABASE_PUBLISHABLE_KEY=$/m);
  assert.match(envExample, /^SUPABASE_SERVICE_ROLE_KEY=$/m);
  assert.doesNotMatch(envExample, /^VITE_.*SERVICE_ROLE/m);
  assert.doesNotMatch(browserClient, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(serverClient, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(adminFunctions, /await import\("@\/integrations\/supabase\/client\.server"\)/);
});

test("generic client and SSR error handling remains in place", async () => {
  const rootRoute = await read("src/routes/__root.tsx");
  const start = await read("src/start.ts");
  const server = await read("src/server.ts");

  assert.match(rootRoute, /function ErrorComponent/);
  assert.match(rootRoute, /console\.error\(error\)/);
  assert.match(start, /requestMiddleware: \[errorMiddleware\]/);
  assert.match(server, /normalizeCatastrophicSsrResponse/);
  assert.match(server, /renderErrorPage/);
});
