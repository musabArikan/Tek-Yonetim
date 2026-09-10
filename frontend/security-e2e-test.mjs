import { chromium } from "playwright";

const BASE_URL = "http://localhost:5174";
const EMAIL = "orhan@gunesmagaza";
const PASSWORD = "123456";

const TEST_EMAIL = `guvenlik_test_${Date.now()}@magaza.com`;
const TEST_PASS = "12345";
const PAGE_PASS = "1234";

const results = [];
function log(step, status, detail) {
  const icon = status === "OK" ? "OK " : status === "FAIL" ? "ERR" : "---";
  console.log(`[${icon}] [${step}] ${detail}`);
  results.push({ step, status, detail });
}

async function run() {
  console.log("\n=================================================");
  console.log("  TEK YONETIM - GÜVENLİK VE RE-AUTH TESTİ");
  console.log("=================================================\n");

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  ctx.setDefaultTimeout(10000);
  const page = await ctx.newPage();

  const clickVisible = async (name) => {
    const loc = page.getByRole('button', { name }).filter({ visible: true }).first();
    await loc.waitFor({ state: 'visible', timeout: 5000 });
    await loc.click();
  };

  const fillByLabelText = async (labelText, value) => {
    const el = page.locator('div').filter({ has: page.locator(`label:has-text("${labelText}")`) }).locator('input, textarea, select').first();
    await el.fill(value);
  };

  try {
    // ADIM 1: Admin Girişi
    console.log("--- ADIM 1: ADMIN GİRİŞİ VE YETKİ ATAMA ---");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.locator('input[type="text"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);
    log("LOGIN", "OK", "Admin girisi yapildi");

    // Personeller Sayfasına Git
    await page.goto(`${BASE_URL}/personeller`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Yeni Personel Oluştur
    await clickVisible("Yeni Personel");
    await page.waitForTimeout(1000);

    await page.getByPlaceholder('Örn: Ayşe').fill("Güvenlik");
    await page.getByPlaceholder('Örn: Kaya').fill("Testi");
    await page.getByPlaceholder('personel@isletme.com').fill(TEST_EMAIL);
    
    // Select role = personel
    await page.locator('select').selectOption('personel');
    
    await page.getByPlaceholder('En az 5 karakter').fill(TEST_PASS);

    // Yetki: Z-Raporu Alabilir
    const zRaporuLabel = page.locator('label').filter({ hasText: 'Z-Raporu Alabilir' });
    await zRaporuLabel.locator('input[type="checkbox"]').check();

    // Kaydet
    await page.locator('button:has-text("Oluştur")').click();
    await page.waitForTimeout(2000);
    log("USER-CREATE", "OK", `Test kullanicisi olusturuldu: ${TEST_EMAIL}`);

    // Sayfa Şifresi Ata
    const userRow = page.locator('tr').filter({ hasText: TEST_EMAIL });
    await userRow.locator('button', { hasText: 'Sayfa Kilidi' }).click();
    await page.waitForTimeout(1000);

    // Yetki: Finans Şifresi belirle
    const finansRow = page.getByText('Müşteri Finans', { exact: true }).locator('..');
    await finansRow.locator('input[type="password"]').fill(PAGE_PASS);
    await finansRow.getByRole('button', { name: 'Güncelle' }).click();
    await page.waitForTimeout(1000);
    log("PAGE-PASS", "OK", "Musteri Finans sayfasi icin sifre 1234 olarak atandi");

    // Kapat
    await page.locator('button:has-text("Kapat")').click();
    await page.waitForTimeout(1000);

    // Çıkış yap
    await page.locator('button').filter({ has: page.locator('svg.lucide-log-out') }).first().click();
    await page.waitForTimeout(1000);

    // ADIM 2: Personel Girişi
    console.log("--- ADIM 2: PERSONEL GİRİŞİ VE RE-AUTH TESTİ ---");
    await page.locator('input[type="text"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);
    log("PERSONEL LOGIN", "OK", "Personel girisi yapildi");

    // Finans Sayfasına UI üzerinden gidilecek

    // Yetki Testi
    const raporlarMenu = page.locator('button').filter({ hasText: 'Raporlar' }).first();
    if (await raporlarMenu.isVisible()) {
      log("YETKI-TEST", "OK", "Raporlar menusu gorunur (Z-Raporu Alabilir yetkisi calisiyor)");
    } else {
      log("YETKI-TEST", "FAIL", "Raporlar menusu gorunur degil!");
      throw new Error("Raporlar menüsü görünmüyor");
    }

    // Re-Auth Testi
    await clickVisible("Finans & Senetler");
    await page.waitForTimeout(1000);

    const reAuthModalTitle = page.locator('p', { hasText: 'Şifreli Bölge' });
    if (await reAuthModalTitle.isVisible()) {
      log("RE-AUTH", "OK", "Re-Auth modali basariyla ekrana geldi");
    } else {
      log("RE-AUTH", "FAIL", "Re-Auth modali ekrana gelmedi!");
      throw new Error("Re-Auth modalı ekrana gelmedi");
    }

    // Şifre gir ve onayla
    await page.locator('input[type="password"]').fill(PAGE_PASS);
    await page.locator('button:has-text("Giriş")').click();
    await page.waitForTimeout(2000);

    // Sayfanın açıldığını doğrula 
    const url = page.url();
    if (url.includes('musteri-finans')) {
      log("RE-AUTH-SUCCESS", "OK", "Sifre dogrulandi ve Finans sayfasina giris yapildi");
    } else {
      log("RE-AUTH-SUCCESS", "FAIL", "Sifre dogrulamasi sonrasi Finans sayfasina gecilemedi");
    }

  } catch (err) {
    console.error(err);
    log("TEST", "FAIL", `Beklenmeyen hata: ${err.message}`);
  } finally {
    await browser.close();
    printReport();
  }
}

function printReport() {
  console.log("\n=================================================");
  console.log("           GÜVENLİK TESTİ SONUÇ RAPORU");
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
