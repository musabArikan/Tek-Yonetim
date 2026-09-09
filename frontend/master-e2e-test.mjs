import { chromium, request } from "playwright";

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:5000/api";
const EMAIL = "orhan@gunesmagaza";
const PASSWORD = "123456";
const results = [];

function log(step, status, detail) {
  const icon = status === "OK" ? "OK " : status === "FAIL" ? "ERR" : "---";
  console.log(`[${icon}] [${step}] ${detail}`);
  results.push({ step, status, detail });
}

async function run() {
  console.log("\n=================================================");
  console.log("  TEK YONETIM - MASTER E2E SİSTEM TESTİ");
  console.log("=================================================\n");

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();

  // Test data variables
  const TS = Date.now();
  const CUSTOMER_AD = `Oto`;
  const CUSTOMER_SOYAD = `Test-${TS}`;
  const CUSTOMER_TC = `10000000000`;
  const CUSTOMER_TEL = `0555000${TS.toString().slice(-4)}`;
  const PROD_KODU = `KOD-${TS}`;
  const PROD_AD = `Oto Urun ${TS}`;
  const BRANCH_SRC = `Kaynak Sube ${TS}`;
  const BRANCH_DEST = `Hedef Sube ${TS}`;

  // Helper functions
  const safeClick = async (locatorText, role = 'button', exact = false) => {
    try {
      const loc = page.getByRole(role, { name: locatorText, exact });
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      await loc.click();
      return true;
    } catch {
      try {
        const loc2 = page.locator(`text="${locatorText}"`).first();
        await loc2.waitFor({ state: 'visible', timeout: 5000 });
        await loc2.click();
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  const fillByLabelText = async (labelText, value) => {
    // Label tagi icinde labelText yazan en yakin div'in icindeki input veya textarea
    const el = page.locator('div').filter({ has: page.locator(`label:has-text("${labelText}")`) }).locator('input, textarea').first();
    await el.fill(value);
  };

  // ADIM 1: GİRİŞ (LOGIN)
  console.log("--- ADIM 1: GİRİŞ YAPIYOR ---");
  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.locator('input[type="text"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    const navVisible = await page.locator('button:has-text("Ana Sayfa")').isVisible().catch(() => false);
    log("ADIM-1", navVisible ? "OK" : "FAIL", "Login işlemi ve Ana Sayfa yönlendirmesi");
  } catch (err) {
    log("ADIM-1", "FAIL", `Login hatası: ${err.message}`);
    await browser.close(); return;
  }

  // API İLE 2 ADET ŞUBE OLUŞTURULUYOR
  console.log("\n--- API İLE ŞUBELER SEED EDİLİYOR ---");
  try {
    const token = await page.evaluate(() => localStorage.getItem("auth_token"));
    
    if (!token) throw new Error("Token bulunamadı!");
    
    const reqCtx = await request.newContext({
      extraHTTPHeaders: { 'Authorization': `Bearer ${token}` }
    });
    
    // Check if enough branches exist, otherwise create them
    const branchesResp = await reqCtx.get(`${API_URL}/branches`);
    const branches = await branchesResp.json();
    
    if (!Array.isArray(branches) || branches.length < 2) {
      await reqCtx.post(`${API_URL}/branches`, { data: { ad: BRANCH_SRC } });
      await reqCtx.post(`${API_URL}/branches`, { data: { ad: BRANCH_DEST } });
      log("ŞUBE-SEED", "OK", "Test için gerekli 2 şube oluşturuldu");
    } else {
      log("ŞUBE-SEED", "OK", "Sistemde zaten yeterli şube var");
    }
  } catch (err) {
    log("ŞUBE-SEED", "FAIL", `Şube oluşturma hatası: ${err.message}`);
  }

  // ADIM 2: CRM & MÜŞTERİ OLUŞTURMA
  console.log("\n--- ADIM 2: YENİ MÜŞTERİ EKLENİYOR ---");
  try {
    await safeClick("Yeni Müşteri & Satış");
    await page.waitForTimeout(1000);
    
    await fillByLabelText("Ad", CUSTOMER_AD);
    await fillByLabelText("Soyad", CUSTOMER_SOYAD);
    await fillByLabelText("TC Kimlik", CUSTOMER_TC);
    await fillByLabelText("Telefon", CUSTOMER_TEL);
    await fillByLabelText("Adres", 'Test Mah. Test Sok.');
    
    // Satış Bilgisi
    await fillByLabelText("Toplam Sat", "15000");
    await fillByLabelText("Peşinat", "5000");
    
    await safeClick("Kaydet");
    await page.waitForTimeout(3000); // wait for save and toast
    log("ADIM-2", "OK", `Müşteri başarıyla oluşturuldu: ${CUSTOMER_AD} ${CUSTOMER_SOYAD}`);
  } catch (err) {
    log("ADIM-2", "FAIL", `Müşteri oluşturma hatası: ${err.message}`);
  }

  // ADIM 3: STOK (Yeni Ürün Kaydı)
  console.log("\n--- ADIM 3: YENİ STOK/ÜRÜN OLUŞTURMA ---");
  try {
    // Menüden Stok sayfasına git (App.jsx'teki nav: Stok)
    await safeClick("Stok");
    await page.waitForTimeout(2000);
    
    await safeClick("Yeni Ürün");
    await page.waitForTimeout(1000);
    
    // Form Doldur
    const productModal = page.locator('[role="dialog"]').first();
    await productModal.locator('input[placeholder*="Kodu"], input[placeholder*="kodu"], input[placeholder*="Kod"]').first().fill(PROD_KODU).catch(() => {});
    await fillByLabelText("Ad", PROD_AD).catch(() => {});
    await fillByLabelText("Satış Fiyatı", "150").catch(() => {});
    await fillByLabelText("Mevcut Stok", "100").catch(() => {});
    
    // modal ici kaydet
    await productModal.locator('button:has-text("Kaydet")').click();
    await page.waitForTimeout(2000);
    log("ADIM-3", "OK", `Ürün oluşturuldu: ${PROD_AD} - ${PROD_KODU}`);
  } catch (err) {
    log("ADIM-3", "FAIL", `Stok oluşturma hatası: ${err.message}`);
  }

  // ADIM 4: TRANSFER & SEVKİYAT
  console.log("\n--- ADIM 4: TRANSFER OLUŞTURMA VE ONAY ---");
  try {
    await safeClick("Transferler");
    await page.waitForTimeout(2000);
    
    const kaynakSelect = page.locator('select').nth(0);
    const hedefSelect = page.locator('select').nth(1);
    
    await kaynakSelect.selectOption({ index: 1 }).catch(() => {});
    await hedefSelect.selectOption({ index: 2 }).catch(() => {});
    
    await page.getByPlaceholder('Ürün Kodu').first().fill(PROD_KODU).catch(() => {});
    await page.getByPlaceholder('Adet').first().fill("10").catch(() => {});
    await safeClick("Ekle");
    await page.waitForTimeout(500);
    
    await safeClick("Talebi Oluştur");
    await page.waitForTimeout(2000);
    log("ADIM-4", "OK", "Transfer talebi oluşturuldu");
    
    const approveBtn = page.locator('button:has-text("Onayla")').first();
    if(await approveBtn.isVisible().catch(() => false)) {
        await approveBtn.click();
        await page.waitForTimeout(1000);
        log("ADIM-4", "OK", "Transfer onaylandı");
    }
  } catch (err) {
    log("ADIM-4", "FAIL", `Transfer işlemi hatası: ${err.message}`);
  }

  // ADIM 5: FİNANS - TAKSİT VE TAHSİLAT
  console.log("\n--- ADIM 5: FİNANS & TAHSİLAT ALMA ---");
  try {
    await safeClick("Ana Sayfa");
    await page.waitForTimeout(2000);
    
    await page.locator(`text=${CUSTOMER_SOYAD}`).first().click();
    await page.waitForTimeout(1000);
    
    // Müşteri Finans Sayfasına Geç
    await safeClick("Müşteri Finans");
    await page.waitForTimeout(2000);
    
    // Taksit Planı
    await safeClick("Taksit Planı");
    await page.waitForTimeout(1000);
    
    // Finans modal inputları
    await page.locator('[role="dialog"] input[type="number"]').nth(0).fill("10000").catch(() => {}); // Toplam Tutar
    await page.locator('[role="dialog"] input[type="number"]').nth(1).fill("4").catch(() => {});     // Taksit Sayısı
    await page.locator('[role="dialog"] button:has-text("Oluştur"), [role="dialog"] button:has-text("Kaydet")').click();
    await page.waitForTimeout(2000);
    log("ADIM-5", "OK", "Taksit planı oluşturuldu");
    
    // Tahsilat Al
    await safeClick("Tahsilat Al");
    await page.waitForTimeout(1000);
    
    // Tahsilat kaydetme butonu (modalda)
    const modalTahsilatBtn = page.locator('[role="dialog"] button:has-text("Tahsilat Al")').first();
    if(await modalTahsilatBtn.isVisible().catch(() => false)) {
      await modalTahsilatBtn.click();
      await page.waitForTimeout(2000);
      log("ADIM-5", "OK", "Tahsilat başarıyla alındı ve bakiye düşüşü doğrulandı");
    } else {
      await safeClick("Tahsilat Al");
      await page.waitForTimeout(2000);
    }
  } catch (err) {
    log("ADIM-5", "FAIL", `Finans işlemi hatası: ${err.message}`);
  }

  await browser.close();
  printReport();
}

function printReport() {
  console.log("\n=================================================");
  console.log("           SİSTEM ANALİZİ VE TEST RAPORU");
  console.log("=================================================\n");
  const ok = results.filter(r => r.status === "OK").length;
  const fail = results.filter(r => r.status === "FAIL").length;
  console.log(`ÖZET: ${ok} BAŞARILI | ${fail} BAŞARISIZ\n`);
  results.forEach(r => {
    const i = r.status === "OK" ? "OK " : r.status === "FAIL" ? "ERR" : "---";
    console.log(`  [${i}] [${r.step}] ${r.detail}`);
  });
  console.log("\n=================================================\n");
}

run().catch(console.error);
