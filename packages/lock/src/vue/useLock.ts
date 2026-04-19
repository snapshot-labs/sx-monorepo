import { computed, ComputedRef, ref } from 'vue';
import connectorsClass from '../connectors';
import Eip6963 from '../eip6963';
import { Connector, ConnectorType } from '../types';

export type ConnectorDetail = Partial<
  Pick<Connector, 'id' | 'info' | 'options' | 'provider'> & {
    autoConnectOnly?: boolean;
  }
>;

const eip6963 = new Eip6963();
eip6963.subscribe();
eip6963.requestProviders();

const injectedProviders = ref(eip6963.providerDetails);

export function useLock(details: Record<ConnectorType, ConnectorDetail>): {
  connectors: ComputedRef<Connector[]>;
} {
  function getConnectors(
    type: ConnectorType,
    connector: ConnectorDetail
  ): ConnectorDetail[] {
    if (type !== 'injected') return [connector];
    return Array.from(injectedProviders.value.entries()).map(
      ([id, detail]) => ({
        id,
        info: { name: detail.info.name, icon: detail.info.icon },
        provider: detail.provider
      })
    );
  }

  const connectors = computed<Connector[]>(() =>
    (Object.entries(details) as [ConnectorType, ConnectorDetail][]).flatMap(
      ([type, detail]) =>
        getConnectors(type, detail).map(
          d =>
            new connectorsClass[type]({
              id: d.id || type,
              type,
              info: d.info ?? { name: type },
              options: d.options,
              provider: d.provider,
              autoConnectOnly: d.autoConnectOnly ?? false
            }) as unknown as Connector
        )
    )
  );

  return { connectors };
}
