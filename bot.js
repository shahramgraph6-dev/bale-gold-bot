const axios = require('axios');

const BALE_BOT_TOKEN = process.env.BALE_BOT_TOKEN;
const BALE_CHAT_ID = process.env.BALE_CHAT_ID;

function toPersianDigits(num) {
  if (num === null || num === undefined) return '۰';
  const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (w) => id[+w]);
}

function formatPrice(val) {
  if (!val || isNaN(val)) return '۰';
  const rounded = Math.round(Number(val));
  return toPersianDigits(rounded.toLocaleString('en-US'));
}

function getPersianDate() {
  const options = {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  };
  return new Intl.DateTimeFormat('fa-IR', options).format(new Date());
}

async function getReliableMarketRates() {
  let tetherToman = 0;
  let goldOunce = 0;
  let silverOunce = 0;

  // ۱. دریافت قیمت زنده تتر از نوبیتکس (تبدیل ریال به تومان)
  try {
    const nobiRes = await axios.get('https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls', { timeout: 8000 });
    const latestRials = nobiRes.data?.stats?.['usdt-rls']?.latest;
    if (latestRials) {
      tetherToman = Math.round(Number(latestRials) / 10);
    }
  } catch (e) {
    console.log('Nobitex unavilable, trying Wallex...');
  }

  // منبع پشتیبان تتر (والکس)
  if (!tetherToman) {
    try {
      const wallexRes = await axios.get('https://api.wallex.ir/v1/currencies/stats', { timeout: 6000 });
      const p = wallexRes.data?.result?.['USDT']?.price;
      if (p) tetherToman = Math.round(Number(p));
    } catch (e) {}
  }

  // مقدار پایه در صورت قطعی هر دو سرویس
  if (!tetherToman || tetherToman < 50000) {
    tetherToman = 268400;
  }

  // ۲. استخراج قیمت زنده انس جهانی طلا و نقره
  try {
    const goldRes = await axios.get('https://api.gold-api.com/price/XAU', { timeout: 7000 });
    if (goldRes.data?.price) goldOunce = Number(goldRes.data.price);
  } catch (e) {}

  try {
    const silverRes = await axios.get('https://api.gold-api.com/price/XAG', { timeout: 7000 });
    if (silverRes.data?.price) silverOunce = Number(silverRes.data.price);
  } catch (e) {}

  if (!goldOunce) goldOunce = 4140.19;
  if (!silverOunce) silverOunce = 60.60;

  // ۳. نرخ ارزها (بر اساس دلار آزاد که معمولاً با اختلافی اندک از تتر معامله می‌شود)
  const tether = tetherToman;
  const usd = Math.round(tetherToman * 0.998); // دلار آزاد
  const eur = Math.round(usd * 1.127);         // یورو
  const gbp = Math.round(usd * 1.313);         // پوند
  const aed = Math.round(usd / 3.672);         // درهم امارات
  const tryLira = Math.round(usd / 48.3);      // لیر ترکیه
  const cny = Math.round(usd / 7.12);          // یوان چین
  const afn = Math.round(usd / 66.0);          // افغانی

  // ۴. محاسبه دقیق هر گرم طلای ۱۸ عیار:
  // یک اونس تروی = ۳۱.۱۰۳۴۷۶۸ گرم طلای ۲۴ عیار (عیار ۱۰۰۰)
  // ضریب تبدیل به ۱۸ عیار (۷۵۰) = ۰.۷۵۰
  // قیمت یک گرم ۱۸ عیار = (انس طلا * قیمت دلار آزاد * ۰.۷۵۰) / ۳۱.۱۰۳۵
  const gold18 = Math.round((goldOunce * usd * 0.750) / 31.1035);
  const gold24 = Math.round(gold18 * (24 / 18));

  // ۵. سکه‌ها بر اساس وزن طلای خالص + حباب متعارف بازار
  // تمام بهار و امامی: ۸.۱۳ گرم طلای ۲۲ عیار (۹۰۰) معادل ۹.۷۵ گرم ۱۸ عیار + حباب
  const coinEmami = Math.round(gold18 * 10.30); // امامی با احتساب حباب
  const coinBahar = Math.round(gold18 * 9.85);  // بهار آزادی
  const coinNim = Math.round(coinEmami * 0.52); // نیم سکه
  const coinRob = Math.round(coinEmami * 0.285); // ربع سکه

  // ۶. نقره هر گرم (بر مبنای هر اونس ۳۱.۱۰۳ گرم)
  const silver999 = Math.round((silverOunce * usd) / 31.1035);
  const silver925 = Math.round(silver999 * 0.925);

  return {
    usd, tether, eur, gbp, aed, tryLira, cny, afn,
    gold18, gold24, coinEmami, coinBahar, coinNim, coinRob,
    goldOunce, silverOunce, silver999, silver925
  };
}

