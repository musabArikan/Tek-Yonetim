import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "./components/layout/Header";
import SummaryCards from "./components/dashboard/SummaryCards";
import StockPage from "./pages/StockPage";
import InventoryPage from "./pages/InventoryPage";
import DebtorsPage from "./pages/DebtorsPage";
import CustomerList from "./components/customers/CustomerList";
import CustomerDetails from "./components/customers/CustomerDetails";
import PendingInventoryCard from "./components/customers/PendingInventoryCard";
import TransactionTable from "./components/customers/TransactionTable";
import NewCustomerSaleModal from "./components/modals/NewCustomerSaleModal";
import ExistingCustomerSaleModal from "./components/modals/ExistingCustomerSaleModal";
import CollectionModal from "./components/modals/CollectionModal";
import PasswordModal from "./components/modals/PasswordModal";
import LoginPage from "./pages/LoginPage";
import {
  getTotalReceivables,
  getCustomerTransactions,
} from "./utils/transactions";
import { getCustomerInventoryItems } from "./utils/inventory";
import {
  getCustomers,
  createCustomer,
  deleteCustomer,
} from "./services/customerService";
import {
  getTransactions,
  createTransaction,
} from "./services/transactionService";
import {
  addOrUpdateStock,
  getStocks,
  updateStockQuantity,
} from "./services/stockService";
import { ADMIN_ACTION_PASSWORD } from "./utils/security";
import { sanitizeAmountForPayload } from "./utils/money";
import {
  clearAuthSession,
  getAuthToken,
  setAuthSession,
} from "./utils/authStorage";

const defaultDefterSuggestions = [
  "Ana Defter",
  "Mağaza Defteri",
  "Toptan Defter",
  "Online Satış Defteri",
];

const defaultPasswordModalState = {
  isOpen: false,
  action: null,
  customer: null,
};

const getPageFromPath = (pathname) => {
  if (pathname === "/stok") return "stok";
  if (pathname === "/envanter") return "envanter";
  if (pathname === "/borclular") return "borclular";
  return "home";
};

const normalizeCustomer = (customer) => {
  const id = customer._id || customer.id;
  return {
    ...customer,
    id,
    ad: customer.ad || "",
    soyad: customer.soyad || "",
    tc: customer.tcKimlik || customer.tc || "",
    telefon: customer.telefon || "",
    adres: customer.adres || "",
    musteriNo: Number(customer.musteriNo || 0),
    toplamKalanBakiye: Number(customer.toplamKalanBakiye || 0),
    kayitTarihi: customer.kayitTarihi || customer.createdAt || "",
  };
};

const normalizeTransaction = (transaction) => {
  const customerId =
    transaction.musteriId && typeof transaction.musteriId === "object"
      ? transaction.musteriId._id || transaction.musteriId.id
      : transaction.musteriId;

  const urunler = Array.isArray(transaction.urunler) ? transaction.urunler : [];
  const normalizedType = transaction.islemTuru || transaction.type || "Satış";
  const normalizedTotal = Number(transaction.toplamTutar || 0);
  const normalizedPesinat = Number(transaction.pesinat || 0);
  const normalizedCollectionAmount = Number(
    transaction.odenenTutar ??
      transaction.tutar ??
      transaction.toplamTutar ??
      transaction.pesinat ??
      0,
  );

  return {
    id: transaction._id || transaction.id,
    musteriId: customerId,
    tarih: transaction.tarih || transaction.createdAt,
    urunBilgisi: urunler.length
      ? urunler.map((item) => `${item.urunKodu} (x${item.adet})`).join(", ")
      : transaction.urunBilgisi || "İşlem",
    urunler,
    islemTuru: normalizedType,
    tutar:
      normalizedType === "Tahsilat"
        ? normalizedCollectionAmount
        : normalizedTotal,
    toplamTutar:
      normalizedType === "Tahsilat"
        ? normalizedCollectionAmount
        : normalizedTotal,
    pesinat: normalizedPesinat,
    kalanHesap: Number(transaction.kalanHesap ?? 0),
    odenenTutar: normalizedCollectionAmount,
    odemeYontemi: transaction.odemeYontemi || "Veresiye",
    kayitDefteri: transaction.kayitDefteri || "",
    aciklama: transaction.aciklama || "",
  };
};

