import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import rpc from './rpc';
import { version } from '../package.json';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '4mb' }));
app.use(bodyParser.urlencoded({ limit: '4mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.use('/', rpc);
app.get('/', (req, res) => res.json({ version, port: PORT }));

app.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`));
