import fs from 'fs';
import path from 'path';
import database from '../database.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

function toLegoSearchString(setNum) {
  const normalized = String(setNum ?? '').trim();
  if (!normalized) {
    return '';
  }
  const dashIndex = normalized.indexOf('-');
  if (dashIndex <= 0) {
    return normalized;
  }
  return normalized.slice(0, dashIndex);
}

async function upsertInstruction(setNum, payload) {
  const sqlFind = 'SELECT id FROM set_instructions WHERE set_num = ? AND url = ? LIMIT 1';
  const rows = await database.query(sqlFind, [setNum, payload.url]);

  if (Array.isArray(rows) && rows.length > 0) {
    const sqlUpdate = `
      UPDATE set_instructions
      SET source = ?, source_label = ?, name = ?, instruction_type = ?, sort_order = ?
      WHERE id = ?
    `;

    await database.query(sqlUpdate, [
      payload.source,
      payload.sourceLabel,
      payload.name,
      payload.instructionType,
      payload.sortOrder,
      rows[0].id
    ]);

    return { inserted: 0, updated: 1 };
  }

  const sqlInsert = `
    INSERT INTO set_instructions
      (set_num, source, source_label, url, name, instruction_type, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  await database.query(sqlInsert, [
    setNum,
    payload.source,
    payload.sourceLabel,
    payload.url,
    payload.name,
    payload.instructionType,
    payload.sortOrder
  ]);

  return { inserted: 1, updated: 0 };
}

async function enrichFromJson(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(resolved, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error('JSON file must contain an array of set objects.');
  }

  let inserted = 0;
  let updated = 0;

  for (const item of data) {
    const setNum = item?.set_num;
    const instructions = Array.isArray(item?.instructions) ? item.instructions : [];

    if (!setNum || instructions.length === 0) {
      continue;
    }

    for (let i = 0; i < instructions.length; i += 1) {
      const entry = instructions[i];
      if (!entry?.url) {
        continue;
      }

      const result = await upsertInstruction(setNum, {
        source: entry.source || 'json-import',
        sourceLabel: entry.source_label || 'JSON Import',
        url: entry.url,
        name: entry.name || null,
        instructionType: entry.type || null,
        sortOrder: Number.isInteger(entry.sort_order) ? entry.sort_order : i
      });

      inserted += result.inserted;
      updated += result.updated;
    }
  }

  return { inserted, updated };
}

async function enrichFromRebrickable(apiKey, limit) {
  const sets = limit > 0
    ? await database.query('SELECT set_num FROM sets ORDER BY set_num LIMIT ?', [limit])
    : await database.query('SELECT set_num FROM sets ORDER BY set_num');

  let inserted = 0;
  let updated = 0;
  let checked = 0;

  for (const row of sets) {
    const setNum = row.set_num;
    checked += 1;

    const response = await fetch(`https://rebrickable.com/api/v3/lego/sets/${encodeURIComponent(setNum)}/`, {
      headers: {
        Authorization: `key ${apiKey}`
      }
    });

    if (!response.ok) {
      continue;
    }

    const payload = await response.json();

    const candidateUrls = [];

    if (typeof payload?.instructions_url === 'string' && payload.instructions_url.trim().length > 0) {
      candidateUrls.push({
        url: payload.instructions_url,
        name: 'Instructions',
        type: 'instructions'
      });
    }

    if (typeof payload?.set_url === 'string' && payload.set_url.trim().length > 0) {
      candidateUrls.push({
        url: payload.set_url,
        name: 'Set Page',
        type: 'set-page'
      });
    }

    for (let i = 0; i < candidateUrls.length; i += 1) {
      const entry = candidateUrls[i];
      const result = await upsertInstruction(setNum, {
        source: 'rebrickable',
        sourceLabel: 'Rebrickable API',
        url: entry.url,
        name: entry.name,
        instructionType: entry.type,
        sortOrder: i
      });

      inserted += result.inserted;
      updated += result.updated;
    }
  }

  return { checked, inserted, updated };
}

