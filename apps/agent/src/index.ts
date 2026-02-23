import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createAgentAccount } from './cdp';
import {
  confirmAgent,
  createAgent,
  deleteAgent,
  getAgentByAddress,
  getAgentsByUser,
  setAgentContexts,
  updateAgent
} from './db';
import { triggerVote } from './voter';

const PORT = process.env.PORT || 3002;

const app = express();
app.use(express.json());
app.use(cors({ maxAge: 86400 }));

app.post('/authorize', async (req, res) => {
  try {
    const { userAddress, name, soulMd, contexts } = req.body;
    if (!userAddress || !name || !soulMd) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const account = await createAgentAccount();
    const agent = await createAgent(
      userAddress,
      account.address,
      account.name,
      name,
      soulMd
    );

    if (contexts?.length) {
      await setAgentContexts(agent.id, contexts);
    }

    res.json({ agentAddress: account.address, id: agent.id });
  } catch (err) {
    console.error('Failed to create agent', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/confirm', async (req, res) => {
  try {
    const { agentAddress } = req.body;
    await confirmAgent(agentAddress);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to confirm agent', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/agent', async (req, res) => {
  try {
    const { agentAddress, name, soulMd, contexts } = req.body;
    if (!agentAddress || !name || !soulMd) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const contextEntries = (contexts || []).filter((c: any) => c.spaceId);
    await updateAgent(agentAddress, name, soulMd, contextEntries);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to update agent', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/authorize', async (req, res) => {
  try {
    const { agentAddress } = req.body;
    await deleteAgent(agentAddress);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete agent', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/agent/:agentAddress', async (req, res) => {
  try {
    const agent = await getAgentByAddress(req.params.agentAddress);
    res.json(agent);
  } catch (err) {
    console.error('Failed to fetch agent', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/agents/:userAddress', async (req, res) => {
  try {
    const agents = await getAgentsByUser(req.params.userAddress);
    res.json(agents);
  } catch (err) {
    console.error('Failed to fetch agents', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/trigger', async (req, res) => {
  try {
    const result = await triggerVote(
      req.query.proposalId as string | undefined
    );
    res.json(result);
  } catch (err) {
    console.error('Failed to trigger vote', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error'
    });
  }
});

app.get('/', (_req, res) =>
  res.json({ name: 'snapshot-agent', status: 'ok' })
);

const server = app.listen(PORT, () =>
  console.log(`Agent listening at http://localhost:${PORT}`)
);

process.on('uncaughtException', err => {
  console.error('Uncaught exception', err);
  server.close(() => process.exit(1));
});
