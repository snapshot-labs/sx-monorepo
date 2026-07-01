# Checkpoint apps on Kubernetes (Helm)

Blue-green deploy of Checkpoint apps (API + indexer + PostgreSQL) on DOKS.

- `gateway/` — shared Cilium Gateway API (one per cluster)
- `public/` — per-app, per-env public entrypoint: Service + HTTPRoute + direct routes
- `checkpoint/` — per-app, per-env-color stack: PostgreSQL, Indexer and API

One chart (`checkpoint/`) serves every Checkpoint app; each app is a set of values files:

| App             | image           | `appName`   | values prefix | layout                       |
| --------------- | --------------- | ----------- | ------------- | ---------------------------- |
| `api`           | `sx-api`        | `sx-api`    | `api`         | separate API + indexer pods  |
| `delegates-api` | `delegates-api` | `delegates` | `delegates`   | single pod that also indexes |

Each env (testnet/mainnet) has two colors (blue/green) with their own DB. Deploy
to the inactive color, then flip the public Service to it. Apps share a namespace
and the gateway; resources are namespaced by `appName`.

> Run commands from the repo root (chart paths are `helm/...`). Examples below use
> `api` in `testnet` — swap the values prefix (`api` → `delegates`) and release
> name for the other app.

## Gateway (once per cluster)

```bash
kubectl create namespace gateway
helm upgrade --install sx-gateway helm/gateway -n gateway
kubectl -n gateway get gateway sx-api -o wide
```

## Bootstrap an environment (once per app + env)

```bash
kubectl create namespace testnet
kubectl -n testnet create secret generic sx-api-secrets \
  --from-literal=POSTGRES_PASSWORD=<pw> \
  --from-literal=HYPERSYNC_API_TOKEN=<token>
kubectl -n testnet create secret docker-registry ghcr \
  --docker-server=ghcr.io --docker-username=<gh-user> --docker-password=<pat>
helm upgrade --install testnet-api-public helm/public -n testnet \
  -f helm/public/values-api-testnet.yaml --set activeColor=blue
```

The `ghcr` pull secret is shared by every app in the namespace. The app secret is
per app (`<appName>-secrets`); `delegates` bootstraps the same way with
`delegates-secrets` and `helm/public/values-delegates-mainnet.yaml`.

## Deploy

```bash
# logtail is optional and api-only
kubectl -n testnet create secret generic sx-api-logtail-blue \
  --from-literal=LOGTAIL_HOST=<host> --from-literal=LOGTAIL_TOKEN=<token>

helm upgrade --install testnet-api-blue helm/checkpoint -n testnet \
  -f helm/checkpoint/values-api-testnet.yaml \
  --set color=blue --set image.tag=<sha> --wait
```

For the indexer, `image.tag` is also `GIT_COMMIT`: a new tag reindexes from 0, the
same tag resumes.

## Promotion

```bash
# point traffic at green
helm upgrade testnet-api-public helm/public -n testnet \
  -f helm/public/values-api-testnet.yaml --set activeColor=green
```

## Remove a color

```bash
helm uninstall testnet-api-blue -n testnet
kubectl -n testnet delete pvc postgres-data-sx-api-db-blue-0
```
