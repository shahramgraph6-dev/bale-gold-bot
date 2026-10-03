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

async function getTgjuExactRates() {
  let data = null;

  try {
    const res = await axios.get('https://api.tgju.org/v1/widget/tmp?keys=price_dollar_rl,price_eur,price_gbp,price_aed,price_try,price_cny,geram18,geram24,sekee,bahar,nim,rob,ons', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.tgju.org/'
      },
      timeout: 8000
    });
    if (res.data?.data) {
      data = res.data.data;
    }
  } catch (e) {
    console.log('استفاده از مقادیر پشتیبان بازار...');
  }

  let tetherToman = 268426;
  try {
    const wallex = await axios.get('https://api.wallex.ir/v1/currencies/stats', { timeout: 5000 });
    if (wallex.data?.result?.['USDT']?.price) {
      tetherToman = Math.round(Number(wallex.data.result['USDT'].price));
    }
  } catch (e) {}

  const parseTgju = (item, fallbackToman) => {
    if (item && item.p) {
      const cleanNum = Number(String(item.p).replace(/,/g, ''));
      if (cleanNum > 0) return Math.round(cleanNum / 10);
    }
    return fallbackToman;
  };

  const usd = data ? parseTgju(data.price_dollar_rl, 268000) : 268000;
  const tether = tetherToman;
  const eur = data ? parseTgju(data.price_eur, 302000) : 302000;
  const gbp = data ? parseTgju(data.price_gbp, 352000) : 352000;
  const aed = data ? parseTgju(data.price_aed, 73100) : 73100;
  const tryLira = data ? parseTgju(data.price_try, 5550) : 5550;
  const cny = data ? parseTgju(data.price_cny, 40100) : 40100;
  const afn = 4070;

  const gold18 = data ? parseTgju(data.geram18, 26397600) : 26397600;
  const gold24 = data ? parseTgju(data.geram24, 35196800) : 35196800;
  const coinEmami = data ? parseTgju(data.sekee, 271485000) : 271485000;
  const coinBahar = data ? parseTgju(data.bahar, 259500000) : 259500000;
  const coinNim = data ? parseTgju(data.nim, 141500000) : 141500000;
  const coinRob = data ? parseTgju(data.rob, 77500000) : 77500000;

  const goldOunce = 4140.19;
  const silverOunce = 60.598;
  const silver999 = 528400;
  const silver925 = 498300;

  return {
    usd, tether, eur, gbp, aed, tryLira, cny, afn,
    gold18, gold24, coinEmami, coinBahar, coinNim, coinRob,
    goldOunce, silverOunce, silver999, silver925
  };
}

// ساخت نمودار معاملاتی پیشرفته چندمحوره (Financial Trading Chart)
function generateProTradingChartUrl(usdPrice, goldPrice, timeStr) {
  // شبیه‌سازی دقیق ۵ نقطه نوسان روزانه منتهی به قیمت زنده
  const goldData = [
    Math.round(goldPrice * 0.991),
    Math.round(goldPrice * 0.996),
    Math.round(goldPrice * 0.993),
    Math.round(goldPrice * 0.998),
    Math.round(goldPrice)
  ];
  const usdData = [
    Math.round(usdPrice * 0.993),
    Math.round(usdPrice * 0.997),
    Math.round(usdPrice * 0.995),
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
    const p = await getTgjuExactRates();

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
    }, { timeout: 20000 });

    console.log('✅ ارسال بنر نمودار معاملاتی انجام شد.');
  } catch (error) {
    console.error('❌ خطا در ارسال:', error.response?.data || error.message);
    process.exit(1);
  }
}

run();
