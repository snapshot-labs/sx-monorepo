import { execSync, fork, spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { checkbox } from '@inquirer/prompts';

type ServiceType =
  | 'ui'
  | 'api'
  | 'mana'
  | 'highlight'
  | 'snack-anvil'
  | 'snack-oracle';
type Service = {
  env: Record<string, string>;
};

const SERVICES: Record<ServiceType, Service> = {
  ui: {
    env: {}
  },
  api: {
    env: {
      UI_URL: 'http://localhost:8080',
      ENABLED_NETWORKS: 'sep,sn-sep',
      VITE_ENABLED_NETWORKS: 's-tn,sep,sn-sep',
      VITE_METADATA_NETWORK: 's-tn',
      VITE_API_TESTNET_URL: 'http://localhost:3000'
    }
  },
  mana: {
    env: {
      VITE_MANA_URL: 'http://localhost:3001'
    }
  },
  highlight: {
    env: {
      VITE_HIGHLIGHT_URL: 'http://localhost:3002'
    }
  },
  'snack-anvil': {
    env: {
      VITE_SNACK_ENABLED: 'true',
      VITE_SNACK_RPC_URL: 'http://127.0.0.1:8546'
    }
  },
  'snack-oracle': {
    env: {}
  }
};

const DOCKER_CMD = `docker compose -f scripts/docker-compose.yml up -d`;

let anvilProcess: ChildProcess | null = null;

async function waitForAnvil(
  url: string,
  timeoutMs = 10000
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1
        })
      });
      if (res.ok) return true;
    } catch {
      // Not ready yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function startAnvil(): Promise<Record<string, string>> {
  console.log('Starting Anvil...');
  anvilProcess = spawn('anvil', ['--port', '8546', '--chain-id', '13370'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  anvilProcess.stderr?.on('data', (data: Buffer) => {
    const line = data.toString().trim();
    if (line) console.log(`[anvil] ${line}`);
  });

  const ready = await waitForAnvil('http://127.0.0.1:8546');
  if (!ready) {
    throw new Error('Anvil failed to start within 10 seconds');
  }
  console.log('Anvil started on port 8545');

  // Deploy contracts
  console.log('Deploying Snack contracts...');
  const snackDir = path.resolve('core/snack');
  const deployOutput = execSync(
    'forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8546 --broadcast 2>&1',
    { cwd: snackDir, encoding: 'utf-8' }
  );

  // Parse deployed addresses from forge output
  const factoryMatch = deployOutput.match(/SnackFactory:\s+(0x[0-9a-fA-F]+)/);
  const usdcMatch = deployOutput.match(/MockUSDC:\s+(0x[0-9a-fA-F]+)/);

  const factoryAddress = factoryMatch?.[1] ?? '';
  const usdcAddress = usdcMatch?.[1] ?? '';

  console.log(`MockUSDC deployed at: ${usdcAddress}`);
  console.log(`SnackFactory deployed at: ${factoryAddress}`);

  return {
    VITE_SNACK_FACTORY_ADDRESS: factoryAddress,
    FACTORY_ADDRESS: factoryAddress
  };
}

function runTurboWithFilters(
  serviceTypes: ServiceType[],
  extraEnvOverrides: Record<string, string> = {}
) {
  // Filter out snack services — they're not turbo packages
  const turboServices = serviceTypes.filter(
    s => s !== 'snack-anvil' && s !== 'snack-oracle'
  );

  if (turboServices.length === 0) return;

  const turboPath = path.resolve('node_modules', '.bin', 'turbo');
  const filterArgs = turboServices.flatMap(filter => [
    '--filter',
    `${filter}...`
  ]);
  const args = ['run', 'dev', ...filterArgs];

  const extraEnv = serviceTypes.reduce((acc, serviceType) => {
    return { ...acc, ...SERVICES[serviceType].env };
  }, {});

  const child = fork(turboPath, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
      ...extraEnvOverrides
    }
  });

  child.on('error', error => {
    console.error(`Error executing turbo: ${error.message}`);
  });

  child.on('exit', code => {
    if (code !== 0) {
      console.error(`Turbo process exited with code ${code}`);
    } else {
      console.log(
        `Turbo process finished successfully with filters: ${turboServices.join(', ')}`
      );
    }
    // Clean up Anvil if running
    if (anvilProcess) {
      anvilProcess.kill();
      anvilProcess = null;
    }
  });
}

function startOracleServer(extraEnv: Record<string, string>) {
  console.log('Starting Snack Oracle on port 3003...');
  const oracleDir = path.resolve('apps/snack-oracle');

  const child = fork(
    path.resolve('node_modules', '.bin', 'nodemon'),
    ['src/index.ts'],
    {
      cwd: oracleDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...extraEnv,
        PORT: '3003',
        RPC_URL: 'http://127.0.0.1:8546',
        ORACLE_PRIVATE_KEY:
          '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
      }
    }
  );

  child.on('error', error => {
    console.error(`Error starting oracle: ${error.message}`);
  });
}

async function run() {
  try {
    const answer = await checkbox({
      message: 'Select services to run locally',
      choices: [
        { name: 'UI', value: 'ui' as const },
        { name: 'API (only sep and sn-sep)', value: 'api' as const },
        { name: 'Mana', value: 'mana' as const },
        { name: 'Highlight', value: 'highlight' as const },
        {
          name: 'Snack (Anvil + contracts)',
          value: 'snack-anvil' as const
        },
        { name: 'Snack Oracle', value: 'snack-oracle' as const }
      ]
    });

    if (
      answer.includes('api') ||
      answer.includes('mana') ||
      answer.includes('highlight')
    ) {
      console.log('Starting Docker for backend services...');
      execSync(DOCKER_CMD);
      console.log('Docker started');
    }

    if (answer.length === 0) {
      console.log('No services selected, exiting...');
      process.exit(0);
    }

    let deployedAddresses: Record<string, string> = {};

    // Start Anvil and deploy contracts if Snack is selected
    if (answer.includes('snack-anvil')) {
      deployedAddresses = await startAnvil();
    }

    // Start oracle if selected
    if (answer.includes('snack-oracle')) {
      startOracleServer(deployedAddresses);
    }

    runTurboWithFilters(answer, deployedAddresses);
  } catch {
    if (anvilProcess) {
      anvilProcess.kill();
    }
    process.exit(1);
  }
}

run();
