import { toast } from "react-toastify";

export function handleApiError(error) {
  console.error("Hata Detayı:", error);
  toast.error("Bir hata oluştu, lütfen tekrar deneyin.");
  throw error;
}
