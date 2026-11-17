import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT_DIR = process.cwd();
const LIB_PATH = path.resolve(ROOT_DIR, 'public/مكتبة_الألعاب-2.html');
const PACK_PATH = path.resolve(
  ROOT_DIR,
  'prepared-games/العاب ليالي الرياض/riyadh-nights-6-games-clean/01-challenges-pack/game.html'
);

function extractLibraryData(html: string) {
  const marker = 'const LIBRARY_GAMES = ';
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, 'LIBRARY_GAMES declaration must exist');
  const jsonStart = start + marker.length;
  const end = html.indexOf('];\n', jsonStart);
  assert.notEqual(end, -1, 'LIBRARY_GAMES closing bracket must exist');
  const jsonText = html.slice(jsonStart, end + 1);
  return JSON.parse(jsonText) as Array<{
    id: string;
    name: string;
    name_en?: string;
    icon: string;
    desc: string;
    desc_en?: string;
    b64: string;
    enc?: unknown;
    price?: unknown;
  }>;
}

function walkFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === '.playwright-cli') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

test('مكتبة_الألعاب-2.html preserves protection, connection settings, and login overlay intact', () => {
  const html = fs.readFileSync(LIB_PATH, 'utf-8');
  assert.ok(html.includes('const DEV_MODE=false;'), 'DEV_MODE must remain false');
  assert.ok(html.includes("const CATALOG_SEAL='';"), 'CATALOG_SEAL must remain intact');
  assert.ok(html.includes("peer.connect('wrglib'+code,{reliable:true})"), 'PeerJS connection logic must remain untouched');
  assert.ok(html.includes('const CHUNK_SIZE=16000;'), 'Chunk size must remain untouched');

  assert.ok(html.includes('مرحباً بك في مكتبة ليالي الرياض'), 'First-time welcome heading must exist');
  assert.ok(html.includes('id="tvBrowserBtn"'), 'TV browser link must exist on login screen');
  assert.ok(html.includes('دخول متصفح بالتلفزيون'), 'TV browser link label must match');
  assert.ok(html.includes('href="https://share.google/oPDjMQKOsEXxGIzzh"'), 'TV browser link must point directly to https://share.google/oPDjMQKOsEXxGIzzh');
  assert.ok(!/tvBrowserBtn[\s\S]{0,120}(preventDefault|window\.open)/i.test(html), 'TV browser link must navigate directly without preventDefault or window.open');

  assert.ok(html.includes('id="loginPromoTitle"') && html.includes('عرض كل الألعاب المجانية'), 'Login promo headline must feature عرض كل الألعاب المجانية');
  assert.ok(html.includes('id="supportModal"') && html.includes('كل الألعاب المجانية'), 'Support modal must exist and feature كل الألعاب المجانية');
  assert.ok(html.includes('All Free Games Offer'), 'English translation must include All Free Games Offer');
  assert.ok(html.includes('RARE_IDS') && html.includes('tagRareFree'), 'Rare games free promo labels must be present in both AR and EN');

  const scriptMatches = [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];
  const inlineScripts = scriptMatches.filter(m => !/\bsrc=/i.test(m[0]) && m[1].trim().length > 0);
  assert.equal(inlineScripts.length, 1, 'Expected exactly one inline script in مكتبة_الألعاب-2.html');
  assert.doesNotThrow(() => new vm.Script(inlineScripts[0][1]), 'Inline script must be valid JavaScript');
});