const normalizeStock = (stock) => ({
  id: stock._id || stock.id,
  urunKodu: stock.urunKodu || "",
  marka: stock.marka || "",
  adet: Number(stock.adet || 0),
  envanterdekiAdet: Number(stock.envanterdekiAdet || 0),
});

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stock, setStock] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(getAuthToken());
  });
  const [activePage, setActivePage] = useState(() =>
    getPageFromPath(location.pathname),
  );
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showExistingSaleModal, setShowExistingSaleModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStockLoading, setIsStockLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStockSubmitting, setIsStockSubmitting] = useState(false);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [stockError, setStockError] = useState("");
  const [passwordModalState, setPasswordModalState] = useState(
    defaultPasswordModalState,
  );
  const submitGuardRef = useRef(false);

  const defterSuggestions = useMemo(() => {
    const fromTx = transactions.map((t) => t.kayitDefteri).filter(Boolean);
    return [...new Set([...defaultDefterSuggestions, ...fromTx])];
  }, [transactions]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.ad.toLowerCase().includes(q) ||
        c.soyad.toLowerCase().includes(q) ||
        `${c.ad} ${c.soyad}`.toLowerCase().includes(q) ||
        c.tc.includes(q) ||
        c.telefon.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    );
  }, [customers, searchQuery]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const customerTransactions = useMemo(
    () =>
      selectedCustomerId
        ? getCustomerTransactions(transactions, selectedCustomerId)
        : [],
    [transactions, selectedCustomerId],
  );

  const customerInventoryItems = useMemo(
    () =>
      selectedCustomerId
        ? getCustomerInventoryItems(transactions, customers, selectedCustomerId)
        : [],
    [transactions, customers, selectedCustomerId],
  );

  const totalReceivables = useMemo(
    () => getTotalReceivables(customers),
    [customers],
  );

  const stockOptions = useMemo(
    () =>
      [...stock]
        .sort((a, b) => a.urunKodu.localeCompare(b.urunKodu, "tr"))
        .map((item) => ({
          value: item.urunKodu,
          label: `${item.urunKodu} - (Toplam Fiziksel Stok: ${item.adet})`,
          stockMetaText: `${item.marka || "Marka yok"} • Toplam Fiziksel Stok: ${
            item.adet
          } • ${item.envanterdekiAdet} Envanter`,
        })),
    [stock],
  );

  const syncRoute = useCallback((pageId, pathname, replace = false) => {
    setActivePage(pageId);
    if (location.pathname !== pathname) {
      navigate(pathname, { replace });
    }
  }, [location.pathname, navigate]);

  const resetPasswordModal = useCallback(() => {
    setPasswordModalState(defaultPasswordModalState);
  }, []);

  const openPasswordModal = useCallback((action, customer = null) => {
    // Modal zaten açıksa tekrar açma
    if (passwordModalState.isOpen && passwordModalState.action === action) {
      return;
    }

    setSubmitError("");
    setPasswordModalState({
      isOpen: true,
      action,
      customer,
    });
  }, [passwordModalState.isOpen, passwordModalState.action]);

  const closePasswordModal = useCallback(() => {
    resetPasswordModal();
  }, [resetPasswordModal]);

  const refreshStockData = useCallback(async () => {
    const stocksResponse = await getStocks();
    const normalizedStocks = stocksResponse.map(normalizeStock);
    setStock(normalizedStocks);
    return normalizedStocks;
  }, []);

  const refreshDashboardData = useCallback(async () => {
    try {
      const [customersResponse, transactionsResponse, stocksResponse] =
        await Promise.all([getCustomers(), getTransactions(), getStocks()]);
      const normalizedCustomers = customersResponse.map(normalizeCustomer);
      const normalizedTransactions =
        transactionsResponse.map(normalizeTransaction);
      const normalizedStocks = stocksResponse.map(normalizeStock);

      setCustomers(normalizedCustomers);
      setTransactions(normalizedTransactions);
      setStock(normalizedStocks);

      if (!selectedCustomerId && normalizedCustomers.length > 0) {
        setSelectedCustomerId(normalizedCustomers[0].id);
      }

      return {
        customers: normalizedCustomers,
        transactions: normalizedTransactions,
        stock: normalizedStocks,
      };
    } catch (error) {
      console.error("Hata Detayı:", error);
      setSubmitError("Veriler yenilenirken bir hata oluştu.");
      throw error;
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setActivePage("home");
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setSubmitError("");

      try {
        // Stok verileri her zaman yüklenir (global state'e dolması için)
        const requests = [getCustomers(), getTransactions(), getStocks()];
        setIsStockLoading(true);
        setStockError("");

        const responses = await Promise.all(requests);
        const [customersResponse, transactionsResponse, stocksResponse] = responses;

        const normalizedCustomers = customersResponse.map(normalizeCustomer);
        const normalizedTransactions =
          transactionsResponse.map(normalizeTransaction);
        const normalizedStocks = stocksResponse.map(normalizeStock);

        setCustomers(normalizedCustomers);
        setTransactions(normalizedTransactions);
        setStock(normalizedStocks);

        setSelectedCustomerId(
          (currentCustomerId) =>
            currentCustomerId ?? normalizedCustomers[0]?.id ?? null,
        );
      } catch (error) {
        console.error("Hata Detayı:", error);
        setSubmitError("Veriler yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
        setIsStockLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, location.pathname, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (location.pathname === "/") {
      syncRoute("home", "/dashboard", true);
      return;
    }

    if (location.pathname === "/stok") {
      setActivePage("stok");
      return;
    }

    if (location.pathname === "/dashboard") {
      setActivePage("home");
      return;
    }

    if (location.pathname === "/borclular") {
      setActivePage("borclular");
      return;
    }

    if (location.pathname === "/envanter") {
      setActivePage("envanter");
      return;
    }

    // Bilinmeyen rotalar için ana sayfaya yönlendir
    syncRoute("home", "/dashboard", true);
  }, [
    isAuthenticated,
    location.pathname,
    syncRoute,
  ]);

  const handleLogin = useCallback(
    (response) => {
      setAuthSession(response);
      setIsAuthenticated(true);
    },
    [],
  );

  const handleLogout = useCallback(() => {
    clearAuthSession();
    setIsAuthenticated(false);
    setCustomers([]);
    setTransactions([]);
    setStock([]);
    setSelectedCustomerId(null);
  }, []);

  const handlePageChange = useCallback(
    (pageId) => {
      const pagePathMap = {
        home: "/dashboard",
        stok: "/stok",
        envanter: "/envanter",
        borclular: "/borclular",
      };

      syncRoute(pageId, pagePathMap[pageId] ?? "/dashboard");
    },
    [syncRoute],
  );

  const performDeleteCustomer = useCallback(
    async (customer) => {
      if (!customer) return;

      setIsDeletingCustomer(true);
      setSubmitError("");

      try {
        await deleteCustomer(customer.id);
        const refreshedData = await refreshDashboardData();

        if (selectedCustomerId === customer.id) {
          setSelectedCustomerId(refreshedData.customers[0]?.id ?? null);
        }

        toast.success("Müşteri ve tüm kayıtları başarıyla silindi.");
      } catch (error) {
        console.error("Hata Detayı:", error);
        setSubmitError(
          error?.response?.data?.message || "Müşteri silinemedi.",
        );
      } finally {
        setIsDeletingCustomer(false);
      }
    },
    [refreshDashboardData, selectedCustomerId],
  );

  const handlePasswordModalSubmit = useCallback(
    (password) => {
      if (password !== ADMIN_ACTION_PASSWORD) {
        return "Şifre hatalı.";
      }

      if (
        passwordModalState.action === "delete" &&
        passwordModalState.customer
      ) {
        const customerToDelete = passwordModalState.customer;
        resetPasswordModal();
        void performDeleteCustomer(customerToDelete);
      }

      return null;
    },
    [
      passwordModalState,
      performDeleteCustomer,
      resetPasswordModal,
    ],
  );

  const handleSelectCustomer = useCallback(
    (customerId, nextPage = "home") => {
      setSelectedCustomerId(customerId);
      setSearchQuery("");

      if (nextPage === "home") {
        syncRoute("home", "/dashboard");
        return;
      }

      handlePageChange(nextPage);
    },
    [handlePageChange, syncRoute],
  );

  const handleNewCustomerSale = useCallback(
    async (formData) => {
      if (submitGuardRef.current) {
        return;
      }

      submitGuardRef.current = true;
      setIsSubmitting(true);
      setSubmitError("");

      try {
        const payload = {
          ad: formData.ad.trim(),
          soyad: formData.soyad.trim(),
          tcKimlik: formData.tc.trim(),
          telefon: formData.telefon.trim(),
          adres: formData.adres.trim(),
          satis: {
            tarih: formData.tarih,
            urunler: formData.urunler,
            toplamTutar: sanitizeAmountForPayload(formData.toplamTutar),
            pesinat: sanitizeAmountForPayload(formData.pesinat, 0),
            kalanHesap: sanitizeAmountForPayload(formData.kalanHesap, 0),
            odemeYontemi: formData.odemeYontemi,
            kayitDefteri: formData.kayitDefteri.trim(),
          },
        };

        const response = await createCustomer(payload);
        const createdCustomer = response?.customer || response;
        const createdCustomerId = createdCustomer._id || createdCustomer.id;

        if (!createdCustomerId) {
          throw new Error("Oluşturulan müşteri bilgisi alınamadı.");
        }

        await refreshDashboardData();
        setSelectedCustomerId(createdCustomerId);
        setSearchQuery("");
        setShowNewCustomerModal(false);
        toast.success("Müşteri ve satış tek seferde kaydedildi.");
      } catch (error) {
        console.error("Hata Detayı:", error);
        setSubmitError(
          error?.response?.data?.message ||
            "Müşteri veya satış kaydı oluşturulamadı.",
        );
      } finally {
        submitGuardRef.current = false;
        setIsSubmitting(false);
      }
    },
    [refreshDashboardData],
  );

  const handleExistingCustomerSale = useCallback(
    async (formData) => {
      if (submitGuardRef.current) {
        return;
      }

      submitGuardRef.current = true;
      setIsSubmitting(true);
      setSubmitError("");

      try {
        const transactionPayload = {
          musteriId: formData.musteriId,
          tarih: formData.tarih,
          urunler: formData.urunler,
          toplamTutar: sanitizeAmountForPayload(formData.toplamTutar),
          pesinat: sanitizeAmountForPayload(formData.pesinat, 0),
          kalanHesap: sanitizeAmountForPayload(formData.kalanHesap, 0),
          odemeYontemi: formData.odemeYontemi,
          kayitDefteri: formData.kayitDefteri.trim(),
        };

        await createTransaction(transactionPayload);
        await refreshDashboardData();
        setSelectedCustomerId(formData.musteriId);
        setShowExistingSaleModal(false);
        toast.success("İşlem başarıyla kaydedildi.");
      } catch (error) {
        console.error("Hata Detayı:", error);
        setSubmitError(
          error?.response?.data?.message || "Satış kaydı oluşturulamadı.",
        );
      } finally {
        submitGuardRef.current = false;
        setIsSubmitting(false);
      }
    },
    [refreshDashboardData],
  );

  const handleCollection = useCallback(
    async (formData) => {
      if (submitGuardRef.current) {
        return;
      }

      submitGuardRef.current = true;
      setIsSubmitting(true);
      setSubmitError("");

      try {
        const payload = {
          musteriId: formData.musteriId,
          tarih: formData.tarih,
          islemTuru: "Tahsilat",
          odenenTutar: sanitizeAmountForPayload(formData.odenenTutar, 0),
          odemeYontemi: formData.odemeYontemi,
          kayitDefteri: formData.kayitDefteri?.trim() || "",
          aciklama: formData.aciklama?.trim() || "",
        };

        await createTransaction(payload);
        await refreshDashboardData();
        setSelectedCustomerId(formData.musteriId);
        setShowCollectionModal(false);
        toast.success("İşlem başarıyla kaydedildi.");
      } catch (error) {
        console.error("Hata Detayı:", error);
        setSubmitError(
          error?.response?.data?.message || "Tahsilat kaydı oluşturulamadı.",
        );
        throw error;
      } finally {
        submitGuardRef.current = false;
        setIsSubmitting(false);
      }
    },
    [refreshDashboardData],
  );

  const handleAddStock = useCallback((formData) => {
    setIsStockSubmitting(true);
    setStockError("");

    return addOrUpdateStock(formData)
      .then(() => refreshStockData())
      .catch((error) => {
        console.error("Hata Detayı:", error);
        setStockError(error?.response?.data?.message || "Stok eklenemedi.");
        throw error;
      })
      .finally(() => {
        setIsStockSubmitting(false);
      });
  }, [refreshStockData]);

  const handleUpdateStockQuantity = useCallback((stockId, adet) => {
    setIsStockSubmitting(true);
    setStockError("");

    return updateStockQuantity(stockId, { adet })
      .then(() => refreshStockData())
      .catch((error) => {
        console.error("Hata Detayı:", error);
        setStockError(
          error?.response?.data?.message || "Stok miktarı güncellenemedi.",
        );
        throw error;
      })
      .finally(() => {
        setIsStockSubmitting(false);
      });
  }, [refreshStockData]);

  const handleDeleteCustomer = useCallback(
    (customer) => {
      if (!customer) return;
      openPasswordModal("delete", customer);
    },
    [openPasswordModal],
  );

  const handleDeliverInventory = useCallback(
    (transactionId, productIndex, deliveredQty) => {
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== transactionId || !tx.urunler) return tx;

          return {
            ...tx,
            urunler: tx.urunler.map((urun, index) => {
              if (index !== productIndex) return urun;

              const currentAdet = Number(urun.adet) || 1;
              const normalizedDeliveredQty = Math.min(
                Math.max(Number(deliveredQty) || 0, 0),
                currentAdet,
              );

              if (normalizedDeliveredQty >= currentAdet) {
                return { ...urun, envanterdeMi: false };
              }

              return {
                ...urun,
                adet: currentAdet - normalizedDeliveredQty,
                envanterdeMi: true,
              };
            }),
          };
        }),
      );
    },
    [],
  );

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <ToastContainer position="top-right" autoClose={3000} />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <Header
          activePage={activePage}
          onPageChange={handlePageChange}
          onExistingSale={() => setShowExistingSaleModal(true)}
          onNewCustomerSale={() => setShowNewCustomerModal(true)}
          onLogout={handleLogout}
        />

        <main className="pt-20 px-4 md:px-8 pb-8 flex flex-col gap-6 min-h-screen">
          {submitError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          {activePage === "home" ? (
            <>
              {isLoading ? (
                <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-6 text-sm text-on-surface-variant">
                  Yükleniyor...
                </div>
              ) : null}

              <SummaryCards
                customerCount={customers.length}
                transactionCount={transactions.length}
                totalReceivables={totalReceivables}
              />

              <div className="flex flex-col lg:flex-row gap-6 grow">
                <CustomerList
                  customers={filteredCustomers}
                  selectedId={selectedCustomerId}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelect={handleSelectCustomer}
                />

                <div className="w-full lg:w-2/3 flex flex-col gap-4 min-h-150">
                  <CustomerDetails
                    customer={selectedCustomer}
                    onAddCollection={() => setShowCollectionModal(true)}
                    onDeleteCustomer={handleDeleteCustomer}
                    isDeletingCustomer={isDeletingCustomer}
                  />
                  {selectedCustomer && (
                    <PendingInventoryCard items={customerInventoryItems} />
                  )}
                  <TransactionTable transactions={customerTransactions} />
                </div>
              </div>
            </>
          ) : activePage === "stok" ? (
            <StockPage
              stock={stock}
              onAddStock={handleAddStock}
              onUpdateStockQuantity={handleUpdateStockQuantity}
              isLoading={isStockLoading}
              errorMessage={stockError}
              isSubmitting={isStockSubmitting}
            />
          ) : activePage === "envanter" ? (
            <InventoryPage
              transactions={transactions}
              customers={customers}
              onDeliver={handleDeliverInventory}
            />
          ) : activePage === "borclular" ? (
            <DebtorsPage
              customers={customers}
              onSelectCustomer={(customerId) =>
                handleSelectCustomer(customerId, "home")
              }
            />
          ) : null}
        </main>

        <NewCustomerSaleModal
          isOpen={showNewCustomerModal}
          onClose={() => setShowNewCustomerModal(false)}
          onSubmit={handleNewCustomerSale}
          stockOptions={stockOptions}
          defterSuggestions={defterSuggestions}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />

        <ExistingCustomerSaleModal
          isOpen={showExistingSaleModal}
          onClose={() => setShowExistingSaleModal(false)}
          onSubmit={handleExistingCustomerSale}
          customers={customers}
          stockOptions={stockOptions}
          defterSuggestions={defterSuggestions}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />

        <CollectionModal
          isOpen={showCollectionModal}
          onClose={() => setShowCollectionModal(false)}
          onSubmit={handleCollection}
          customer={selectedCustomer}
          defterSuggestions={defterSuggestions}
          submitError={submitError}
          isSubmitting={isSubmitting}
        />

        <PasswordModal
          isOpen={passwordModalState.isOpen}
          title={
            passwordModalState.action === "delete"
              ? "Müşteri Silme Onayı"
              : "Yetkili Onayı Gerekli"
          }
          description={
            passwordModalState.action === "delete"
              ? "Müşteriyi ve tüm ilişkili kayıtları silmek için yetkili şifresini girin."
              : "Bu işlem için yetkili şifrenizi girin."
          }
          onClose={closePasswordModal}
          onSubmit={handlePasswordModalSubmit}
        />
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default App;
