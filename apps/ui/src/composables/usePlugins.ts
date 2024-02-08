// URL: https://docs.google.com/spreadsheets/d/1R1qmDuKTp8WYiy-QWG0WQpu-pfoi-4TTUQKz1XdFZ1o
const PLUGINS_SHEET_ID =
  '2PACX-1vSyMqd0Ql198UtPMWO1RQmnzx-rfggEIT3Yieg8mOSf8tyNksUSLKXMpBkO1DLC8yoLqx0stynSk1Us';
const PLUGINS_SHEET_GID = '0';

async function getSpreadsheet(id: string, gid: string = '0'): Promise<any[]> {
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv&gid=${gid}&cb=${Math.random()}}`
  );
  const text = await res.text();

  return csvToJson(text);
}

function csvToJson(csv: string): any[] {
  const [header, ...lines] = csv
    .split('\n')
    .map(line =>
      line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(field => field.trim().replace(/^"|"$/g, ''))
    );

  return lines
    .filter(line => line.length > 1)
    .map(line => Object.fromEntries(header.map((key, i) => [key, line[i] || ''])));
}

const plugins: Ref<any[]> = ref([]);
const categories: Ref<string[]> = ref([]);
const loading: Ref<boolean> = ref(false);
const loaded: Ref<boolean> = ref(false);

export function usePlugins() {
  async function load() {
    if (loading.value || loaded.value) return;

    loading.value = true;

    plugins.value = await getSpreadsheet(PLUGINS_SHEET_ID, PLUGINS_SHEET_GID);
    categories.value = [...new Set(plugins.value.map(({ category }) => category))];

    loading.value = false;
    loaded.value = true;
  }

  function get(id: string) {
    return plugins.value.find(plugin => plugin.id === id) || {};
  }

  function search(q: string) {
    return plugins.value.filter(plugin => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { overview, ...appWithoutOverview } = plugin;
      return JSON.stringify(appWithoutOverview).toLowerCase().includes(q.toLowerCase());
    });
  }

  return {
    plugins,
    categories,
    loading,
    loaded,
    load,
    get,
    search
  };
}
