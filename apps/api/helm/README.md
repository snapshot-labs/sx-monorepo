# sx-api on Kubernetes (Helm)

Blue-green deploy of the API + checkpoint indexer on DOKS.

- `gateway/` — shared Cilium Gateway API
- `public/` — per-env public entrypoint: `sx-api` Service + HTTPRoute + direct routes
- `sx-api/` — per-env-color stack: PostgreSQL, Indexer and API.

Each env (testnet/mainnet) has two colors (blue/green) with their own DB. Deploy
to the inactive color, then flip the public Service to it.

> Run all commands from `apps/api/helm/`.

## Gateway (once per cluster)

```bash
kubectl create namespace gateway
helm upgrade --install sx-gateway gateway -n gateway
kubectl -n gateway get gateway sx-api -o wide
```

## Bootstrap an environment (once per env)

```bash
kubectl create namespace testnet
kubectl -n testnet create secret generic sx-api-secrets \
  --from-literal=POSTGRES_PASSWORD=<pw> \
  --from-literal=HYPERSYNC_API_TOKEN=<token>
kubectl -n testnet create secret docker-registry ghcr \
  --docker-server=ghcr.io --docker-username=<gh-user> --docker-password=<pat>
helm upgrade --install testnet-public public -n testnet \
  -f public/values-testnet.yaml --set activeColor=blue
```

## Deploy

```bash
kubectl -n testnet create secret generic sx-api-logtail-blue \
  --from-literal=LOGTAIL_HOST=<host> --from-literal=LOGTAIL_TOKEN=<token>

helm upgrade --install testnet-blue sx-api -n testnet \
  -f sx-api/values-testnet.yaml --set color=blue --set image.tag=<sha> --wait
```

`image.tag` is also `GIT_COMMIT`: a new tag reindexes from 0, the same tag resumes.

## Promotion

```bash
# point traffic at green
helm upgrade testnet-public public -n testnet \
  -f public/values-testnet.yaml --set activeColor=green
```

## Remove a color

```bash
helm uninstall testnet-blue -n testnet
kubectl -n testnet delete pvc postgres-data-sx-api-db-blue-0
```
