import { useInfiniteQuery } from '@tanstack/react-query';
import { messageApi } from '@/api/message.api';
import type { MessagesPage } from '@/types';

export function useMessages(channelId: string | null) {
  return useInfiniteQuery<MessagesPage>({
    queryKey: ['messages', channelId],
    enabled: !!channelId,
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      const res = await messageApi.getMessages(channelId!, cursor, 30);
      return res.data.data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
    staleTime: 60_000,
  });
}
