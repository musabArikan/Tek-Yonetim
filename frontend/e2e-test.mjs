import { chromium } from "playwright";

const BASE_URL = "http://localhost:5173";
const EMAIL    = "orhan@gunesmagaza";
const PASSWORD = "123456";
const results  = [];

function log(step, status, detail) {
  const icon = status === "OK" ? "OK " : status === "FAIL" ? "ERR" : "---";
  console.log(`[${icon}] [${step}] ${detail}`);
  results.push({ step, status, detail });
}

async function run() {
  console.log("\n=================================================");
  console.log("  TEK YONETIM - E2E SISTEM SAGLIK TESTI v2");
  console.log("=================================================\n");

  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page    = await ctx.newPage();

  const consoleErrors = [];
  const networkFails  = [];
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("requestfailed", r => networkFails.push(`${r.method()} ${r.url()}`));

  // ADIM 1: Sayfayi Ac
  console.log("--- ADIM 1: Uygulama Aciliyor ---");
  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 15000 });
    const title = await page.title();
    log("ADIM-1", "OK", `Sayfa yuklendi - Baslik: "${title}"`);

    const emailInput = page.locator('input[type="text"]').first();
    const visible = await emailInput.isVisible().catch(() => false);
    log("ADIM-1", visible ? "OK" : "FAIL", visible ? "Login formu gorunuyor" : "Login input BULUNAMADI");
  } catch (err) {
    log("ADIM-1", "FAIL", `Sayfa acilamadi: ${err.message}`);
    await browser.close(); printReport(consoleErrors, networkFails); return;
  }

  // ADIM 2: Giris Yap
  console.log("\n--- ADIM 2: Login Testi ---");
  try {
    const emailField = page.locator('input[type="text"]').first();
    await emailField.fill(EMAIL);
    log("ADIM-2", "OK", `Email girildi: ${EMAIL}`);

    const passField = page.locator('input[type="password"]').first();
    await passField.fill(PASSWORD);
    log("ADIM-2", "OK", "Sifre girildi");

    const loginBtn = page.locator('button[type="submit"]').first();
    const btnText  = await loginBtn.textContent().catch(() => "?");
    await loginBtn.click();
    log("ADIM-2", "OK", `"${btnText?.trim()}" butonuna tiklandi`);

    // State-based routing - 3 saniye bekle
    await page.waitForTimeout(3000);

    // Basarili giris: header nav gorunu
    const navVisible = await page.locator('button:has-text("Ana Sayfa")').isVisible().catch(() => false);
    const errText    = await page.locator('[class*="red-50"], [class*="red-600"]').first().textContent().catch(() => "");

    if (errText?.trim() && !navVisible) {
      log("ADIM-2", "FAIL", `Login hatasi UI mesaji: "${errText.trim()}"`);
    } else if (navVisible) {
      log("ADIM-2", "OK", "Login basarili - Dashboard nav gorunu");
    } else {
      log("ADIM-2", "---", `Login sonrasi sayfa URL: ${page.url()}`);
    }
  } catch (err) {
    log("ADIM-2", "FAIL", `Login hatasi: ${err.message}`);
  }

  // ADIM 3: Dashboard Kartlari
  console.log("\n--- ADIM 3: Dashboard Testi ---");
  try {
    await page.waitForTimeout(2000);

    const cards = [
      "Aylik Kasa",
      "Acik Alacaklar",
      "Kritik Stok",
    ];

    // Gercek Turkce basliklar
    const turkishCards = ["Aylık Kasa", "Açık Alacaklar", "Kritik Stok"];
    for (const label of turkishCards) {
      const el      = page.locator(`p:has-text("${label}")`).first();
      const visible = await el.isVisible().catch(() => false);
      log("ADIM-3", visible ? "OK" : "FAIL", `"${label}" karti ${visible ? "gorunuyor" : "BULUNAMADI"}`);

      if (visible) {
        // h3 deger - ust ebeveyn icerisinde
        const wrapper = el.locator("../../..").first();
        const value   = await wrapper.locator("h3").first().textContent().catch(() => "?");
        log("ADIM-3", "---", `"${label}" deger: "${value?.trim()}"`);
      }
    }

    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    const vpW     = await page.evaluate(() => window.innerWidth);
    log("ADIM-3", scrollW > vpW + 20 ? "FAIL" : "OK",
      scrollW > vpW + 20 ? `Yatay tasma (body:${scrollW}px vp:${vpW}px)` : "Layout duzgun, tasma yok");

  } catch (err) {
    log("ADIM-3", "FAIL", `Dashboard hatasi: ${err.message}`);
  }

  // ADIM 4: Personeller RBAC
  console.log("\n--- ADIM 4: Personel (RBAC) Testi ---");
  try {
    // Navigasyon button bazli: text="Personeller"
    const staffBtn = page.locator('button:has-text("Personeller")').first();
    const btnVis   = await staffBtn.isVisible().catch(() => false);

    if (btnVis) {
      await staffBtn.click();
      log("ADIM-4", "OK", '"Personeller" butonuna tiklandi');
      await page.waitForTimeout(2500);

      // Tablo satirlari
      const rows = page.locator("table tbody tr");
      const cnt  = await rows.count().catch(() => 0);
      log("ADIM-4", cnt > 0 ? "OK" : "FAIL", `Personel listesi: ${cnt} kayit`);

      if (cnt > 0) {
        // Ilk satirda Pencil/Duzenle butonu
        const firstRow  = rows.first();
        const pencilBtn = firstRow.locator("button").first();
        const pencilVis = await pencilBtn.isVisible().catch(() => false);

        if (pencilVis) {
          const pencilText = await pencilBtn.textContent().catch(() => "");
          await pencilBtn.click();
          log("ADIM-4", "OK", `Ilk satir butona tiklandi: "${pencilText?.trim() || "(ikon butonu)"}"`);
          await page.waitForTimeout(1200);

          const modal    = page.locator('[role="dialog"]').first();
          const modalVis = await modal.isVisible().catch(() => false);
          log("ADIM-4", modalVis ? "OK" : "FAIL", modalVis ? "Modal/panel acildi" : "Modal ACILMADI");

          if (modalVis) {
            const pwInput = page.locator('input[type="password"]').first();
            const pwVis   = await pwInput.isVisible().catch(() => false);
            log("ADIM-4", pwVis ? "OK" : "FAIL", pwVis ? "Sifre alani modal icinde mevcut" : "Sifre alani yok");

            const cancelBtn = page.locator('button:has-text("İptal"), button:has-text("Kapat")').first();
            const cancelVis = await cancelBtn.isVisible().catch(() => false);
            if (cancelVis) {
              await cancelBtn.click();
              log("ADIM-4", "OK", '"Iptal" butonuna tiklandi - modal kapatildi');
            } else {
              await page.keyboard.press("Escape");
              log("ADIM-4", "---", "ESC ile modal kapatildi");
            }
          }
        } else {
          const allBtns = await firstRow.locator("button").allTextContents();
          log("ADIM-4", "FAIL", `Ilk satirda buton bulunamadi. Butonlar: [${allBtns.join(" | ")}]`);
        }
      }
    } else {
      const allBtns = await page.locator("button").allTextContents();
      log("ADIM-4", "FAIL", `"Personeller" nav butonu yok. Gorunen butonlar: [${allBtns.slice(0, 8).join(" | ")}]`);
    }
  } catch (err) {
    log("ADIM-4", "FAIL", `Personel testi hatasi: ${err.message}`);
  }

  await browser.close();
  printReport(consoleErrors, networkFails);
}

function printReport(errors, netFails) {
  console.log("\n=================================================");
  console.log("           SISTEM SAGLIK RAPORU");
  console.log("=================================================\n");
  const ok   = results.filter(r => r.status === "OK").length;
  const fail = results.filter(r => r.status === "FAIL").length;
  console.log(`OZET: ${ok} basarili | ${fail} basarisiz\n`);
  results.forEach(r => {
    const i = r.status === "OK" ? "OK " : r.status === "FAIL" ? "ERR" : "---";
    console.log(`  [${i}] [${r.step}] ${r.detail}`);
  });
  console.log("\n--- Konsol JS Hatalari ---");
  errors.length === 0
    ? console.log("  [OK ] Hic hata yok")
    : errors.forEach((e, i) => console.log(`  [ERR] ${i + 1}. ${e}`));
  console.log("\n--- Network Hatalari ---");
  netFails.length === 0
    ? console.log("  [OK ] Hic basarisiz istek yok")
    : netFails.forEach((e, i) => console.log(`  [ERR] ${i + 1}. ${e}`));
  console.log("\n=================================================\n");
}

run().catch(console.error);
