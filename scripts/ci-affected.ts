// Prints which CI jobs the changes between two commits need, as `job=true|false`
// lines. A job is skipped only when no changed file can affect it: files in a
// workspace affect that workspace and the ones depending on it, files that
// nothing tests affect nothing, and every other file affects everything.
import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';

const JOBS = {
  hub: 'apps/hub',
  sequencer: 'apps/sequencer',
  integration: 'packages/sx.js',
  e2e: 'apps/ui'
};

// Dependencies that are not declared in package.json.
const EXTRA_DEPENDENCIES: Record<string, string[]> = {
  // The UI generates its GraphQL types from the hub and API schemas.
  'apps/ui': ['apps/hub', 'apps/api']
};

const UNTESTED = /^(docs|\.changeset)\/|(^|\/)(README|AGENTS|CHANGELOG)\.md$/;
const WORKSPACE = /^(apps|packages|contracts)\/[^/]+/;

type Dependencies = Record<string, string>;
type Package = {
  name: string;
  dependencies?: Dependencies;
  devDependencies?: Dependencies;
  peerDependencies?: Dependencies;
  optionalDependencies?: Dependencies;
};

function readPackage(dir: string): Package {
  return JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'));
}

const workspaces = ['apps', 'packages', 'contracts']
  .flatMap(parent => readdirSync(parent).map(name => `${parent}/${name}`))
  .filter(dir => existsSync(`${dir}/package.json`))
  .map(dir => [dir, readPackage(dir)] as const);
const packages = new Map(workspaces);
const dirs = new Map(workspaces.map(([dir, pkg]) => [pkg.name, dir]));

function withDependencies(dir: string, seen = new Set<string>()): Set<string> {
  if (seen.has(dir)) return seen;
  seen.add(dir);

  const pkg = packages.get(dir);
  const names = Object.keys({
    ...pkg?.dependencies,
    ...pkg?.devDependencies,
    ...pkg?.peerDependencies,
    ...pkg?.optionalDependencies
  });
  for (const name of names) {
    const dependency = dirs.get(name);
    if (dependency) withDependencies(dependency, seen);
  }
  for (const dependency of EXTRA_DEPENDENCIES[dir] ?? []) {
    withDependencies(dependency, seen);
  }

  return seen;
}

const [base = 'HEAD^1', head = 'HEAD'] = process.argv.slice(2);
const files = execSync(`git diff --name-only --no-renames ${base} ${head}`, {
  encoding: 'utf8'
})
  .split('\n')
  .filter(file => file && !UNTESTED.test(file));
const changed = files.map(file => WORKSPACE.exec(file)?.[0]);
const isEverythingAffected = changed.some(dir => !dir || !packages.has(dir));

console.log(`code=${files.length > 0}`);
for (const [job, dir] of Object.entries(JOBS)) {
  const dependencies = withDependencies(dir);
  const isAffected =
    isEverythingAffected ||
    changed.some(workspace => workspace && dependencies.has(workspace));
  console.log(`${job}=${isAffected}`);
}
