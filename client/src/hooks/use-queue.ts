import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type QueueState, type Ticket } from "@shared/routes";

// GET /api/queue/state - Polled hook
export function useQueueState(pollInterval = 0) {
  return useQuery({
    queryKey: [api.queue.state.path],
    queryFn: async () => {
      const res = await fetch(api.queue.state.path);
      if (!res.ok) throw new Error("Failed to fetch queue state");
      return api.queue.state.responses[200].parse(await res.json());
    },
    refetchInterval: pollInterval,
  });
}

// POST /api/queue/next
export function useQueueNext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.queue.next.path, { 
        method: api.queue.next.method,
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to advance queue");
      return api.queue.next.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.queue.state.path] });
    },
  });
}

// POST /api/queue/prev
export function useQueuePrev() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.queue.prev.path, { 
        method: api.queue.prev.method,
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to reverse queue");
      return api.queue.prev.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.queue.state.path] });
    },
  });
}

// POST /api/queue/reset
export function useQueueReset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (startFrom: number = 0) => {
      const res = await fetch(api.queue.reset.path, {
        method: api.queue.reset.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startFrom }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reset queue");
      return api.queue.reset.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.queue.state.path] });
    },
  });
}

// POST /api/queue/set
export function useQueueSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (number: number) => {
      const res = await fetch(api.queue.set.path, {
        method: api.queue.set.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to set queue number");
      return api.queue.set.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.queue.state.path] });
    },
  });
}

// POST /api/tickets - Create a ticket
export function useCreateTicket() {
  return useMutation({
    mutationFn: async (serviceId: number) => {
      const res = await fetch(api.queue.createTicket.path, {
        method: api.queue.createTicket.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create ticket");
      }
      return api.queue.createTicket.responses[201].parse(await res.json());
    },
  });
}
