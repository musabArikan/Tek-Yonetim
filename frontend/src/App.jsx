import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "./components/layout/Header";
import SummaryCards from "./components/dashboard/SummaryCards";
import StockPage from "./pages/StockPage";
import StockManagementPage from "./pages/StockManagementPage";
import InventoryPage from "./pages/InventoryPage";
import UserManagementPage from "./pages/UserManagementPage";
import TransferShipmentPage from "./pages/TransferShipmentPage";
import CustomerFinancePage from "./pages/CustomerFinancePage";
import ZRaporuPage from "./pages/ZRaporuPage";
import CustomerList from "./components/customers/CustomerList";
import CustomerDetails from "./components/customers/CustomerDetails";
import PendingInventoryCard from "./components/customers/PendingInventoryCard";
import TransactionTable from "./components/customers/TransactionTable";
import NewCustomerSaleModal from "./components/modals/NewCustomerSaleModal";
import ExistingCustomerSaleModal from "./components/modals/ExistingCustomerSaleModal";
import CollectionModal from "./components/modals/CollectionModal";
import ReAuthModal, { isReAuthGranted } from "./components/modals/ReAuthModal";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
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
import { sanitizeAmountForPayload } from "./utils/money";
import {
  clearAuthSession,
  getAuthSession,
  getAuthToken,
  setAuthSession,
} from "./utils/authStorage";
import {
  hasPermission,
  isPageLocked,
  normalizePageLocks,
  normalizePermissions,
} from "./utils/rbac";

const defaultDefterSuggestions = [
  "Ana Defter",
  "Mağaza Defteri",
  "Toptan Defter",
  "Online Satış Defteri",
];

