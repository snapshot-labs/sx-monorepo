import injected from '@snapshot-labs/lock/connectors/injected';
import walletconnect from '@snapshot-labs/lock/connectors/walletconnect';
import portis from '@snapshot-labs/lock/connectors/portis';
import connectors from '@/helpers/connectors';
import walletlink from '@snapshot-labs/lock/connectors/walletlink';
import gnosis from '@snapshot-labs/lock/connectors/gnosis';
import argentx from '@/helpers/argentx';

const options: any = { connectors: [] };
const lockConnectors = {
  injected,
  walletconnect,
  walletlink,
  portis,
  gnosis,
  argentx
};

Object.entries(connectors).forEach((connector: any) => {
  options.connectors.push({
    key: connector[0],
    connector: lockConnectors[connector[0]],
    options: connector[1].options
  });
});

export default options;
