// URL: https://docs.google.com/spreadsheets/d/1aUkvul0ja3ojK8N30MbG-BdXSbWFwRbGenvdo2dPWGU
const APPS_SHEET_ID =
  '2PACX-1vSXPvTkgUnjTkBoCs-z1ionjuGFhO8kcGrXqUOw38BbS5Tf60wlgVYJCFk-El1_96xH1tHL6MNeW-6q';
const APPS_SHEET_GID = '0';

async function getSpreadsheet(id: string, gid: string = '0'): Promise<any[]> {
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv&gid=${gid}&cb=${Math.random()}}`
  );
  const text = await res.text();

  return csvToJson(text);
}

function csvToJson(csv: string): any[] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      // Handle escaped quotes
      currentField += '"';
      i++;
    } else if (char === '"') {
      // Toggle insideQuotes
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      // End of field
      currentLine.push(currentField);
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      // End of line
      currentLine.push(currentField);
      lines.push(currentLine);
      currentLine = [];
      currentField = '';
    } else {
      // Regular character
      currentField += char;
    }
  }

  currentLine.push(currentField);
  lines.push(currentLine);

  const [header, ...data] = lines;

  return data
    .filter(line => line.length > 1)
    .map(line =>
      Object.fromEntries(header.map((key, i) => [key, line[i] || '']))
    );
}

const apps: Ref<any[]> = ref([]);
const categories: Ref<string[]> = ref([]);
const loading: Ref<boolean> = ref(false);
const loaded: Ref<boolean> = ref(false);

export function useApps() {
  async function load() {
    if (loading.value || loaded.value) return;

    loading.value = true;

    apps.value = await getSpreadsheet(APPS_SHEET_ID, APPS_SHEET_GID);
    categories.value = [...new Set(apps.value.map(({ category }) => category))];

    loading.value = false;
    loaded.value = true;
  }

  function get(id: string) {
    const app = apps.value.find(app => app.id === id);
    if (!app) {
      return {};
    }

    if (app.github && !app.github.startsWith('https://')) {
      app.github = `https://github.com/${app.github}`;
    }

    if (app.x?.startsWith('@')) {
      app.x = app.x.slice(1);
    }

    return app;
  }

  function search(q: string) {
    return apps.value.filter(app => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { overview, ...appWithoutOverview } = app;
      return JSON.stringify(appWithoutOverview)
        .toLowerCase()
        .includes(q.toLowerCase());
    });
  }

  return {
    apps,
    categories,
    loading,
    loaded,
    load,
    get,
    search
  };
}
