# Using `vue-query` to fetch data

This document compiles tips and conventions used in our codebase for using `vue-query` consistently and
effectively.

## Why use `vue-query`

[`vue-query`](https://tanstack.com/query/v5/docs/framework/vue/overview) unifies data fetching in apps.
It helps to avoid writing repetitive code by implementing most what is usually needed internally.
Those things include:

- Handling data fetching state (loading, loaded, failed states).
- Caching data.
- Automatic retries.
- Simplified pagination and infinite loading.
- Support for optimistic updates.
- [And more](https://tanstack.com/query/v5/docs/framework/vue/overview).

## Assumptions

There are some assumptions in `vue-query` that you need to be aware of to use it effectively and
to avoid surprises.

1. Cache in `vue-query` is global. Be careful naming your `queryKey`s - if you use the same key for different data you might end up with results that you are not expecting.
2. `vue-query` uses `stale-while-reinvalidate` caching strategy. Once you fetched data once and then try to use it
   somewhere else in the app later (assuming it wasn't garbage collected) it'll be made available right away for you,
   and (assuming it's stale) it will be refetched and updated in the background. This allows you to avoid loading states
   while keeping data fresh.
3. `vue-query` uses `staleTime` of `0` by default. That means that once data has been fetched it'll be marked as stale
   right away - so next time it's accessed it will be refetched. You can customize this value depending on the case.

## Creating query

Most often you will use [`useQuery`](https://tanstack.com/query/v5/docs/framework/vue/reference/useQuery) or [`useInfiniteQuery`](https://tanstack.com/query/v5/docs/framework/vue/reference/useInfiniteQuery) to create your queries.

You can use those directly in components, other composables or create composable just for that query.
Creating composable is generally good idea if you'd like to use it in multiple places.

When creating composables for queries put them in `src/queries` directory.

In simplest case (no pagination) all you need for your query is `queryKey` and `queryFn`.

Make sure that your `queryKey` can react to `Ref`s or getters. If you pass non-reactive value (**INCLUDING props**)
query will not update as it will only know about the initial value.

```ts
import { MaybeRefOrGetter } from "vue";

function useProposalsQuery({
  spaceId,
  searchQuery,
}: {
  spaceId: MaybeRefOrGetter<string>;
  searchQuery: MaybeRefOrGetter<string | null>;
}) {
  return useQuery({
    queryKey: ["proposals", spaceId, "list"],
    queryFn: () => {
      return getProposals(toValue(spaceId), toValue(searchQuery));
    },
  });
}
```

In this case when `spaceId` or `searchQuery` changes so will queryKey and entire query will update.

Then it can be used like this in your component:

```ts
const props = defineProps({
  spaceId: string,
});

const searchQuery = ref("");

const { data, isPending, isError } = useProposalsQuery({
  // NOTE: spaceId: props.spaceId passes plain value so it won't work as expected! Convert it to Ref!
  // When digging for deeper value `toRef(() => props.proposal.space.id)` can be used.
  spaceId: toRef(props, "spaceId"),
  searchQuery,
});
```

## Using query

Queries return many variables that can be used in the UI, but out of those it's recommend to use at least those:

1. `data` - data that you are aiming to fetch. It can contain data from cache.
2. `isPending` - will be true if there is no data available to show (no cached data and nothing fetched yet).
3. `isError` - will be true if there is no data available to show and request to fetch it has failed (after configured retries).

It's heavily recommended to use all 3 to make sure UI handles all cases:

1. If `isPending` is true show loading state.
2. Else, if `isError` is true show error message.
3. Else display `data`.

## Composables conventions

Most of those should apply to all composables, but are especially important here.

1. Use `MaybeRefOrGetter` for composable inputs per [official recommendation](https://vuejs.org/guide/reusability/composables.html#input-arguments).
2. Unless your composable has only few input arguments use object for arguments (`useProposals({ spaceId, filters, query })` vs `useProposals(spaceId, filters, query)`).
   In second case the order is not obvious.
3. Return all properties returned by `useQuery` or `useInfiniteQuery` from composable not to limit its capabilities.

#### Topics to cover in the future:

1. Creating helpers to create queryKeys.
2. Invalidating data.
3. Optimistic updates.
