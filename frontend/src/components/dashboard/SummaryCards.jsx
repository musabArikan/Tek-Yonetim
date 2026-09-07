import { Users, Receipt, Wallet } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";

export default function SummaryCards({ customerCount, transactionCount, totalReceivables }) {
  const cards = [
    {
      title: "Toplam Müşteri",
      value: customerCount.toLocaleString("tr-TR"),
      icon: Users,
      iconBg: "bg-primary-container text-white",
    },
    {
      title: "Toplam İşlem",
      value: transactionCount.toLocaleString("tr-TR"),
      icon: Receipt,
      iconBg: "bg-surface-variant text-on-surface-variant",
    },
    {
      title: "Toplam Alacak",
      value: formatCurrency(totalReceivables),
      icon: Wallet,
      iconBg: "bg-error-container text-on-error-container",
      valueColor: "text-error",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map(({ title, value, icon: Icon, iconBg, valueColor }) => (
        <div
          key={title}
          className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant">{title}</p>
              <h3
                className={`text-2xl font-semibold mt-1 ${valueColor || "text-on-surface"}`}
                style={{ fontFamily: "var(--font-headline)" }}
              >
                {value}
              </h3>
            </div>
            <div className={`${iconBg} p-2 rounded-full flex items-center justify-center`}>
              <Icon size={20} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
