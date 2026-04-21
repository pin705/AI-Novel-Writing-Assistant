import axios, { AxiosError } from "axios";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/constants";
import { toast } from "@/components/ui/toast";

export interface ApiHttpError extends Error {
  status?: number;
  details?: unknown;
}

declare module "axios" {
  interface AxiosRequestConfig {
    silentErrorStatuses?: number[];
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status;
    const backendError = error.response?.data?.error;
    const backendMessage = error.response?.data?.message;
    const silentErrorStatuses = error.config?.silentErrorStatuses ?? [];
    let title = backendError ?? error.message ?? "Yêu cầu thất bại.";
    let description = backendMessage && backendMessage !== backendError ? backendMessage : undefined;

    if (!status) {
      title = "Không thể kết nối mạng, vui lòng kiểm tra kết nối và thử lại.";
      description = undefined;
    } else if (status >= 500) {
      title = backendError ?? "Lỗi máy chủ, vui lòng thử lại sau.";
      description = backendMessage && backendMessage !== title ? backendMessage : undefined;
    }

    if (!status || !silentErrorStatuses.includes(status)) {
      if (description) {
        toast.error(title, { description });
      } else {
        toast.error(title);
      }
    }

    const message = description ? `${title} ${description}` : title;

    const normalizedError = new Error(
      message,
    ) as ApiHttpError;
    normalizedError.status = status;
    normalizedError.details = error.response?.data;
    return Promise.reject(normalizedError);
  },
);
