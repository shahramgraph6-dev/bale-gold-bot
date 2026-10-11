async function getTgjuExactRates() {
  // ۱. دریافت تتر و دلار از نوبیتکس و والکس
  let tetherToman = 0;
  let btcUsd = 0;
  let ethUsd = 0;

  try {
    const nobitex = await axios.get('https://api.nobitex.ir/v2/orderbook/USDTIRT', { timeout: 7000 });
    if (nobitex.data?.lastTradePrice) {
      tetherToman = Math.round(Number(nobitex.data.lastTradePrice) / 10);
    }
  } catch (e) {
    try {
      const wallex = await axios.get('https://api.wallex.ir/v1/currencies/stats', { timeout: 5000 });
      if (wallex.data?.result?.['USDT']?.price) {
        tetherToman = Math.round(Number(wallex.data.result['USDT'].price));
      }
    } catch (err) {}
  }

  // ۲. دریافت انس جهانی طلا و نقره زنده
  let goldOunce = 0;
  let silverOunce = 0;
  try {
    const metals = await axios.get('https://api.gold-api.com/price/XAU', { timeout: 6000 });
    goldOunce = metals.data?.price || 0;
    const silver = await axios.get('https://api.gold-api.com/price/XAG', { timeout: 6000 });
    silverOunce = silver.data?.price || 0;
  } catch (e) {}

  // ۳. محاسبه تقریبی یا دریافت از وب‌سرویس‌های آزاد
  // اگر تتر به درستی خوانده شده باشد:
  const usd = tetherToman > 0 ? Math.round(tetherToman * 0.998) : 268000;
  const tether = tetherToman || 268426;

  // نرخ‌های برابری ارزی نسبت به دلار جهانی
  const eur = Math.round(usd * 1.08);
  const gbp = Math.round(usd * 1.30);
  const aed = Math.round(usd / 3.67);
  const tryLira = Math.round(usd / 35);
  const cny = Math.round(usd / 7.15);
  const afn = Math.round(usd / 68);

  // محاسبه مظنه طلای ۱۸ بر اساس انس و دلار واقعی در صورت قطعی TGJU
  // فرمول استاندارد طلا: (انس طلا * دلار) / 4.3318 (برای هر گرم ۱۸ عیار)
  const calcGold18 = (goldOunce > 0 && usd > 0) ? Math.round((goldOunce * usd) / 4.3318 * 0.95) : 26397600;
  const gold18 = calcGold18;
  const gold24 = Math.round(gold18 * (24 / 18));

  // سکه تمام و قطعات (مبتنی بر طلای گرمی و حباب روز)
  const coinEmami = Math.round(gold18 * 10.1); 
  const coinBahar = Math.round(gold18 * 9.7);
  const coinNim = Math.round(coinEmami * 0.52);
  const coinRob = Math.round(coinEmami * 0.28);

  const silver999 = silverOunce > 0 ? Math.round((silverOunce * usd) / 31.103) : 528400;
  const silver925 = Math.round(silver999 * 0.925);

  return {
    usd, tether, eur, gbp, aed, tryLira, cny, afn,
    gold18, gold24, coinEmami, coinBahar, coinNim, coinRob,
    goldOunce: goldOunce || 2650.00,
    silverOunce: silverOunce || 31.50,
    silver999, silver925
  };
}
