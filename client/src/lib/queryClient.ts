import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let headers: HeadersInit = {};
  let body: any = undefined;
  
  if (data) {
    if (data instanceof FormData) {
      // Para FormData, não definimos Content-Type para permitir que o navegador
      // defina automaticamente com o boundary correto
      body = data;
      console.log('Enviando FormData com arquivos:', 
        Array.from(data.entries()).map(([key, value]) => {
          if (value instanceof File) {
            return `${key}: File(${value.name}, ${value.size} bytes, ${value.type})`;
          }
          return `${key}: ${String(value).substring(0, 50)}${String(value).length > 50 ? '...' : ''}`;
        })
      );
    } else {
      headers = { "Content-Type": "application/json" };
      body = JSON.stringify(data);
      console.log('Enviando JSON:', body);
    }
  }
  
  console.log(`Fazendo requisição ${method} para ${url}`);

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  console.log(`Resposta recebida: ${res.status} ${res.statusText}`);
  
  // Para debugging, logamos uma cópia da resposta
  if (!res.ok) {
    try {
      const resClone = res.clone();
      const text = await resClone.text();
      console.error(`Erro na requisição: ${res.status} - ${text}`);
    } catch (e) {
      console.error('Não foi possível ler corpo da resposta de erro');
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
