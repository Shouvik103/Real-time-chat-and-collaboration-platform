import { useInfiniteQuery } from "@tanstack/react-query";
import { messageApi } from "@/api/message.api";
export function useMessages(channelId) {
  return useInfiniteQuery({
    queryKey: ["messages", channelId],
    enabled: !!channelId,
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam;
      const res = await messageApi.getMessages(channelId, cursor, 30);
      return res.data.data;
    },
    initialPageParam: void 0,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor ?? void 0 : void 0,
    staleTime: 6e4
  });
}
