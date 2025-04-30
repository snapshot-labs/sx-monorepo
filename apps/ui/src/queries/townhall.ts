import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getRoles, getUserRoles } from '@/helpers/townhall/api';
import { Role } from '@/helpers/townhall/types';

export function useRolesQuery(spaceId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: ['townhall', 'roles', spaceId, 'list'],
    queryFn: () => {
      return getRoles(toValue(spaceId));
    }
  });
}

export function useUserRolesQuery(user: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: ['townhall', 'userRoles', user, 'list'],
    queryFn: () => {
      return getUserRoles(toValue(user));
    },
    enabled: () => !!toValue(user)
  });
}

export function useRoleMutation(user: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendClaimRole, sendRevokeRole } = useTownhall();

  return useMutation({
    mutationFn: ({ role, isRevoking }: { role: Role; isRevoking: boolean }) => {
      return isRevoking
        ? sendRevokeRole(role.space, role.id)
        : sendClaimRole(role.space, role.id);
    },
    onSuccess: async (_, { role, isRevoking }) => {
      queryClient.setQueryData<Role[]>(
        ['townhall', 'userRoles', user, 'list'],
        (old = []) =>
          isRevoking ? old.filter(r => r.id !== role.id) : [...old, role]
      );
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}
