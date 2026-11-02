// Format and coverage checks for the sanarkit-integration Agent Skill.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_DIR = join(ROOT, 'skills', 'sanarkit-integration');
const SKILL_MD = join(SKILL_DIR, 'SKILL.md');
const REFS_DIR = join(SKILL_DIR, 'references');
const README_MD = join(ROOT, 'README.md');
const INVENTORY =
  process.env.SANARKIT_INVENTORY ??
  '/Volumes/MarenExt/sdk/developer-console/src/data/sdk-inventory.json';

// The skill covers these three SDKs only (the Web SDK is out of scope).
// Component reference files are named <prefix><inventory component id>.md.
const SDKS = {
  'react-native': { prefix: 'rn-component-', propsHeading: 'Props' },
  ios: { prefix: 'ios-view-', propsHeading: 'Parameters' },
  android: { prefix: 'android-screen-', propsHeading: 'Parameters' },
};

// Every reference file in the file map. SKILL.md must link each of them directly.
const EXPECTED_REFERENCES = [
  'rn-installation.md',
  'rn-connect.md',
  'rn-permissions.md',
  'rn-troubleshooting.md',
  'rn-sharing.md',
  'rn-component-skdashboard.md',
  'rn-component-skservice.md',
  'rn-component-skappointments.md',
  'rn-component-skconsultation.md',
  'rn-component-itcbooking.md',
  'rn-component-sanarrtc.md',
  'ios-installation.md',
  'ios-connect.md',
  'ios-troubleshooting.md',
  'ios-view-dashboardview.md',
  'ios-view-serviceview.md',
  'ios-view-instantconsultationview.md',
  'ios-view-bookinglistview.md',
  'ios-view-consultationview.md',
  'android-installation.md',
  'android-connect.md',
  'android-troubleshooting.md',
  'android-screen-gotodashboardview.md',
  'android-screen-gotobookingview.md',
  'android-screen-gotoappointmentlistview.md',
  'android-screen-gotoconsultationview.md',
];

// ---- helpers (all file reads happen inside tests, so a missing file fails one test) ----

const readText = (path) => readFileSync(path, 'utf8');

function frontmatterOf(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  assert.ok(match, 'SKILL.md must start with a YAML frontmatter block');
  return parseYaml(match[1]);
}

// Links inside code fences and inline code are examples, not real links.
function stripCode(text) {
  return text.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '');
}

function linksOf(text) {
  const links = [];
  const pattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of stripCode(text).matchAll(pattern)) links.push(match[1]);
  return links;
}

const isExternal = (href) => /^(https?:|mailto:|#)/i.test(href);
const withoutFragment = (href) => href.split('#')[0];

function walk(dir, skip = () => false) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (skip(full, name)) continue;
    if (statSync(full).isDirectory()) files.push(...walk(full, skip));
    else files.push(full);
  }
  return files;
}

const skipRepoNoise = (full, name) =>
  name === 'node_modules' || name === '.git' || name === 'package-lock.json';

function loadInventory() {
  if (!existsSync(INVENTORY)) return null;
  return JSON.parse(readText(INVENTORY));
}

