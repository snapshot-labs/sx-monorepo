import { execSync, fork } from 'child_process';
import path from 'path';
import { checkbox } from '@inquirer/prompts';

type ServiceType = 'ui' | 'api' | 'mana' | 'highlight';
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
  }
};

const DOCKER_CMD = `docker compose -f scripts/docker-compose.yml up -d`;

function runTurboWithFilters(serviceTypes: ServiceType[]) {
  const turboPath = path.resolve('node_modules', '.bin', 'turbo');
  const filterArgs = serviceTypes.flatMap(filter => [
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
      ...extraEnv
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
        `Turbo process finished successfully with filters: ${serviceTypes.join(', ')}`
      );
    }
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
        { name: 'Highlight', value: 'highlight' as const }
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

    runTurboWithFilters(answer);
  } catch {
    process.exit(1);
  }
}

run();
