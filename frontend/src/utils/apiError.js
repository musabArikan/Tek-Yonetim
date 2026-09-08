import { toast } from "react-toastify";

export function handleApiError(error) {
  const message =
    error?.response?.data?.message ||
    "Bir hata oluştu, lütfen tekrar deneyin.";
  console.error("Hata Detayı:", error);
  toast.error(message);
  throw error;
}
