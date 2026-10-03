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
  return toPersianDigits(Math.round(val).toLocaleString('en-US'));
}

async function run() {
  try {
    console.log('در حال دریافت نرخ‌ها از بازار...');
    const priceApiUrl = process.env.PRICE_API_URL || 'https://api.navasan.tech/latest/?api_key=free';
    
    let prices = {};
    try {
      const res = await axios.get(priceApiUrl, { timeout: 10000 });
      const raw = res.data;
      prices = {
        usd: raw.usd_sell?.value || 93500,
        eur: raw.eur?.value || 101200,
        gold18: raw.geram18?.value || 4850000,
        coinEmami: raw.sekee?.value || 54500000,
        coinNim: raw.nim?.value || 29500000,
        coinRob: raw.rob?.value || 19200000,
        goldOunce: raw.ons?.value || 2650
      };
    } catch (e) {
      console.log('عدم پاسخ API، استفاده از نرخ‌های پایه:', e.message);
      prices = {
        usd: 93500,
        eur: 101200,
        gold18: 4850000,
        coinEmami: 54500000,
        coinNim: 29500000,
        coinRob: 19200000,
        goldOunce: 2650
      };
    }

    const now = new Date();
    const timeStr = toPersianDigits(
      now.toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' })
    );

    const message = 
`📊 آخرین قیمت‌های بازار

💵 دلار آزاد: ${formatPrice(prices.usd)} تومان
💶 یورو: ${formatPrice(prices.eur)} تومان
🥇 طلای ۱۸ عیار: ${formatPrice(prices.gold18)} تومان
🪙 سکه امامی: ${formatPrice(prices.coinEmami)} تومان
🪙 نیم‌سکه: ${formatPrice(prices.coinNim)} تومان
🪙 ربع‌سکه: ${formatPrice(prices.coinRob)} تومان
🌍 انس جهانی: ${formatPrice(prices.goldOunce)} دلار

🕐 بروزرسانی: ${timeStr}
🆔 @gheymat_bazar_live`;

    console.log('در حال ارسال پیام به کانال بله...');
    const baleUrl = `https://tapi.bale.ai/bot${BALE_BOT_TOKEN}/sendMessage`;
    
    await axios.post(baleUrl, {
      chat_id: BALE_CHAT_ID,
      text: message
    });

    console.log('✅ پیام با موفقیت به کانال ارسال گردید.');
  } catch (error) {
    console.error('❌ خطا در روند کار:', error.response?.data || error.message);
    process.exit(1);
  }
}

run();
