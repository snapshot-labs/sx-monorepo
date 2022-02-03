import Client from '@/helpers/x';

const url = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3000';
const client = new Client(url);

export default client;