// A client ID written as a quoted literal next to its key. The keys cover every way the SDKs
// and their docs name it: cid, clientId, client_id, SANAR_CLIENT_ID, and authToken (on Android,
// the authToken argument of connect IS the client ID). Placeholders in <angle brackets> are fine.
// An xcconfig setting may carry any number of conditions in brackets before the equals sign, as in
// SANAR_CLIENT_ID[sdk=iphoneos*][config=Release] = "value".
const CLIENT_ID_LITERAL =
  /(?:cid|client[_-]?id|authToken)["']?(?:[ \t]*\[[^\]\n]*\])*\s*[:=]\s*["']([^"']{6,})["']/gi;

// An unquoted KEY=value line, as in .env, .properties and .xcconfig examples. The key must start
// the line, so a code line such as `val authToken = fromConfig` is not read as a config file.
// An xcconfig setting may carry any number of conditions in brackets before the equals sign, as in
// SANAR_CLIENT_ID[sdk=iphoneos*][config=Release] = value, and the value may be followed by a
// comment (// in xcconfig, # in .env and .properties).
const CLIENT_ID_UNQUOTED =
  /^[ \t]*(?:export[ \t]+)?[\w.-]*(?:cid|client[_-]?id|authToken)[ \t]*(?:\[[^\]\n]*\][ \t]*)*=[ \t]*([^\s"'`<>=]\S*)(?:[ \t]+(?:\/\/|#)[^\n]*)?[ \t]*$/gim;

// A plist key for the client ID followed by its string: <key>SANAR_CLIENT_ID</key><string>value</string>,
// on one line or on two. The value must be a build variable such as $(SANAR_CLIENT_ID).
const CLIENT_ID_PLIST =
  /<key>[^<]*(?:cid|client[_-]?id|authToken)[^<]*<\/key>\s*<string>([^<]*)<\/string>/gi;

const isPlaceholder = (value) => /^<[^<>]*>$/.test(value.trim());

// An unquoted value that refers to a secret instead of containing one: a variable substitution
// ($(X), ${X}, %X%, @X@), a call, a null, a lookup on a well-known config object
// (BuildConfig.X, process.env.X), or a variable name (letters and underscores, with an
// underscore or camelCase, and no digits). A literal such as abcdef123456 is none of these.
const CONFIG_ROOT = /^(?:BuildConfig|Config|Constants|Env|ProcessInfo|System|Bundle|process|import|env)\b[\w.]*[,;]?$/;
function refersToSecret(value) {
  if (/^[$%@{(]/.test(value) || /[()$]/.test(value)) return true;
  if (/^(?:null|nil|none|undefined|true|false)[,;]?$/i.test(value)) return true;
  if (CONFIG_ROOT.test(value)) return true;
  return /^[A-Za-z_]+[,;]?$/.test(value) && /_|[a-z][A-Z]/.test(value);
}

// The comma-separated arguments of a call, starting just after its opening parenthesis. Commas
// inside brackets, braces and quotes do not split. Reads at most 4000 characters.
function callArguments(text, from) {
  const args = [];
  let current = '';
  let depth = 0;
  let quote = null;
  for (let i = from; i < Math.min(text.length, from + 4000); i += 1) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === '\\') current += text[(i += 1)] ?? '';
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      current += ch;
    } else if ('([{'.includes(ch)) {
      depth += 1;
      current += ch;
    } else if (')]}'.includes(ch) && depth === 0) {
      args.push(current);
      return args;
    } else if (')]}'.includes(ch)) {
      depth -= 1;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      args.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  args.push(current);
  return args;
}

// A string literal passed positionally to connect(...): SanarKit.connect('<value>', info) on
// React Native, connect(userInfo, "<value>", ...) on Android. Labelled arguments such as
// cid: "<value>" are found by CLIENT_ID_LITERAL. A bundle ID (com.example.app) and a URL are not
// client IDs, so they are allowed, and so are placeholders and values shorter than 6 characters.
function positionalConnectLiterals(text) {
  const found = [];
  for (const call of text.matchAll(/\bconnect\s*\(/g)) {
    for (const arg of callArguments(text, call.index + call[0].length)) {
      const literal = /^(["'`])([^"'`$\\]+)\1$/.exec(arg.trim());
      if (!literal) continue;
      const value = literal[2];
      if (value.length < 6 || isPlaceholder(value)) continue;
      if (/^[a-z][\w-]*(\.[\w-]+){2,}$/i.test(value) || /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) continue;
      found.push({ text: `${call[0]}${arg.trim()}`, value });
    }
  }
  return found;
}

// The text inside the string literals of an expression, joined, with the quote characters taken
// out. "\"" + clientId + "\"" holds no text, so it is a lookup. "\"" + "abcdef123456" + "\"" holds a literal.
function stringLiteralText(expression) {
  let text = '';
  let quote = null;
  for (let i = 0; i < expression.length; i += 1) {
    const ch = expression[i];
    if (!quote) {
      if (ch === '"' || ch === "'") quote = ch;
    } else if (ch === '\\') {
      i += 1; // an escaped character; an escaped quote is a quote character, not text
      if (i < expression.length && expression[i] !== '"' && expression[i] !== "'") text += expression[i];
    } else if (ch === quote) {
      quote = null;
    } else if (ch !== '"' && ch !== "'") {
      text += ch;
    }
  }
  return text.trim();
}

// A Gradle buildConfigField for the client ID whose value is a string literal:
// buildConfigField("String", "SANAR_CLIENT_ID", "\"value\"") in Kotlin, or
// buildConfigField 'String', 'SANAR_CLIENT_ID', '"value"' in Groovy. The key and the value are
// separate string arguments, so the labelled patterns above cannot see them. A value that is a
// lookup (a "${...}" template, getenv, getProperty, localProperties, a call) or a placeholder is fine.
function buildConfigClientIdLiterals(text) {
  const found = [];
  for (const call of text.matchAll(/\bbuildConfigField\b(\s*\()?/g)) {
    const rest = text.slice(call.index + call[0].length);
    const source = call[1] ? rest : `${rest.split('\n', 1)[0]})`;
    const [, name = '', value = ''] = callArguments(source, 0).map((arg) => arg.trim());
    if (!/(?:cid|client[_-]?id|authToken)/i.test(name)) continue;
    const quoted = /^(["'])([\s\S]*)\1$/.exec(value);
    if (!quoted) continue; // not a literal: a lookup such as localProperties.getProperty(...)
    const inner = quoted[2].replace(/\\?["']/g, '').trim();
    if (/[$()]|getenv|getProperty|localProperties/.test(inner)) continue;
    // Only the string literals count: "\"" + clientId + "\"" joins a variable, so it is a lookup.
    const literal = stringLiteralText(value);
    if (literal.length < 6 || isPlaceholder(literal)) continue;
    found.push({ text: `buildConfigField(${name}, ${value})`, value: literal });
  }
  return found;
}

function findClientIdLiterals(text) {
  const quoted = [...text.matchAll(CLIENT_ID_LITERAL)]
    .filter((match) => !isPlaceholder(match[1]) && !/^\$[({]/.test(match[1].trim())) // a quoted substitution is a lookup
    .map((match) => ({ text: match[0], value: match[1] }));
  const unquoted = [...text.matchAll(CLIENT_ID_UNQUOTED)]
    .filter((match) => match[1].length >= 6 && !refersToSecret(match[1]))
    .map((match) => ({ text: match[0].trim(), value: match[1] }));
  const plist = [...text.matchAll(CLIENT_ID_PLIST)]
    .filter((match) => {
      const value = match[1].trim();
      return value.length >= 6 && !refersToSecret(value) && !isPlaceholder(value) && !/^&lt;.*&gt;$/.test(value);
    })
    .map((match) => ({ text: match[0].replace(/\s+/g, ' '), value: match[1].trim() }));
  return [...quoted, ...unquoted, ...plist, ...buildConfigClientIdLiterals(text), ...positionalConnectLiterals(text)];
}

const componentsOf = (inventory, sdk) => inventory.sdks?.[sdk]?.components ?? [];

// The first-column names of the first Markdown table under "## <heading>".
// Reads one contiguous block of table rows only, so a sub-table under a "###"
// sub-heading (for example a list of service types) is not counted as props.
function tableNames(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return null;
  const names = [];
  let rows = 0; // table rows seen so far; the first is the header
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) break; // any heading ends the section
    if (!line.trim().startsWith('|')) {
      if (rows > 0) break; // the first table is over
      continue;
    }
    rows += 1;
    if (rows === 1) continue; // header row: skip it by position, not by what it says
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue; // separator row
    names.push(cells[0].replace(/`/g, '').trim());
  }
  return names;
}

// ---- tests ----

test('frontmatter follows the Agent Skills spec', () => {
  const fm = frontmatterOf(readText(SKILL_MD));
  assert.equal(fm.name, 'sanarkit-integration');
  assert.equal(fm.name, basename(dirname(SKILL_MD)), 'name must match its parent folder');
  assert.match(fm.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(fm.name.length <= 64, 'name is at most 64 characters');

  assert.equal(typeof fm.description, 'string');
  assert.ok(fm.description.length >= 1 && fm.description.length <= 1024, 'description is 1..1024 characters');
  for (const word of ['SanarKit', 'React Native', 'iOS', 'Android']) {
    assert.ok(fm.description.includes(word), `description mentions ${word}`);
  }

  const allowed = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
  for (const key of Object.keys(fm)) assert.ok(allowed.has(key), `unexpected frontmatter key: ${key}`);

  assert.equal(typeof fm.metadata, 'object', 'metadata is a map');
  for (const [key, value] of Object.entries(fm.metadata)) {
    assert.equal(typeof value, 'string', `metadata.${key} is a string`);
  }
  const versions = fm.metadata['sdk-versions'];
  for (const covered of ['react-native 3.0.1', 'ios 2025-09-02', 'android 2.1.1']) {
    assert.ok(versions?.includes(covered), `metadata.sdk-versions mentions "${covered}"`);
  }
});

test('SKILL.md is under 500 lines', () => {
  const lines = readText(SKILL_MD).split('\n').length;
  assert.ok(lines < 500, `SKILL.md has ${lines} lines`);
});

test('every reference link resolves', () => {
  const text = readText(SKILL_MD);
  const hrefs = linksOf(text).filter((href) => !isExternal(href)).map(withoutFragment);

  // The link table must link every reference in the file map, directly.
  const linked = new Set(hrefs);
  const unlinked = EXPECTED_REFERENCES.filter((name) => !linked.has(`references/${name}`));
  assert.deepEqual(unlinked, [], `SKILL.md does not link: ${unlinked.join(', ')}`);

  // And every relative link must point at a file that exists.
  const missing = hrefs.filter((href) => href !== '' && !existsSync(resolve(SKILL_DIR, href)));
  assert.deepEqual(missing, [], `these links do not resolve: ${missing.join(', ')}`);
});

test('references do not chain', () => {
  const chained = [];
  for (const file of walk(REFS_DIR).filter((f) => f.endsWith('.md'))) {
    for (const href of linksOf(readText(file))) {
      if (isExternal(href)) continue;
      const target = resolve(dirname(file), withoutFragment(href));
      if (target === file) continue;
      if (target.startsWith(REFS_DIR + sep)) {
        chained.push(`${relative(SKILL_DIR, file)} -> ${href}`);
      }
    }
  }
  assert.deepEqual(chained, [], 'reference files must not link to other reference files');
});

test('skill covers exactly the inventory components', (t) => {
  const inventory = loadInventory();
  if (!inventory) return t.skip(`inventory not found at ${INVENTORY}`);

  const files = existsSync(REFS_DIR) ? readdirSync(REFS_DIR) : [];
  for (const [sdk, { prefix }] of Object.entries(SDKS)) {
    const inInventory = componentsOf(inventory, sdk).map((c) => c.id).sort();
    assert.ok(inInventory.length > 0, `inventory lists no components for ${sdk}`);
    const inSkill = files
      .filter((f) => f.startsWith(prefix) && f.endsWith('.md'))
      .map((f) => f.slice(prefix.length, -'.md'.length))
      .sort();
    assert.deepEqual(inSkill, inInventory, `${sdk}: component references differ from the inventory`);
  }
});

test('component reference props match the inventory', (t) => {
  const inventory = loadInventory();
  if (!inventory) return t.skip(`inventory not found at ${INVENTORY}`);

  const problems = [];
  for (const [sdk, { prefix, propsHeading }] of Object.entries(SDKS)) {
    for (const component of componentsOf(inventory, sdk)) {
      const file = join(REFS_DIR, `${prefix}${component.id}.md`);
      if (!existsSync(file)) {
        problems.push(`${sdk}/${component.id}: missing ${relative(ROOT, file)}`);
        continue;
      }
      const documented = tableNames(readText(file), propsHeading);
      if (documented === null) {
        problems.push(`${sdk}/${component.id}: no "## ${propsHeading}" section`);
        continue;
      }
      const expected = component.props.map((p) => p.name).sort();
      const actual = [...documented].sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        problems.push(`${sdk}/${component.id}: documented [${actual}] but inventory has [${expected}]`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('SKChat only appears as a prohibition', () => {
  assert.ok(existsSync(SKILL_MD), 'SKILL.md must exist');
  const files = [...walk(SKILL_DIR), ...(existsSync(README_MD) ? [README_MD] : [])];
  const offenders = [];
  let prohibitions = 0;
  for (const file of files) {
    for (const [index, line] of readText(file).split('\n').entries()) {
      if (!/SKChat|setIsChatEnabled/.test(line)) continue;
      if (/never|do not/i.test(line)) prohibitions += 1;
      else offenders.push(`${relative(ROOT, file)}:${index + 1}: ${line.trim()}`);
    }
  }
  assert.deepEqual(offenders, [], 'every line that names SKChat or setIsChatEnabled must say "never" or "do not"');
  assert.ok(prohibitions > 0, 'SKILL.md must state the SKChat prohibition');
});

test('SKILL.md detection covers nested apps', () => {
  const text = readText(SKILL_MD).toLowerCase();
  assert.ok(text.includes('monorepo'), 'mentions monorepo');
  assert.ok(text.includes('ask'), 'says to ask');
  assert.ok(text.includes('apps/*/package.json'), 'looks for react-native in nested apps/*/package.json');
  assert.ok(text.includes('expo'), 'mentions Expo');
});

test('SKILL.md asks before upgrading an older SDK', () => {
  const text = readText(SKILL_MD).toLowerCase();
  assert.ok(text.includes('older'), 'mentions an older installed SDK');
  assert.ok(text.includes('ask before upgrading'), 'says "ask before upgrading"');
});

// ---- React Native reference checks ----

const rnReference = (name) => join(REFS_DIR, name);

test('react-native installation covers Expo', () => {
  const text = readText(rnReference('rn-installation.md')).toLowerCase();
  assert.ok(text.includes('expo'), 'rn-installation.md mentions Expo');
  assert.ok(text.includes('prebuild'), 'rn-installation.md names prebuild');
});

test('react-native installation covers pnpm', () => {
  const text = readText(rnReference('rn-installation.md')).toLowerCase();
  assert.ok(text.includes('pnpm'), 'rn-installation.md mentions pnpm');
  assert.ok(text.includes('yarn.lock'), 'rn-installation.md explains that sanarkit-setup detects yarn from yarn.lock');
});

test('react-native installation uses npm package and setup CLI', () => {
  const text = readText(rnReference('rn-installation.md'));
  assert.ok(text.includes('@maren-sa/react-native-sanarkit'), 'names the npm package');
  assert.ok(text.includes('npx sanarkit-setup'), 'runs the setup CLI');
  const offenders = readdirSync(REFS_DIR)
    .filter((name) => name.startsWith('rn-') && name.endsWith('.md'))
    .filter((name) => /github:MarenTech/i.test(readText(rnReference(name))));
  assert.deepEqual(offenders, [], 'React Native installs from npm only, never from github:MarenTech');
});

test('connect reference keeps the client ID out of source', () => {
  const text = readText(rnReference('rn-connect.md'));
  assert.ok(text.includes('.gitignore'), 'rn-connect.md tells the agent to git-ignore the config file');
  assert.ok(text.includes('<CLIENT_ID from config>'), 'rn-connect.md uses the placeholder <CLIENT_ID from config>');
  // Every client ID written next to its key, quoted or not, must be the placeholder.
  const values = [...text.matchAll(CLIENT_ID_LITERAL)].map((match) => match[1].trim());
  assert.deepEqual(
    values.filter((value) => value !== '<CLIENT_ID from config>'),
    [],
    'the only client ID value rn-connect.md may show is <CLIENT_ID from config>',
  );
  assert.deepEqual(findClientIdLiterals(text), [], 'no client ID literal in rn-connect.md');

  // The config file template holds one client ID per environment under keys that the detector
  // cannot recognise on their own (for example "development: '...'"), so check the template
  // itself: every string in a code fence that defines "export const SANAR_...", comments
  // removed, must be the placeholder.
  const fences = [...text.matchAll(/^[ \t]*```[^\n]*\n([\s\S]*?)^[ \t]*```/gm)].map((match) => match[1]);
  const templates = fences.filter((fence) => /export const SANAR_\w+\s*=/.test(fence));
  assert.ok(templates.length > 0, 'rn-connect.md shows the config file template');
  for (const template of templates) {
    const strings = [...template.replace(/\/\/.*$/gm, '').matchAll(/(["'`])((?:(?!\1)[^\\\n])*)\1/g)].map((match) => match[2]);
    assert.ok(strings.length > 0, 'the config file template has placeholder strings');
    assert.deepEqual(
      strings.filter((value) => value !== '<CLIENT_ID from config>'),
      [],
      'every string in the config file template must be <CLIENT_ID from config>',
    );
  }
});

test('no real-looking client ID anywhere', () => {
  assert.ok(existsSync(SKILL_MD), 'SKILL.md must exist');

  // Self-check of the detector. The samples are assembled at run time, so this file never
  // contains a literal that the scan below would flag.
  const sample = (key, separator, quote, value) => `${key}${separator}${quote}${value}${quote}`;
  const secret = 'abcdef123456';
  for (const [key, separator, quote] of [
    ['cid', ': ', '"'],
    ['clientId', ' = ', "'"],
    ['client_id', '=', '"'],
    ['client-id', ': ', '"'],
    ['SANAR_CLIENT_ID', ' = ', '"'],
    ['CLIENTID', ': ', "'"],
    ['authToken', ' = ', '"'],
    ['"clientId"', ': ', '"'],
  ]) {
    assert.equal(
      findClientIdLiterals(sample(key, separator, quote, secret)).length,
      1,
      `detector should flag ${key}`,
    );
  }
  assert.equal(findClientIdLiterals(sample('cid', ': ', '"', '<your client ID>')).length, 0, 'placeholder is allowed');
  assert.equal(findClientIdLiterals(sample('authToken', ' = ', '"', '<client ID>')).length, 0, 'placeholder is allowed');
  assert.equal(findClientIdLiterals(sample('clientId', ' = ', '"', 'abc')).length, 0, 'short values are ignored');
  assert.equal(findClientIdLiterals('authToken = BuildConfig.SANAR_CLIENT_ID').length, 0, 'a config lookup is not a literal');

  // P2-R8: unquoted KEY=value lines, as in .env, .properties and .xcconfig examples.
  for (const line of [
    `SANAR_CLIENT_ID=${secret}`,
    `authToken=${secret}`,
    `SANAR_CLIENT_ID = ${secret}`,
    `export SANAR_CLIENT_ID=${secret}`,
    `clientId=${secret}`,
    `  cid=${secret}`,
  ]) {
    assert.equal(findClientIdLiterals(line).length, 1, `detector should flag the unquoted line: ${line.split('=')[0]}`);
  }
  for (const line of [
    'SANAR_CLIENT_ID=<CLIENT_ID from config>',
    'authToken=<client ID>',
    ['SANAR_CLIENT_ID', ''].join('='),
    `SANAR_CLIENT_ID=abc`,
    'authToken=$(SANAR_CLIENT_ID)',
    'authToken=${SANAR_CLIENT_ID}',
    'authToken = BuildConfig.SANAR_CLIENT_ID,',
    'authToken = sanarClientId,',
    'cid = process.env.SANAR_CLIENT_ID',
    'cid = null',
    'val authToken = fromConfig',
  ]) {
    assert.equal(findClientIdLiterals(line).length, 0, `detector should allow the unquoted line: ${line}`);
  }

  // P2-R8: positional literals in connect calls. The calls are assembled at run time too.
  const call = (...args) => 'SanarKit.connect' + '(' + args.join(', ') + ')';
  const lit = (value, quote = "'") => quote + value + quote;
  for (const found of [
    call(lit(secret), 'userInfo'),
    call(lit(secret, '"'), 'userInfo', lit('en')),
    call('userInfo', lit(secret, '"'), 'bundleId', lit('en'), 'onSuccess', 'onError'),
    call('\n  userInfo,\n  ' + lit(secret, '"') + ',\n  bundleId,\n'),
    call(lit(secret, '`'), 'userInfo'),
  ]) {
    assert.equal(findClientIdLiterals(found).length, 1, `detector should flag the positional literal in: ${found}`);
  }
  for (const allowed of [
    call('SANAR_CLIENT_ID', 'userInfo'),
    call(lit('<CLIENT_ID from config>'), 'userInfo'),
    call('userInfo', lit('<client ID>', '"'), 'bundleId'),
    call('userInfo', 'authToken', lit('com.example.app', '"'), lit('en'), 'onSuccess', 'onError'),
    call('cid: string', 'info: UserInfo', 'lang?: string'),
    call('SANAR_CLIENT_ID', 'toUserInfo(user)'),
    call('userInfo', lit('en')),
    'SanarKit.disconnect' + '(' + lit(secret) + ')',
  ]) {
    assert.equal(findClientIdLiterals(allowed).length, 0, `detector should allow: ${allowed}`);
  }

  // Fix round 1: three shapes the detector missed. The plants are assembled at run time, so this
  // file never contains a literal that the scan below would flag.
  const bcf = (name, value) => 'buildConfigField(' + ['"String"', '"' + name + '"', value].join(', ') + ')';
  const kotlinLiteral = (value) => '"\\"' + value + '\\""'; // "\"value\""
  for (const found of [
    // 1. an xcconfig setting with a condition in brackets
    `SANAR_CLIENT_ID[config=Release] = ${secret}`,
    `SANAR_CLIENT_ID[sdk=iphoneos*] = ${secret}`,
    `  PROD_CLIENT_ID[config=Release]=${secret}`,
    // 2. a plist key followed by its string
    `<key>SANAR_CLIENT_ID</key><string>${secret}</string>`,
    `<key>SANAR_CLIENT_ID</key>\n\t<string>${secret}</string>`,
    `<key>clientId</key>\n<string>${secret}</string>`,
    // 3. a Gradle buildConfigField whose value is a literal (Kotlin and Groovy, one line or several)
    bcf('SANAR_CLIENT_ID', kotlinLiteral(secret)),
    `buildConfigField 'String', 'SANAR_CLIENT_ID', '"${secret}"'`,
    `buildConfigField "String", "SANAR_CLIENT_ID", "\\"${secret}\\""`,
    'buildConfigField(\n    "String",\n    "SANAR_CLIENT_ID",\n    ' + kotlinLiteral(secret) + '\n)',
  ]) {
    assert.equal(findClientIdLiterals(found).length, 1, `detector should flag the planted literal in: ${found}`);
  }
  for (const allowed of [
    'SANAR_CLIENT_ID[config=Release] = <CLIENT_ID from config>',
    'SANAR_CLIENT_ID[config=Release] = $(SANAR_CLIENT_ID_RELEASE)',
    'SANAR_ENVIRONMENT[config=Release] = production',
    'SANAR_CLIENT_ID[config=Release] = abc',
    '<key>SANAR_CLIENT_ID</key><string>$(SANAR_CLIENT_ID)</string>',
    '<key>SANAR_CLIENT_ID</key>\n  <string>$(SANAR_CLIENT_ID)</string>',
    '<key>SANAR_CLIENT_ID</key><string></string>',
    '<key>SANAR_ENVIRONMENT</key><string>production</string>',
    '<key>NSCameraUsageDescription</key><string>Camera access lets you take part in video consultations.</string>',
    bcf('SANAR_CLIENT_ID', '"\\"${sanarClientId("development")}\\""'),
    bcf('SANAR_CLIENT_ID', '"\\"${localProperties.getProperty("sanar.clientId")}\\""'),
    bcf('SANAR_CLIENT_ID', '"\\"\\""'),
    bcf('SANAR_CLIENT_ID', kotlinLiteral('<CLIENT_ID from config>')),
    bcf('SANAR_CLIENT_ID', 'localProperties.getProperty("sanar.clientId") ?: ""'),
    bcf('SANAR_ENVIRONMENT', kotlinLiteral('development')),
    "buildConfigField 'String', 'SANAR_CLIENT_ID', \"\\\"${sanarClientId('production')}\\\"\"",
    "buildConfigField 'String', 'SANAR_CLIENT_ID', System.getenv('SANAR_CLIENT_ID') ?: '\"\"'",
    'A `buildConfigField` line was added without turning on BuildConfig.',
  ]) {
    assert.equal(findClientIdLiterals(allowed).length, 0, `detector should allow: ${allowed}`);
  }

  // P2-R16: four more shapes. Planted: chained xcconfig conditions, a quoted value after a bracket
  // condition, an unquoted value followed by a comment, and a buildConfigField that joins literals.
  // Look-alikes: the same keys with a placeholder, a build variable or a short value, and a value
  // that joins plain identifiers (a lookup, not a literal). Assembled at run time, like the plants above.
  const quotedValue = (value) => '"' + value + '"';
  for (const found of [
    `SANAR_CLIENT_ID[sdk=iphoneos*][config=Release] = ${secret}`,
    `SANAR_CLIENT_ID[sdk=iphoneos*][config=Release]=${secret}`,
    `SANAR_CLIENT_ID[config=Release] = ${quotedValue(secret)}`,
    `SANAR_CLIENT_ID[sdk=iphoneos*][config=Release] = ${quotedValue(secret)}`,
    `SANAR_CLIENT_ID = ${secret} // prod`,
    `SANAR_CLIENT_ID=${secret} # prod`,
    `SANAR_CLIENT_ID[config=Release] = ${secret} // prod`,
    // A literal that is joined to other parts is still a literal.
    bcf('SANAR_CLIENT_ID', '"\\"" + "' + secret + '" + "\\""'),
    bcf('SANAR_CLIENT_ID', '"\\"' + secret + '" + suffix + "\\""'),
  ]) {
    assert.equal(findClientIdLiterals(found).length, 1, `detector should flag the planted literal in: ${found}`);
  }
  for (const allowed of [
    'SANAR_CLIENT_ID[sdk=iphoneos*][config=Release] = <CLIENT_ID from config>',
    'SANAR_CLIENT_ID[sdk=iphoneos*][config=Release] = $(SANAR_CLIENT_ID_RELEASE)',
    'SANAR_ENVIRONMENT[sdk=iphoneos*][config=Release] = production',
    'SANAR_CLIENT_ID[config=Release] = "<CLIENT_ID from config>"',
    'SANAR_CLIENT_ID[config=Release] = "abc"',
    'SANAR_CLIENT_ID[config=Release] = "$(SANAR_CLIENT_ID_RELEASE)"',
    'SANAR_CLIENT_ID = "$(SANAR_CLIENT_ID_RELEASE)"',
    'SANAR_CLIENT_ID = "${SANAR_CLIENT_ID_RELEASE}"',
    'SANAR_CLIENT_ID = $(SANAR_CLIENT_ID_RELEASE) // prod',
    'SANAR_CLIENT_ID = <CLIENT_ID from config> // prod',
    'SANAR_CLIENT_ID = abc // prod',
    'SANAR_CLIENT_ID = sanarClientId # prod',
    'SANAR_ENVIRONMENT = production // prod',
    bcf('SANAR_CLIENT_ID', '"\\"" + clientId + "\\""'),
    bcf('SANAR_CLIENT_ID', '"\\"" + BuildConfig.clientId + "\\""'),
    "buildConfigField 'String', 'SANAR_CLIENT_ID', '\"' + clientId + '\"'",
  ]) {
    assert.equal(findClientIdLiterals(allowed).length, 0, `detector should allow: ${allowed}`);
  }

  const offenders = [];
  for (const file of walk(ROOT, skipRepoNoise)) {
    if (statSync(file).size > 1024 * 1024) continue;
    const inTests = file.startsWith(join(ROOT, 'tests') + sep);
    for (const found of findClientIdLiterals(readText(file))) {
      if (inTests && found.value === 'E2E_FAKE_CLIENT_ID_123') continue;
      offenders.push(`${relative(ROOT, file)}: ${found.text}`);
    }
  }
  assert.deepEqual(offenders, [], 'client IDs must never be written into the repo');
});

// ---- iOS reference checks ----

const iosReference = (name) => join(REFS_DIR, name);

test('ios installation uses the Swift Package', () => {
  const text = readText(iosReference('ios-installation.md'));
  assert.ok(text.includes('https://github.com/MarenTech/SanarKit'), 'names the Swift Package address');
  assert.ok(text.includes('iOS 15'), 'states the iOS 15 that Package.swift declares');
  assert.ok(text.includes('17.5'), 'states the iOS 17.5 that the shipped binary is built for');
  assert.ok(text.includes('NSCameraUsageDescription'), 'adds the camera usage string');
  assert.ok(text.includes('NSMicrophoneUsageDescription'), 'adds the microphone usage string');
  assert.ok(
    text.toLowerCase().includes('ask before changing the deployment target'),
    'tells the agent to ask before changing the deployment target',
  );
});

test('ios connect reference keeps the client ID out of source', () => {
  const text = readText(iosReference('ios-connect.md'));
  assert.ok(text.includes('.gitignore'), 'ios-connect.md tells the agent to git-ignore the config file');
  assert.ok(text.includes('<CLIENT_ID from config>'), 'ios-connect.md uses the placeholder <CLIENT_ID from config>');
  assert.ok(text.includes('forInfoDictionaryKey'), 'ios-connect.md reads the value from Info.plist at run time');
  assert.ok(text.includes('SKManager.connect'), 'ios-connect.md covers SKManager.connect');
  assert.deepEqual(findClientIdLiterals(text), [], 'no client ID literal in ios-connect.md');

  // Fix round 1: the git checks use the file's real path and check that it exists first, because
  // `git ls-files <bare name>` prints nothing for a file in a subfolder even when it is tracked.
  assert.ok(!/git (?:check-ignore|ls-files)\b[^\n]*\sSanar\.xcconfig\b/.test(text), 'no git check on a bare file name');
  assert.ok(text.includes('test -f <path>/Sanar.xcconfig'), 'ios-connect.md checks that the file exists first');
  assert.ok(text.includes('Task.isCancelled'), 'the session ignores a connect that finished after it was cancelled');
  assert.ok(text.includes('PlistBuddy'), 'ios-connect.md reads the built app Info.plist to verify the config');
});

// ---- Android reference checks ----

const androidReference = (name) => join(REFS_DIR, name);

test('android installation uses the 2.1.1 aar', () => {
  const text = readText(androidReference('android-installation.md'));
  assert.ok(text.includes('sanarkit-release-2.1.1.aar'), 'names the 2.1.1 .aar file');
  assert.ok(
    text.includes('implementation(files(') || text.includes('implementation files('),
    'adds the .aar as a files() dependency',
  );
  assert.ok(text.includes('android.permission.CAMERA'), 'the host app declares the camera permission');
  assert.ok(text.includes('android.permission.RECORD_AUDIO'), 'the host app declares the microphone permission');
});

// The shared detector skips a Gradle client ID value that contains a lookup, and cannot see a
// literal used as the fallback of that lookup. These checks read the fenced code of the Android
// references: every client ID field must be filled from a lookup, and no lookup may have a
// literal fallback (a default argument, or the right-hand side of ?:).
const fencedCode = (text) =>
  [...text.matchAll(/^[ \t]*```[^\n]*\n([\s\S]*?)^[ \t]*```/gm)].map((match) => match[1]).join('\n');

const stringLiteral = (arg) => /^(["'`])([^"'`\n]*)\1$/.exec(arg.trim())?.[2];
const isFallbackSecret = (value) => value !== undefined && value.length >= 6 && !value.includes('$') && !isPlaceholder(value);

function androidClientIdProblems(code) {
  const problems = [];
  // 1. buildConfigField for a client ID field, on one line or several: the value must be a lookup.
  for (const call of code.matchAll(/\bbuildConfigField\b(\s*\()?/g)) {
    const rest = code.slice(call.index + call[0].length);
    const source = call[1] ? rest : `${rest.split('\n', 1)[0]})`;
    const [, name = '', value = ''] = callArguments(source, 0).map((arg) => arg.trim());
    if (/CLIENT_ID/i.test(name) && !/\$\{|getenv|getProperty/.test(value)) {
      problems.push(`buildConfigField for ${name} is not a lookup: ${value}`);
    }
  }
  // 2. a literal fallback passed to a lookup: getProperty("key", "literal"), getOrElse("literal").
  for (const call of code.matchAll(/\b(getProperty|getenv|gradleProperty|getOrDefault|getOrElse|orElse|ifEmpty|ifBlank)\s*[({]/g)) {
    const args = callArguments(code, call.index + call[0].length).map((arg) => arg.trim());
    const fallbacks = /^(getProperty|getenv|gradleProperty|getOrDefault)$/.test(call[1]) ? args.slice(1) : args;
    for (const arg of fallbacks) {
      if (isFallbackSecret(stringLiteral(arg))) problems.push(`${call[1]}() has a literal fallback: ${arg}`);
    }
  }
  // 3. a literal on the right of ?:
  for (const match of code.matchAll(/\?:\s*(["'])([^"'\n]*)\1/g)) {
    if (isFallbackSecret(match[2])) problems.push(`?: has a literal fallback: ${match[0]}`);
  }
  return problems;
}

test('android client ID checks catch literals that the shared detector skips', () => {
  // The plants are assembled at run time, so this file never contains a literal that the scan flags.
  const secret = 'abcdef123456';
  const bcf = (value, name = 'SANAR_CLIENT_ID') => 'buildConfigField(' + ['"String"', '"' + name + '"', value].join(', ') + ')';
  const kotlinLiteral = (value) => '"\\"' + value + '\\""'; // "\"value\""
  const key = '"sanar.development.clientId"';
  for (const planted of [
    bcf(kotlinLiteral(secret)),
    'buildConfigField(\n    "String",\n    "SANAR_CLIENT_ID",\n    ' + kotlinLiteral(secret) + '\n)',
    `buildConfigField 'String', 'SANAR_CLIENT_ID', '"${secret}"'`,
    `buildConfigField "String", "SANAR_CLIENT_ID", "\\"${secret}\\""`,
    'localProperties.getProperty(' + key + ', "' + secret + '")',
    'localProperties.getProperty(' + key + ') ?: "' + secret + '"',
    "System.getenv('SANAR_PRODUCTION_CLIENT_ID') ?: '" + secret + "'",
    'providers.gradleProperty(' + key + ').getOrElse("' + secret + '")',
    'providers.gradleProperty(' + key + ').orElse("' + secret + '").get()',
    'val id = System.getenv("X").orEmpty().ifBlank { "' + secret + '" }',
  ]) {
    assert.equal(androidClientIdProblems(planted).length, 1, `should flag: ${planted}`);
  }
  for (const allowed of [
    bcf('"\\"${sanarClientId("development")}\\""'),
    'buildConfigField(\n    "String",\n    "SANAR_CLIENT_ID",\n    "\\"${sanarClientId("development")}\\""\n)',
    "buildConfigField 'String', 'SANAR_CLIENT_ID', \"\\\"${sanarClientId('production')}\\\"\"",
    bcf(kotlinLiteral('development'), 'SANAR_ENVIRONMENT'),
    'localProperties.getProperty("sanar.$environment.clientId")?.trim()?.takeIf { it.isNotEmpty() } ?: ""',
    'localProperties.getProperty(' + key + ', "")',
    "fromFile ?: fromEnv ?: ''",
    'System.getenv("SANAR_${environment.uppercase()}_CLIENT_ID")?.trim()',
    'providers.gradleProperty("sanar.$environment.clientId").orNull',
    'localProperties.getProperty(' + key + ') ?: "<CLIENT_ID from config>"',
  ]) {
    assert.deepEqual(androidClientIdProblems(allowed), [], `should allow: ${allowed}`);
  }
});

test('android connect reference keeps the client ID out of source', () => {
  const text = readText(androidReference('android-connect.md'));
  assert.ok(text.includes('.gitignore'), 'android-connect.md tells the agent to git-ignore the config file');
  assert.ok(text.includes('<CLIENT_ID from config>'), 'android-connect.md uses the placeholder <CLIENT_ID from config>');
  assert.ok(text.includes('BuildConfig.SANAR_CLIENT_ID'), 'android-connect.md reads the value through BuildConfig');
  assert.ok(text.includes('runOnUiThread'), 'android-connect.md says the callbacks need runOnUiThread');
  assert.deepEqual(findClientIdLiterals(text), [], 'no client ID literal in android-connect.md');

  // Every client ID field is filled from a lookup, and no lookup has a literal fallback.
  assert.ok(/buildConfigField[\s\S]{0,40}SANAR_CLIENT_ID/.test(fencedCode(text)), 'android-connect.md shows the buildConfigField for the client ID');
  for (const name of readdirSync(REFS_DIR).filter((f) => f.startsWith('android-') && f.endsWith('.md'))) {
    assert.deepEqual(androidClientIdProblems(fencedCode(readText(androidReference(name)))), [], `${name}: client ID literals in Gradle or fallbacks`);
  }
});