async function enrichSetPageLinks(limit) {
  const sets = limit > 0
    ? await database.query('SELECT set_num FROM sets ORDER BY set_num LIMIT ?', [limit])
    : await database.query('SELECT set_num FROM sets ORDER BY set_num');

  let inserted = 0;
  let updated = 0;

  for (const row of sets) {
    const setNum = String(row.set_num ?? '').trim();
    if (!setNum) {
      continue;
    }

    const url = `https://rebrickable.com/sets/${encodeURIComponent(setNum)}/`;
    const result = await upsertInstruction(setNum, {
      source: 'rebrickable',
      sourceLabel: 'Rebrickable Set Page',
      url,
      name: 'Set Page',
      instructionType: 'set-page',
      sortOrder: 1000
    });

    inserted += result.inserted;
    updated += result.updated;
  }

  return { checked: sets.length, inserted, updated };
}

async function enrichLegoInstructionSearchLinks(limit, locale = 'en-us') {
  const sets = limit > 0
    ? await database.query('SELECT set_num FROM sets ORDER BY set_num LIMIT ?', [limit])
    : await database.query('SELECT set_num FROM sets ORDER BY set_num');

  let inserted = 0;
  let updated = 0;

  for (const row of sets) {
    const setNum = String(row.set_num ?? '').trim();
    if (!setNum) {
      continue;
    }

    const searchString = toLegoSearchString(setNum);
    if (!searchString) {
      continue;
    }

    // LEGO search is more reliable with the base set ID (e.g. 7239 from 7239-1).
    const url = `https://www.lego.com/${encodeURIComponent(locale)}/service/building-instructions/search-results?searchString=${encodeURIComponent(searchString)}&page=1`;
    const result = await upsertInstruction(setNum, {
      source: 'lego',
      sourceLabel: 'LEGO Building Instructions',
      url,
      name: 'LEGO Instructions Search',
      instructionType: 'instructions-search',
      sortOrder: 0
    });

    inserted += result.inserted;
    updated += result.updated;
  }

  return { checked: sets.length, inserted, updated, locale };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.mode || 'json';

  if (mode === 'json') {
    if (typeof args.file !== 'string' || args.file.trim().length === 0) {
      throw new Error('Missing --file for json mode.');
    }

    const result = await enrichFromJson(args.file);
    console.log('Instruction enrichment complete (json mode).', result);
    return;
  }

  if (mode === 'rebrickable') {
    const apiKey = args.apiKey || process.env.REBRICKABLE_API_KEY;
    if (!apiKey) {
      throw new Error('Missing Rebrickable API key. Use --apiKey or REBRICKABLE_API_KEY.');
    }

    const parsedLimit = Number.parseInt(args.limit, 10);
    const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 250 : Math.min(parsedLimit, 5000);

    const result = await enrichFromRebrickable(apiKey, limit);
    console.log('Instruction enrichment complete (rebrickable mode).', result);
    return;
  }

  if (mode === 'set-page') {
    const parsedLimit = Number.parseInt(args.limit, 10);
    const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 0 : Math.min(parsedLimit, 100000);
    const result = await enrichSetPageLinks(limit);
    console.log('Instruction enrichment complete (set-page mode).', result);
    return;
  }

  if (mode === 'lego-search') {
    const parsedLimit = Number.parseInt(args.limit, 10);
    const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 0 : Math.min(parsedLimit, 100000);
    const locale = typeof args.locale === 'string' && args.locale.trim().length > 0
      ? args.locale.trim().toLowerCase()
      : 'en-us';
    const result = await enrichLegoInstructionSearchLinks(limit, locale);
    console.log('Instruction enrichment complete (lego-search mode).', result);
    return;
  }

  throw new Error('Unsupported mode. Use --mode json, --mode rebrickable, --mode set-page or --mode lego-search.');
}

run()
  .catch((error) => {
    console.error('Instruction enrichment failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await database.close();
    } catch {
      // Ignore pool close errors at process shutdown.
    }
  });
