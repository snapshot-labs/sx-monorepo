import { Client } from '../../sx.js/src';

// @ts-ignore
const url: string = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3000';
const client = new Client(url);

export default client;