test('LIBRARY_GAMES contains all 22 games including Captain Bean and Tahadi Al-Ashara', () => {
  const html = fs.readFileSync(LIB_PATH, 'utf-8');
  const games = extractLibraryData(html);
  assert.equal(games.length, 22, 'Must contain exactly 22 unique games');

  const ids = new Set<string>();
  const payloadHashes = new Set<string>();

  for (const g of games) {
    assert.ok(g.id && !ids.has(g.id), `Unique id required for ${g.id}`);
    ids.add(g.id);
    assert.ok(g.name && g.name.length > 0, `Arabic name required for ${g.id}`);
    assert.ok(g.icon && g.icon.length > 0, `Icon required for ${g.id}`);
    assert.ok(g.desc && g.desc.length > 0, `Description required for ${g.id}`);
    assert.equal(g.enc, undefined, `Game ${g.id} must be free (no enc)`);
    assert.equal(g.price, undefined, `Game ${g.id} must be free (no price)`);
    assert.ok(typeof g.b64 === 'string' && g.b64.length > 1000, `Valid b64 required for ${g.id}`);

    const buf = Buffer.from(g.b64, 'base64');
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    assert.ok(!payloadHashes.has(hash), `Duplicate game payload found for ${g.id}`);
    payloadHashes.add(hash);

    const decoded = buf.toString('utf-8');
    assert.ok(decoded.toLowerCase().includes('<html'), `Decoded HTML missing <html> for ${g.id}`);
    assert.ok(decoded.includes('EMB_ROLE') || decoded.includes('startTv'), `Decoded HTML missing EMB bridge for ${g.id}`);
    assert.equal(Buffer.from(decoded, 'utf-8').toString('base64'), g.b64, `Exact UTF-8 base64 round-trip failed for ${g.id}`);
  }

  assert.ok(ids.has('mafia_najd'), 'mafia_najd (مافيا قرية) must be present');
  assert.ok(ids.has('captain_bean'), 'captain_bean must be present');
  assert.ok(ids.has('tahadi_al_ashara'), 'tahadi_al_ashara must be present');
  assert.ok(ids.has('challenges_pack'), 'challenges_pack must be present');

  const beanSrc = fs.readFileSync(path.resolve(ROOT_DIR, 'public/assets/aistudio/captain-bean-layali-riyadh__2__17688432.html'));
  const tahadiSrc = fs.readFileSync(path.resolve(ROOT_DIR, 'public/assets/aistudio/tahadi_al_ashara__1__01ac4473.html'));
  const beanEntry = games.find(g => g.id === 'captain_bean')!;
  const tahadiEntry = games.find(g => g.id === 'tahadi_al_ashara')!;
  assert.equal(Buffer.from(beanEntry.b64, 'base64').equals(beanSrc), true, 'captain_bean b64 must match attached HTML bytes');
  assert.equal(Buffer.from(tahadiEntry.b64, 'base64').equals(tahadiSrc), true, 'tahadi_al_ashara b64 must match attached HTML bytes');
});

test('Challenges pack skyfall3d has WebGL fallback, pack integrity preserved, and synced with library', () => {
  const packHtml = fs.readFileSync(PACK_PATH, 'utf-8');
  assert.ok(packHtml.includes("ownerKeyId: 'OWNER-KEY-G1-PACK-9041'"), 'Pack security key must stay intact');
  assert.ok(packHtml.includes('function verifyPackIntegrity()'), 'Pack integrity check must stay intact');
  assert.ok(packHtml.includes('function renderSkyFallFallback2D('), 'skyfall3d 2D fallback renderer must exist');
  assert.ok(packHtml.includes("typeof gl.fenceSync !== 'function'"), 'afterDraw must guard WebGL1 missing fenceSync');

  const libHtml = fs.readFileSync(LIB_PATH, 'utf-8');
  const packGame = extractLibraryData(libHtml).find(g => g.id === 'challenges_pack')!;
  assert.equal(Buffer.from(packGame.b64, 'base64').toString('utf-8'), packHtml, 'LIBRARY_GAMES challenges_pack must match 01-challenges-pack/game.html');
});

test('Repository has no leftover duplicate zip archives or unused entry scripts', () => {
  const allFiles = walkFiles(ROOT_DIR).map(p => path.relative(ROOT_DIR, p));
  const zipFiles = allFiles.filter(p => p.toLowerCase().endsWith('.zip'));
  assert.deepEqual(zipFiles, [], `Unexpected duplicate zip archives found: ${zipFiles.join(', ')}`);

  const entryJsFiles = allFiles.filter(p => p.endsWith('riyadh-nights-entry.js'));
  assert.deepEqual(entryJsFiles, [], `Unused riyadh-nights-entry.js files found: ${entryJsFiles.join(', ')}`);

  assert.equal(fs.existsSync(path.resolve(ROOT_DIR, 'workflow-source')), false);
  assert.equal(fs.existsSync(path.resolve(ROOT_DIR, '.github/saved-workflows')), false);
});

test('GitHub APK workflow is active, uses Java 21, and references valid smoke test games', () => {
  const wfPath = path.resolve(ROOT_DIR, '.github/workflows/build-apk.yml');
  const yml = fs.readFileSync(wfPath, 'utf-8');
  assert.ok(!yml.includes('STOPPED'), 'Workflow name must not be STOPPED');
  assert.ok(!yml.includes('on: []'), 'Workflow trigger must be enabled');
  assert.ok(yml.includes("java-version: '21'"), 'Must use Java 21');
  assert.ok(yml.includes('mafia-najd-layali.html'), 'Workflow must smoke-test existing game mafia-najd-layali.html');
  assert.ok(yml.includes('public/مكتبة_الألعاب-2.html'), 'Must source populated مكتبة_الألعاب-2.html');
  assert.ok(yml.includes('assembleDebug'), 'Must build debug APK');
});
