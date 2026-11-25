import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { LoginRequest } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useUser();
  return { user, isLoading, error, role: user?.role };
}

export function useUser() {
  return useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(api.auth.me.path, { credentials: "include", signal: controller.signal, cache: "no-store" });
        if (res.status === 401) return null;
        if (!res.ok) throw new Error("Falha ao validar a sessão.");
        return api.auth.me.responses[200].parse(await res.json());
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new Error("O servidor demorou para responder à validação da sessão. Atualize a página para tentar novamente.");
        }
        throw error;
      } finally {
        window.clearTimeout(timeout);
      }
    },
    retry: false,
    staleTime: 30000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      return data;
    },
    onSuccess: (data: any) => {
      console.log("onSuccess data:", data);
      queryClient.setQueryData([api.auth.me.path], data);
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { 
        method: api.auth.logout.method,
        credentials: "include" 
      });
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
    },
  });
}