const getPageFromPath = (pathname) => {
  if (pathname === "/stok") return "stok";
  if (pathname === "/envanter") return "envanter";
  if (pathname === "/personeller") return "personeller";
  if (pathname === "/urun-stok") return "urun-stok";
  if (pathname === "/transferler") return "transferler";
  if (pathname === "/musteri-finans") return "musteri-finans";
  if (pathname === "/raporlar") return "raporlar";
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/musteriler") return "musteriler";
  return "";
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
  const [financeTargetId, setFinanceTargetId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(getAuthToken() && getAuthSession());
  });
  const [authSession, setLocalAuthSession] = useState(() => getAuthSession());
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
  // Re-Auth modal state
  const [reAuthPage, setReAuthPage] = useState(null); // hangi sayfa re-auth istedi
  const [pendingPage, setPendingPage] = useState(null); // onaylanınca gidilecek page
  const submitGuardRef = useRef(false);
  const userRole = authSession?.role || "";
  const currentUserId = authSession?.userId || "";
  const isAdmin = userRole === "admin";
  const isAdminOrManager = isAdmin || userRole === "yonetici";
  const permissions = useMemo(
    () => normalizePermissions(authSession?.permissions),
    [authSession],
  );
  const pageLocks = useMemo(
    () => normalizePageLocks(authSession?.pageLocks),
    [authSession],
  );
  const availablePages = useMemo(
    () =>
      ["dashboard", "musteriler", "stok", "envanter", "personeller", "urun-stok", "transferler", "musteri-finans", "raporlar"].filter(
        (pageId) =>
          pageId === "musteriler" ||
          (pageId === "dashboard" && isAdmin) ||
          (pageId === "personeller" && isAdmin) ||
          (pageId === "raporlar" && isAdmin) ||
          (!isPageLocked(pageLocks, pageId) &&
            pageId !== "personeller" &&
            pageId !== "raporlar" &&
            pageId !== "dashboard"),
      ),
    [isAdmin, pageLocks],
  );
  const canDeleteCustomer = hasPermission(permissions, "musteriSilebilir");
  const canCollectPayment = hasPermission(permissions, "tahsilatAlabilir");
  const canCreateSale = hasPermission(permissions, "satisYapabilir");
  const canManageStock = hasPermission(permissions, "stokDuzenleyebilir");
  const canManageInventory = hasPermission(
    permissions,
    "envanterDuzenleyebilir",
  );

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

  const syncRoute = useCallback(
    (pageId, pathname, replace = false) => {
      setActivePage(pageId);
      if (location.pathname !== pathname) {
        navigate(pathname, { replace });
      }
    },
    [location.pathname, navigate],
  );

  const redirectUnauthorizedPage = useCallback(
    (pageId) => {
      toast.error("Yetkisiz Erişim: Bu sayfayı görüntüleme yetkiniz yok.", {
        toastId: `page-lock-${pageId}`,
      });
      syncRoute("musteriler", "/musteriler", true);
    },
    [syncRoute],
  );

  const refreshStockData = useCallback(async () => {
    const stocksResponse = await getStocks();
    const normalizedStocks = stocksResponse.map(normalizeStock);
    setStock(normalizedStocks);
    return normalizedStocks;
  }, []);

  const refreshAuthSession = useCallback((nextSessionPartial) => {
    const currentSession = getAuthSession();
    if (!currentSession) {
      return;
    }

    const nextSession = {
      ...currentSession,
      ...nextSessionPartial,
    };

    setAuthSession(nextSession);
    setLocalAuthSession(nextSession);
    setIsAuthenticated(Boolean(getAuthToken() && nextSession));
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

  // Auth redirect effect — sadece giriş/çıkış durumunu izler
  useEffect(() => {
    if (!isAuthenticated) {
      setActivePage("home");
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
    }
  }, [isAuthenticated, location.pathname, navigate]);

  // Veri yükleme effect — SADECE isAuthenticated değişiminde çalışır
  // location.pathname bağımlılığı kasıtlı olarak kaldırıldı: her sayfa geçişinde
  // yeniden veri çekilmesini ve token state'inin sıfırlanmasını önler.
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      setIsLoading(true);
      setIsStockLoading(true);
      setSubmitError("");
      setStockError("");

      try {
        const [customersResponse, transactionsResponse, stocksResponse] =
          await Promise.all([getCustomers(), getTransactions(), getStocks()]);

        const normalizedCustomers = customersResponse.map(normalizeCustomer);
        const normalizedTransactions = transactionsResponse.map(normalizeTransaction);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!authSession) {
      clearAuthSession();
      setIsAuthenticated(false);
      return;
    }

    const hasPagePasswords = authSession?.hasPagePasswords || {};
    const checkPassword = (pageId, reAuthKey) => {
      if (hasPagePasswords[reAuthKey] && !isReAuthGranted(reAuthKey)) {
        setPendingPage(pageId);
        setReAuthPage(reAuthKey);
        return false;
      }
      return true;
    };

    if (location.pathname === "/") {
      if (isAdmin) {
        syncRoute("dashboard", "/dashboard", true);
      } else {
        syncRoute("musteriler", "/musteriler", true);
      }
      return;
    }

    if (location.pathname === "/stok") {
      if (isPageLocked(pageLocks, "stok")) {
        redirectUnauthorizedPage("stok");
        return;
      }
      if (!checkPassword("stok", "stok")) return;
      setActivePage("stok");
      return;
    }

    if (location.pathname === "/dashboard") {
      if (!isAdmin) {
        redirectUnauthorizedPage("dashboard");
        return;
      }
      setActivePage("dashboard");
      return;
    }

    if (location.pathname === "/musteriler") {
      setActivePage("musteriler");
      return;
    }

    if (location.pathname === "/personeller") {
      if (!isAdmin) {
        redirectUnauthorizedPage("personeller");
        return;
      }
      setActivePage("personeller");
      return;
    }

    if (location.pathname === "/envanter") {
      if (isPageLocked(pageLocks, "envanter")) {
        redirectUnauthorizedPage("envanter");
        return;
      }
      if (!checkPassword("envanter", "envanter")) return;
      setActivePage("envanter");
      return;
    }

    if (location.pathname === "/urun-stok") {
      if (isPageLocked(pageLocks, "urun-stok")) {
        redirectUnauthorizedPage("urun-stok");
        return;
      }
      setActivePage("urun-stok");
      return;
    }

    if (location.pathname === "/transferler") {
      if (isPageLocked(pageLocks, "transferler")) {
        redirectUnauthorizedPage("transferler");
        return;
      }
      if (!checkPassword("transferler", "transferler")) return;
      setActivePage("transferler");
      return;
    }

    if (location.pathname === "/musteri-finans") {
      if (isPageLocked(pageLocks, "musteri-finans")) {
        redirectUnauthorizedPage("musteri-finans");
        return;
      }
      if (!checkPassword("musteri-finans", "finans")) return;
      setActivePage("musteri-finans");
      return;
    }

    if (location.pathname === "/raporlar") {
      if (!isAdmin) {
        redirectUnauthorizedPage("raporlar");
        return;
      }
      if (!checkPassword("raporlar", "raporlar")) return;
      setActivePage("raporlar");
      return;
    }

    // Bilinmeyen rotalar için ana sayfaya yönlendir
    const defaultPath = isAdmin ? "/dashboard" : "/musteriler";
    const defaultPage = isAdmin ? "dashboard" : "musteriler";
    syncRoute(defaultPage, defaultPath, true);
  }, [
    authSession,
    isAdmin,
    pageLocks,
    redirectUnauthorizedPage,
    isAuthenticated,
    location.pathname,
    syncRoute,
  ]);

  const handleLogin = useCallback((response) => {
    setAuthSession(response);
    setLocalAuthSession(response);
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearAuthSession();
    setLocalAuthSession(null);
    setIsAuthenticated(false);
    setCustomers([]);
    setTransactions([]);
    setStock([]);
    setSelectedCustomerId(null);
  }, []);

  const handlePageChange = useCallback(
    (pageId, isFromNav = true) => {
      if (pageId !== "home" && isPageLocked(pageLocks, pageId)) {
        redirectUnauthorizedPage(pageId);
        return;
      }

      if (isFromNav && pageId === "musteri-finans") {
        setFinanceTargetId(null);
      }

      // Check if the page is password-protected for this user
      const hasPagePasswords = authSession?.hasPagePasswords || {};
      const reAuthKey = pageId === "musteri-finans" ? "finans" : pageId;
      if (hasPagePasswords[reAuthKey]) {
        navigateWithReAuth(pageId, reAuthKey);
        return;
      }

      const pagePathMap = {
        dashboard: "/dashboard",
        musteriler: "/musteriler",
        stok: "/stok",
        envanter: "/envanter",
        personeller: "/personeller",
        "urun-stok": "/urun-stok",
        transferler: "/transferler",
        "musteri-finans": "/musteri-finans",
        raporlar: "/raporlar",
      };

      const defaultPath = isAdmin ? "/dashboard" : "/musteriler";
      syncRoute(pageId, pagePathMap[pageId] ?? defaultPath);
    },
    [pageLocks, redirectUnauthorizedPage, syncRoute, authSession, isAdmin],
  );

  // Re-Auth gerektiren sayfalara geçiş
  const navigateWithReAuth = useCallback(
    (pageId, reAuthKey) => {
      if (isReAuthGranted(reAuthKey)) {
        const pagePathMap = {
          dashboard: "/dashboard",
          musteriler: "/musteriler",
          stok: "/stok",
          envanter: "/envanter",
          personeller: "/personeller",
          "urun-stok": "/urun-stok",
          transferler: "/transferler",
          "musteri-finans": "/musteri-finans",
          raporlar: "/raporlar",
        };
        const defaultPath = isAdmin ? "/dashboard" : "/musteriler";
        syncRoute(pageId, pagePathMap[pageId] ?? defaultPath);
        return;
      }
      setPendingPage(pageId);
      setReAuthPage(reAuthKey);
    },
    [syncRoute, isAdmin],
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
        setSubmitError(error?.response?.data?.message || "Müşteri silinemedi.");
      } finally {
        setIsDeletingCustomer(false);
      }
    },
    [refreshDashboardData, selectedCustomerId],
  );

  const handleSelectCustomer = useCallback(
    (customerId, nextPage = "musteri-finans") => {
      setSelectedCustomerId(customerId);
      setSearchQuery("");

      if (nextPage === "musteriler") {
        syncRoute("musteriler", "/musteriler");
        return;
      }

      if (nextPage === "musteri-finans") {
        setFinanceTargetId(customerId);
      }

      handlePageChange(nextPage, false);
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

  const handleAddStock = useCallback(
    (formData) => {
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
    },
    [refreshStockData],
  );

  const handleUpdateStockQuantity = useCallback(
    (stockId, adet) => {
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
    },
    [refreshStockData],
  );

  const handleDeleteCustomer = useCallback(
    (customer) => {
      if (!customer) return;
      const isConfirmed = window.confirm(
        `${customer.ad} ${customer.soyad} müşterisini silmek istiyor musunuz?`,
      );

      if (!isConfirmed) {
        return;
      }

      void performDeleteCustomer(customer);
    },
    [performDeleteCustomer],
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
          availablePages={availablePages}
          canCreateSale={canCreateSale}
          role={userRole}
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
          {activePage === "dashboard" ? (
            <DashboardPage onNewCustomerSale={() => setShowNewCustomerModal(true)} />
          ) : activePage === "musteriler" ? (
            <CustomersPage
              customers={filteredCustomers}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectCustomer={(id) => handleSelectCustomer(id, "musteri-finans")}
              onNewCustomerSale={() => setShowNewCustomerModal(true)}
            />
          ) : activePage === "stok" ? (
            <StockPage
              stock={stock}
              onAddStock={handleAddStock}
              onUpdateStockQuantity={handleUpdateStockQuantity}
              isLoading={isStockLoading}
              errorMessage={stockError}
              isSubmitting={isStockSubmitting}
              canManageStock={canManageStock}
            />
          ) : activePage === "envanter" ? (
            <InventoryPage canManageInventory={canManageInventory} />
          ) : activePage === "urun-stok" ? (
            <StockManagementPage canManageStock={canManageStock} />
          ) : activePage === "personeller" ? (
            <UserManagementPage
              currentUserId={currentUserId}
              onSessionRefresh={refreshAuthSession}
            />
          ) : activePage === "transferler" ? (
            <TransferShipmentPage />
          ) : activePage === "musteri-finans" ? (
            <CustomerFinancePage initialCustomerId={financeTargetId} />
          ) : activePage === "raporlar" ? (
            <ZRaporuPage />
          ) : null}
        </main>

        {canCreateSale ? (
          <NewCustomerSaleModal
            isOpen={showNewCustomerModal}
            onClose={() => setShowNewCustomerModal(false)}
            onSubmit={handleNewCustomerSale}
            stockOptions={stockOptions}
            defterSuggestions={defterSuggestions}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        ) : null}

        {canCreateSale ? (
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
        ) : null}

        {canCollectPayment ? (
          <CollectionModal
            isOpen={showCollectionModal}
            onClose={() => setShowCollectionModal(false)}
            onSubmit={handleCollection}
            customer={selectedCustomer}
            defterSuggestions={defterSuggestions}
            submitError={submitError}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />

      {/* Re-Auth Modal */}
      {reAuthPage && (
        <ReAuthModal
          page={reAuthPage}
          onGranted={() => {
            setReAuthPage(null);
            if (pendingPage) {
              handlePageChange(pendingPage);
              setPendingPage(null);
            }
          }}
          onCancel={() => {
            setReAuthPage(null);
            setPendingPage(null);
          }}
        />
      )}
    </>
  );
}

export default App;