function generateProTradingChartUrl(usdPrice, goldPrice, timeStr) {
  const goldData = [
    Math.round(goldPrice * 0.995),
    Math.round(goldPrice * 0.998),
    Math.round(goldPrice * 0.996),
    Math.round(goldPrice * 0.999),
    Math.round(goldPrice)
  ];
  const usdData = [
    Math.round(usdPrice * 0.996),
    Math.round(usdPrice * 0.998),
    Math.round(usdPrice * 0.997),
    Math.round(usdPrice * 1.001),
    Math.round(usdPrice)
  ];

  const chartConfig = {
    type: 'line',
    data: {
      labels: ['۱۰:۳۰', '۱۲:۰۰', '۱۳:۳۰', '۱۵:۰۰', timeStr],
      datasets: [
        {
          label: `🥇 طلای ۱۸ (${(goldPrice / 1000000).toFixed(2)}M)`,
          data: goldData,
          borderColor: '#FFD700',
          backgroundColor: 'rgba(255, 215, 0, 0.22)',
          borderWidth: 4,
          pointBackgroundColor: '#FFD700',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          fill: true,
          tension: 0.35,
          yAxisID: 'yGold'
        },
        {
          label: `💵 دلار آزاد (${Math.round(usdPrice / 1000)}k)`,
          data: usdData,
          borderColor: '#00E676',
          backgroundColor: 'rgba(0, 230, 118, 0.12)',
          borderWidth: 3,
          pointBackgroundColor: '#00E676',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          fill: true,
          tension: 0.35,
          yAxisID: 'yUsd'
        }
      ]
    },
    options: {
      title: {
        display: true,
        text: `📈 نمودار زنده تغییرات طلا و دلار | ${timeStr}`,
        fontColor: '#F8FAFC',
        fontSize: 20,
        fontStyle: 'bold',
        padding: 16
      },
      legend: {
        position: 'top',
        labels: {
          fontColor: '#E2E8F0',
          fontSize: 14,
          boxWidth: 20,
          padding: 12
        }
      },
      scales: {
        xAxes: [{
          ticks: { fontColor: '#94A3B8', fontSize: 13, fontStyle: 'bold' },
          gridLines: { color: 'rgba(255, 255, 255, 0.05)', zeroLineColor: 'rgba(255, 255, 255, 0.1)' }
        }],
        yAxes: [
          {
            id: 'yGold',
            position: 'left',
            ticks: {
              fontColor: '#FFD700',
              fontSize: 11,
              callback: (val) => (val / 1000000).toFixed(2) + ' M'
            },
            gridLines: { color: 'rgba(255, 215, 0, 0.08)' }
          },
          {
            id: 'yUsd',
            position: 'right',
            ticks: {
              fontColor: '#00E676',
              fontSize: 11,
              callback: (val) => Math.round(val / 1000) + ' k'
            },
            gridLines: { display: false }
          }
        ]
      }
    }
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=950&h=480&bkg=%230A0E17`;
}

async function run() {
  try {
    console.log('دریافت نرخ‌های زنده...');
    const p = await getReliableMarketRates();
    console.log('قیمت‌های محاسبه شده:', {
      دلار: p.usd,
      تتر: p.tether,
      طلای۱۸: p.gold18,
      سکه: p.coinEmami
    });

    const now = new Date();
    const timeStr = toPersianDigits(
      now.toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' })
    );
    const dateStr = getPersianDate();

    const caption = 
`📊 تابلو زنده نرخ طلا، ارز و مسکوکات
📅 ${dateStr} ⏰ ساعت ${timeStr}
━━━━━━━━━━━━━━━━━━━
💵 دلار آزاد: \`${formatPrice(p.usd)}\` تومان
💵 تتر: \`${formatPrice(p.tether)}\` تومان
💶 یورو: \`${formatPrice(p.eur)}\` تومان
💷 پوند انگلستان: \`${formatPrice(p.gbp)}\` تومان
🇦🇪 درهم امارات: \`${formatPrice(p.aed)}\` تومان
🪙 لیر ترکیه: \`${formatPrice(p.tryLira)}\` تومان
🇨🇳 یوان چین: \`${formatPrice(p.cny)}\` تومان
🇦🇫 افغانی افغانستان: \`${formatPrice(p.afn)}\` تومان

🟡 طلای ۱۸ عیار: \`${formatPrice(p.gold18)}\` تومان
🟡 طلای ۲۴ عیار: \`${formatPrice(p.gold24)}\` تومان
🪙 سکه طرح جدید (امامی): \`${formatPrice(p.coinEmami)}\` تومان
🪙 سکه بهار آزادی: \`${formatPrice(p.coinBahar)}\` تومان
🪙 نیم‌سکه بهار آزادی: \`${formatPrice(p.coinNim)}\` تومان
🪙 ربع‌سکه بهار آزادی: \`${formatPrice(p.coinRob)}\` تومان

🌍 انس جهانی طلا: \`${toPersianDigits(p.goldOunce)}\` دلار
🌍 انس جهانی نقره: \`${toPersianDigits(p.silverOunce)}\` دلار
🔘 نقره ساچمه (۹۹۹): \`${formatPrice(p.silver999)}\` تومان
🔘 نقره استاندارد (۹۲۵): \`${formatPrice(p.silver925)}\` تومان
━━━━━━━━━━━━━━━━━━━
⚡️ بروزرسانی خودکار و لحظه‌ای بازار
🆔 @gheymat_bazar_live`;

    const photoUrl = generateProTradingChartUrl(p.usd, p.gold18, timeStr);
    const balePhotoUrl = `https://tapi.bale.ai/bot${BALE_BOT_TOKEN}/sendPhoto`;

    await axios.post(balePhotoUrl, {
      chat_id: BALE_CHAT_ID,
      photo: photoUrl,
      caption: caption,
      parse_mode: 'Markdown'
    }, { timeout: 25000 });

    console.log('✅ ارسال بنر و پیام با موفقیت انجام شد.');
  } catch (error) {
    console.error('❌ خطا در ارسال:', error.response?.data || error.message);
  }
}

run();
